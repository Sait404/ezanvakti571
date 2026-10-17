/**
 * Namaz vakti kaynağı seçimi:
 *  1) Backend yapılandırılmışsa (EXPO_PUBLIC_API_URL) ve Diyanet Awqat Salah erişimi sunucuda
 *     tanımlıysa → resmî Diyanet verisi ("Diyanet İşleri Başkanlığı" etiketiyle).
 *  2) Aksi hâlde ya da ağ hatasında → önbellekteki resmî veri (tarihi geçmemişse).
 *  3) O da yoksa → cihazda astronomik hesap ("Hesaplanan vakit" etiketiyle, resmî gibi gösterilmez).
 */
import type { SelectedLocation } from '../locations/types';
import { addDays, zonedTimeToInstant, type DateKey } from '../../utils/time';
import { computeDay, type CalcOptions } from './calculate';
import { deserializeDay, PRAYER_KEYS, serializeDay, type DayTimes, type PrayerKey, type SerializedDayTimes } from './types';
import type { KeyValueStorage } from '../../utils/storage';
import { STORAGE_PREFIX } from '../../utils/storage';

export type OfficialDay = { date: DateKey; times: Record<PrayerKey, string>; hijri?: string };
export type OfficialResponse = { source: 'diyanet'; cityId: number; fetchedAt: string; days: OfficialDay[] };

export type FetchLike = (url: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export type ServiceDeps = {
  apiBaseUrl?: string;
  fetchImpl?: FetchLike;
  storage: KeyValueStorage;
  now?: () => Date;
  timeoutMs?: number;
};

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function officialDayToDayTimes(d: OfficialDay, tz: string, cityId: number, fetchedAt: string): DayTimes {
  const times = {} as Record<PrayerKey, Date>;
  for (const k of PRAYER_KEYS) {
    const v = d.times[k];
    const m = HHMM.exec(v ?? '');
    if (!m) throw new Error(`Geçersiz resmî vakit verisi: ${k}=${v}`);
    times[k] = zonedTimeToInstant(d.date, Number(m[1]), Number(m[2]), tz);
  }
  for (let i = 1; i < PRAYER_KEYS.length; i++) {
    if (times[PRAYER_KEYS[i]] <= times[PRAYER_KEYS[i - 1]]) throw new Error(`Resmî vakit sırası tutarsız: ${d.date}`);
  }
  return {
    dateKey: d.date,
    timeZone: tz,
    times,
    hijriText: d.hijri,
    source: { kind: 'diyanet', label: 'Diyanet İşleri Başkanlığı (Awqat Salah)', cityId, fetchedAt },
  };
}

const cacheKey = (locId: string) => `${STORAGE_PREFIX}times:${locId}`;
type CacheBlob = { days: SerializedDayTimes[] };

async function readCache(storage: KeyValueStorage, locId: string): Promise<DayTimes[]> {
  try {
    const raw = await storage.getItem(cacheKey(locId));
    if (!raw) return [];
    return (JSON.parse(raw) as CacheBlob).days.map(deserializeDay);
  } catch {
    return [];
  }
}

async function writeCache(storage: KeyValueStorage, locId: string, days: DayTimes[], todayKey: DateKey) {
  // Yalnızca resmî veri önbelleğe alınır (hesaplanan veri her an yeniden üretilebilir).
  // Dünden eski günler atılır; en fazla 40 gün tutulur.
  const keep = days.filter((d) => d.source.kind === 'diyanet' && d.dateKey >= addDays(todayKey, -1)).slice(0, 40);
  await storage.setItem(cacheKey(locId), JSON.stringify({ days: keep.map(serializeDay) } satisfies CacheBlob));
}

export async function fetchOfficial(loc: SelectedLocation, startKey: DateKey, days: number, deps: ServiceDeps): Promise<OfficialResponse | 'unavailable' | 'network_error'> {
  if (!deps.apiBaseUrl || !deps.fetchImpl) return 'unavailable';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), deps.timeoutMs ?? 8000);
  try {
    const q = new URLSearchParams({ provinceCode: loc.provinceCode, district: loc.districtName, start: startKey, days: String(days) });
    const res = await deps.fetchImpl(`${deps.apiBaseUrl.replace(/\/$/, '')}/v1/prayer-times?${q}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    // 503 (yapılandırılmamış), 404 (eşleme yok), 502 (Diyanet erişilemez) → resmî veri yok
    if (!res.ok) return 'unavailable';
    const body = (await res.json()) as Partial<OfficialResponse>;
    if (body?.source !== 'diyanet' || !Array.isArray(body.days) || typeof body.cityId !== 'number') return 'unavailable';
    return body as OfficialResponse;
  } catch {
    return 'network_error';
  } finally {
    clearTimeout(timer);
  }
}

export type RangeResult = { days: DayTimes[]; usedOfficial: boolean; usedCache: boolean; offlineFallback: boolean };

export async function getPrayerTimesRange(
  loc: SelectedLocation,
  startKey: DateKey,
  count: number,
  calc: CalcOptions,
  deps: ServiceDeps,
): Promise<RangeResult> {
  const todayKey = startKey;
  const wanted = Array.from({ length: count }, (_, i) => addDays(startKey, i));
  let official: DayTimes[] = [];
  let usedCache = false;
  let offlineFallback = false;

  // Asr-ı sânî seçildiyse resmî takvim (asr-ı evvel) uygun değildir → hesap kullanılır.
  const officialEligible = calc.asr === 'asr_evvel';

  if (officialEligible && deps.apiBaseUrl) {
    const resp = await fetchOfficial(loc, startKey, count, deps);
    if (typeof resp === 'object') {
      try {
        official = resp.days.map((d) => officialDayToDayTimes(d, loc.timeZone, resp.cityId, resp.fetchedAt));
        const cached = await readCache(deps.storage, loc.id);
        const merged = new Map(cached.map((d) => [d.dateKey, d]));
        official.forEach((d) => merged.set(d.dateKey, d));
        await writeCache(deps.storage, loc.id, [...merged.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey)), todayKey);
      } catch {
        official = [];
      }
    } else if (resp === 'network_error') {
      offlineFallback = true;
    }
  }
  if (officialEligible && !official.length) {
    official = await readCache(deps.storage, loc.id);
    usedCache = official.length > 0;
  }
  const byKey = new Map(official.map((d) => [d.dateKey, d]));
  const days = wanted.map((k) => (officialEligible ? byKey.get(k) : undefined) ?? computeDay(loc.lat, loc.lon, k, loc.timeZone, calc));
  return { days, usedOfficial: days.some((d) => d.source.kind === 'diyanet'), usedCache, offlineFallback };
}

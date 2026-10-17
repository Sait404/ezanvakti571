import { readFile } from 'node:fs/promises';
import type { DiyanetClient, OfficialDay } from './client.js';

/** Mobil uygulamadaki foldTr ile aynı kural. */
export function foldTr(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/i̇/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export type PlaceMap = { generatedAt?: string; places: Record<string, number> };

export const placeKey = (plate: string, district: string) => `${plate}|${foldTr(district)}`;

export async function loadPlaceMap(path: string): Promise<PlaceMap> {
  try {
    const m = JSON.parse(await readFile(path, 'utf8')) as PlaceMap;
    return { generatedAt: m.generatedAt, places: m.places ?? {} };
  } catch {
    return { places: {} };
  }
}

type CacheEntry = { at: number; days: OfficialDay[] };

/** Şehir başına yanıt önbelleği: Diyanet'e gereksiz istek atılmaz (12 saat). */
export class PrayerTimeService {
  private cache = new Map<number, CacheEntry>();
  private inflight = new Map<number, Promise<OfficialDay[]>>();
  constructor(
    private readonly client: DiyanetClient,
    private readonly map: PlaceMap,
    private readonly ttlMs = 12 * 3600_000,
    private readonly now: () => number = Date.now,
  ) {}

  cityIdFor(plate: string, district: string): number | undefined {
    return this.map.places[placeKey(plate, district)];
  }

  async daysFor(cityId: number): Promise<{ days: OfficialDay[]; fetchedAt: string }> {
    const c = this.cache.get(cityId);
    if (c && this.now() - c.at < this.ttlMs) return { days: c.days, fetchedAt: new Date(c.at).toISOString() };
    let p = this.inflight.get(cityId);
    if (!p) {
      p = this.client.daily(cityId).finally(() => this.inflight.delete(cityId));
      this.inflight.set(cityId, p);
    }
    const days = await p;
    const at = this.now();
    this.cache.set(cityId, { at, days });
    return { days, fetchedAt: new Date(at).toISOString() };
  }
}

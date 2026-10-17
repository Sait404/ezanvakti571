/**
 * Saat dilimi yardımcıları.
 *
 * Tüm vakitler mutlak an (UTC tabanlı Date) olarak tutulur; yalnızca gösterim ve "hangi gün"
 * kararı konumun saat dilimine göre yapılır. Cihaz saat dilimi Türkiye dışında olsa bile
 * (ör. yurt dışındaki kullanıcı İstanbul vakitlerine bakıyor) doğru sonuç verir.
 *
 * Türkiye 2016'dan beri sürekli UTC+3 kullanır (yaz/kış saati uygulaması yoktur). Yine de mimari
 * gelecekte yurt dışı konumlar için Intl tabanlı genel çözümü kullanır; Intl'in timeZone desteği
 * olmayan ortamlar için bilinen sabit ofsetli bölgelerde güvenli bir yedek vardır.
 */

export type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number; second: number; weekday: number };

export const TURKEY_TZ = 'Europe/Istanbul';

/** Yaz saati uygulamayan, sabit ofsetli bölgeler (dakika). Intl yoksa kullanılır. */
const FIXED_OFFSETS: Record<string, number> = { 'Europe/Istanbul': 180, UTC: 0, 'Etc/UTC': 0 };

const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string): Intl.DateTimeFormat | null {
  if (fmtCache.has(tz)) return fmtCache.get(tz)!;
  try {
    const f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
    fmtCache.set(tz, f);
    return f;
  } catch {
    return null;
  }
}

function partsFromFixedOffset(instant: Date, offsetMin: number): ZonedParts {
  const d = new Date(instant.getTime() + offsetMin * 60_000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    weekday: d.getUTCDay(),
  };
}

/** Bir anın verilen saat dilimindeki takvim/saat bileşenleri. */
export function zonedParts(instant: Date, tz: string): ZonedParts {
  if (tz in FIXED_OFFSETS) return partsFromFixedOffset(instant, FIXED_OFFSETS[tz]);
  const f = formatter(tz);
  if (!f) throw new Error(`Desteklenmeyen saat dilimi: ${tz}`);
  const p: Record<string, string> = {};
  for (const part of f.formatToParts(instant)) p[part.type] = part.value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
    second: Number(p.second),
    weekday: WEEKDAY[p.weekday] ?? 0,
  };
}

/** Saat dilimi ofseti (dakika) — o andaki geçerli değer (yaz saati dahil). */
export function tzOffsetMinutes(instant: Date, tz: string): number {
  if (tz in FIXED_OFFSETS) return FIXED_OFFSETS[tz];
  const p = zonedParts(instant, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60_000);
}

/** Takvim günü (YYYY-MM-DD), saat diliminden bağımsız saf tarih. */
export type DateKey = string;

export function dateKeyOf(instant: Date, tz: string): DateKey {
  const p = zonedParts(instant, tz);
  return toDateKey(p.year, p.month, p.day);
}

export function toDateKey(y: number, m: number, d: number): DateKey {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseDateKey(key: DateKey): { year: number; month: number; day: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) throw new Error(`Geçersiz tarih anahtarı: ${key}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/** Takvim gününe gün ekler (UTC aritmetiği; saat dilimi geçişlerinden etkilenmez). */
export function addDays(key: DateKey, n: number): DateKey {
  const { year, month, day } = parseDateKey(key);
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return toDateKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Bir saat dilimindeki yerel duvar saatini mutlak ana çevirir (yaz saati geçişlerini dikkate alır). */
export function zonedTimeToInstant(key: DateKey, hour: number, minute: number, tz: string): Date {
  const { year, month, day } = parseDateKey(key);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let off = tzOffsetMinutes(new Date(guess), tz);
  let t = guess - off * 60_000;
  const off2 = tzOffsetMinutes(new Date(t), tz);
  if (off2 !== off) {
    off = off2;
    t = guess - off * 60_000;
  }
  return new Date(t);
}

export function formatHM(instant: Date, tz: string): string {
  const p = zonedParts(instant, tz);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export function monthNameTr(month: number): string {
  return TR_MONTHS[month - 1];
}

export function weekdayOfKey(key: DateKey): number {
  const { year, month, day } = parseDateKey(key);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function formatDateKeyTr(key: DateKey, opts: { weekday?: boolean } = {}): string {
  const { year, month, day } = parseDateKey(key);
  const base = `${day} ${TR_MONTHS[month - 1]} ${year}`;
  return opts.weekday ? `${base} ${TR_DAYS[weekdayOfKey(key)]}` : base;
}

const TR_DAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export function weekdayNameTr(key: DateKey, short = false): string {
  const i = weekdayOfKey(key);
  return short ? TR_DAYS_SHORT[i] : TR_DAYS[i];
}

/** "02:15:09" biçiminde geri sayım. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

/** Ekran okuyucu için "2 saat 15 dakika" biçimi. */
export function formatDurationSpoken(ms: number): string {
  const totalMin = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${h} saat ${m} dakika`;
  if (h) return `${h} saat`;
  return `${m} dakika`;
}

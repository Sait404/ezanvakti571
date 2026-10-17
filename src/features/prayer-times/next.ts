import { PRAYER_KEYS, type DayTimes, type PrayerKey } from './types';

export type NextPrayerInfo = {
  /** İçinde bulunulan vakit (imsaktan önce ise dünün yatsısı → 'yatsi'). */
  current: PrayerKey;
  next: PrayerKey;
  nextAt: Date;
  remainingMs: number;
  /** Bir sonraki vakit yarına ait mi (yatsıdan sonra). */
  nextIsTomorrow: boolean;
};

/**
 * Bir sonraki vakti bulur. `today` konumun saat dilimindeki bugünün vakitleri,
 * `tomorrow` ise yarının vakitleridir (yatsıdan sonra yarının imsakı için gerekir).
 */
export function findNextPrayer(now: Date, today: DayTimes, tomorrow?: DayTimes): NextPrayerInfo | null {
  const t = now.getTime();
  for (let i = 0; i < PRAYER_KEYS.length; i++) {
    const k = PRAYER_KEYS[i];
    const at = today.times[k].getTime();
    if (at > t) {
      return {
        current: i === 0 ? 'yatsi' : PRAYER_KEYS[i - 1],
        next: k,
        nextAt: today.times[k],
        remainingMs: at - t,
        nextIsTomorrow: false,
      };
    }
  }
  if (!tomorrow) return null;
  return {
    current: 'yatsi',
    next: 'imsak',
    nextAt: tomorrow.times.imsak,
    remainingMs: tomorrow.times.imsak.getTime() - t,
    nextIsTomorrow: true,
  };
}

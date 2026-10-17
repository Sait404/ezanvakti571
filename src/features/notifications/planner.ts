/**
 * Bildirim planlayıcı — saf fonksiyon (test edilebilir, platformdan bağımsız).
 *
 * Kısıtlar:
 *  - iOS en fazla 64 bekleyen yerel bildirime izin verir → plan 60 ile sınırlanır,
 *    en yakın olanlar önceliklidir; uygulama her açılışta/vakit değişiminde planı yeniler.
 *  - Geçmişte kalan anlar planlanmaz (eski bildirimlerin yanlış saatte çalmasını önler).
 *  - Sessiz saatler içinde düşen bildirimler sessiz moda indirilir (kapatılmaz).
 */
import { formatHM, zonedParts } from '../../utils/time';
import { PRAYER_KEYS, PRAYER_LABEL, type DayTimes, type PrayerKey } from '../prayer-times/types';

export type AlertMode = 'off' | 'silent' | 'sound';

export type PrayerNotificationPref = {
  mode: AlertMode;
  /** Vakitten önce hatırlatma (dakika, 0 = yok). */
  beforeMin: number;
  /** Vakitten sonra hatırlatma (dakika, 0 = yok). */
  afterMin: number;
};

export type NotificationPrefs = {
  enabled: boolean;
  vibrate: boolean;
  perPrayer: Record<PrayerKey, PrayerNotificationPref>;
  /** "HH:MM" — her iki değer de doluysa uygulanır; gece yarısını geçebilir (ör. 23:00–06:00). */
  quietStart?: string;
  quietEnd?: string;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: false, // açık onay olmadan bildirim planlanmaz
  vibrate: true,
  perPrayer: {
    imsak: { mode: 'sound', beforeMin: 0, afterMin: 0 },
    gunes: { mode: 'off', beforeMin: 0, afterMin: 0 },
    ogle: { mode: 'sound', beforeMin: 0, afterMin: 0 },
    ikindi: { mode: 'sound', beforeMin: 0, afterMin: 0 },
    aksam: { mode: 'sound', beforeMin: 0, afterMin: 0 },
    yatsi: { mode: 'sound', beforeMin: 0, afterMin: 0 },
  },
};

export type PlannedNotification = {
  id: string;
  prayer: PrayerKey;
  kind: 'at' | 'before' | 'after';
  fireAt: Date;
  title: string;
  body: string;
  sound: boolean;
};

export const MAX_PENDING = 60;

function inQuietHours(instant: Date, tz: string, start?: string, end?: string): boolean {
  if (!start || !end) return false;
  const toMin = (s: string) => {
    const m = /^(\d{2}):(\d{2})$/.exec(s);
    return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
  };
  const s = toMin(start);
  const e = toMin(end);
  if (Number.isNaN(s) || Number.isNaN(e) || s === e) return false;
  const p = zonedParts(instant, tz);
  const t = p.hour * 60 + p.minute;
  return s < e ? t >= s && t < e : t >= s || t < e;
}

export function planNotifications(days: DayTimes[], prefs: NotificationPrefs, now: Date, locationTitle: string): PlannedNotification[] {
  if (!prefs.enabled) return [];
  const out: PlannedNotification[] = [];
  for (const day of days) {
    for (const k of PRAYER_KEYS) {
      const p = prefs.perPrayer[k];
      if (!p || p.mode === 'off') continue;
      const at = day.times[k];
      const hm = formatHM(at, day.timeZone);
      const items: [PlannedNotification['kind'], Date, string, string][] = [
        ['at', at, `${PRAYER_LABEL[k]} vakti`, `${locationTitle} · ${hm}`],
      ];
      if (p.beforeMin > 0) items.push(['before', new Date(at.getTime() - p.beforeMin * 60_000), `${PRAYER_LABEL[k]} vaktine ${p.beforeMin} dk`, `${locationTitle} · ${hm}`]);
      if (p.afterMin > 0) items.push(['after', new Date(at.getTime() + p.afterMin * 60_000), `${PRAYER_LABEL[k]} vaktinden ${p.afterMin} dk geçti`, `${locationTitle} · vakit ${hm}`]);
      for (const [kind, fireAt, title, body] of items) {
        if (fireAt.getTime() <= now.getTime() + 5_000) continue;
        const quiet = inQuietHours(fireAt, day.timeZone, prefs.quietStart, prefs.quietEnd);
        out.push({
          id: `ev571:${day.dateKey}:${k}:${kind}`,
          prayer: k,
          kind,
          fireAt,
          title: `EzanVakti571 · ${title}`,
          body,
          sound: p.mode === 'sound' && !quiet,
        });
      }
    }
  }
  out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
  return out.slice(0, MAX_PENDING);
}

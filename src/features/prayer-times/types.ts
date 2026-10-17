import type { DateKey } from '../../utils/time';

export const PRAYER_KEYS = ['imsak', 'gunes', 'ogle', 'ikindi', 'aksam', 'yatsi'] as const;
export type PrayerKey = (typeof PRAYER_KEYS)[number];

export const PRAYER_LABEL: Record<PrayerKey, string> = {
  imsak: 'İmsak',
  gunes: 'Güneş',
  ogle: 'Öğle',
  ikindi: 'İkindi',
  aksam: 'Akşam',
  yatsi: 'Yatsı',
};

export type AsrMethod = 'asr_evvel' | 'asr_sani';

export const ASR_METHOD_LABEL: Record<AsrMethod, string> = {
  asr_evvel: 'Asr-ı evvel (gölge 1 misli — Diyanet takviminin esas aldığı vakit)',
  asr_sani: 'Asr-ı sânî (gölge 2 misli — Hanefî mezhebinde Ebû Hanîfe\'nin görüşü)',
};

export type PrayerSource =
  | { kind: 'diyanet'; label: string; fetchedAt: string; cityId: number }
  | { kind: 'calculated'; label: string; method: string; computedAt: string };

export type DayTimes = {
  dateKey: DateKey;
  timeZone: string;
  times: Record<PrayerKey, Date>;
  source: PrayerSource;
  /** Diyanet verisi varsa hicri tarih metni (doğrudan kaynaktan). */
  hijriText?: string;
};

export type SerializedDayTimes = Omit<DayTimes, 'times'> & { times: Record<PrayerKey, string> };

export function serializeDay(d: DayTimes): SerializedDayTimes {
  const times = {} as Record<PrayerKey, string>;
  for (const k of PRAYER_KEYS) times[k] = d.times[k].toISOString();
  return { ...d, times };
}

export function deserializeDay(d: SerializedDayTimes): DayTimes {
  const times = {} as Record<PrayerKey, Date>;
  for (const k of PRAYER_KEYS) times[k] = new Date(d.times[k]);
  return { ...d, times };
}

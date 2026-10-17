import { formatDateKeyTr, formatHM } from '../../utils/time';
import { PRAYER_KEYS, PRAYER_LABEL, type DayTimes } from './types';

/** Paylaşım metni — kaynak etiketi her zaman eklenir. */
export function shareText(day: DayTimes, placeTitle: string): string {
  const lines = PRAYER_KEYS.map((k) => `${PRAYER_LABEL[k].padEnd(7, ' ')} ${formatHM(day.times[k], day.timeZone)}`);
  const src = day.source.kind === 'diyanet' ? 'Kaynak: Diyanet İşleri Başkanlığı' : 'Kaynak: cihazda hesaplanan vakit (resmî Diyanet verisi değildir)';
  return [`${placeTitle} · ${formatDateKeyTr(day.dateKey, { weekday: true })}`, '', ...lines, '', src, '— EzanVakti571'].join('\n');
}

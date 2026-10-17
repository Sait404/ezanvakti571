/**
 * Cihaz üzerinde astronomik namaz vakti hesabı (çevrimdışı yedek).
 *
 * Kütüphane: adhan-js (MIT, https://github.com/batoulapps/adhan-js), "Turkey" yöntemi:
 * imsak 18°, yatsı 17°, ve Diyanet temkin sürelerine yakın düzeltmeler (güneş −7 dk, öğle +5,
 * ikindi +4, akşam +7). Bu sonuçlar Diyanet'in yayımladığı resmî vakitlerle birkaç dakikaya
 * kadar farklılık gösterebilir; uygulama bu nedenle bunları her zaman "Hesaplanan vakit"
 * etiketiyle gösterir ve resmî veri gibi sunmaz.
 */
import { CalculationMethod, Coordinates, HighLatitudeRule, Madhab, PrayerTimes } from 'adhan';
import { addDays, parseDateKey, type DateKey } from '../../utils/time';
import type { AsrMethod, DayTimes } from './types';

export const CALC_METHOD_LABEL = 'adhan-js · Türkiye yöntemi (imsak 18°, yatsı 17°, Diyanet temkinlerine yakın düzeltmeler)';

export type CalcOptions = { asr: AsrMethod };

export function computeDay(lat: number, lon: number, dateKey: DateKey, timeZone: string, opts: CalcOptions): DayTimes {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw new RangeError(`Geçersiz koordinat: ${lat},${lon}`);
  }
  const coords = new Coordinates(lat, lon);
  const params = CalculationMethod.Turkey();
  params.madhab = opts.asr === 'asr_sani' ? Madhab.Hanafi : Madhab.Shafi;
  // Yüksek enlemlerde (≈48° üstü) imsak/yatsı tanımsız kalabilir; önerilen kural uygulanır.
  params.highLatitudeRule = HighLatitudeRule.recommended(coords);
  const { year, month, day } = parseDateKey(dateKey);
  // adhan, verilen Date'in *yerel* yıl/ay/gün bileşenlerini takvim günü olarak kullanır;
  // çıktı mutlak anlardır. Bu yüzden cihaz saat diliminden bağımsız olarak doğru gün seçilir.
  const pt = new PrayerTimes(coords, new Date(year, month - 1, day, 12, 0, 0), params);
  const all = [pt.fajr, pt.sunrise, pt.dhuhr, pt.asr, pt.maghrib, pt.isha];
  if (all.some((d) => !(d instanceof Date) || Number.isNaN(d.getTime()))) {
    throw new Error('Bu konum ve tarih için vakit hesaplanamadı (astronomik sınır).');
  }
  return {
    dateKey,
    timeZone,
    times: { imsak: pt.fajr, gunes: pt.sunrise, ogle: pt.dhuhr, ikindi: pt.asr, aksam: pt.maghrib, yatsi: pt.isha },
    source: {
      kind: 'calculated',
      label: 'Hesaplanan vakit (resmî Diyanet verisi değildir)',
      method: CALC_METHOD_LABEL + (opts.asr === 'asr_sani' ? ' · ikindi: asr-ı sânî' : ' · ikindi: asr-ı evvel'),
      computedAt: new Date().toISOString(),
    },
  };
}

export function computeRange(lat: number, lon: number, startKey: DateKey, days: number, timeZone: string, opts: CalcOptions): DayTimes[] {
  const out: DayTimes[] = [];
  for (let i = 0; i < days; i++) out.push(computeDay(lat, lon, addDays(startKey, i), timeZone, opts));
  return out;
}

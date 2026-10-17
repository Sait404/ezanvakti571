import { describe, expect, it } from 'vitest';
import { computeDay, computeRange } from '../src/features/prayer-times/calculate';
import { findNextPrayer } from '../src/features/prayer-times/next';
import { getPrayerTimesRange, officialDayToDayTimes, type OfficialResponse } from '../src/features/prayer-times/service';
import { PRAYER_KEYS } from '../src/features/prayer-times/types';
import { findDistrict, getProvince, locationFromDistrict } from '../src/features/locations/data';
import { memoryStorage } from '../src/utils/storage';
import {
  addDays,
  dateKeyOf,
  formatCountdown,
  formatHM,
  tzOffsetMinutes,
  zonedTimeToInstant,
} from '../src/utils/time';

const TZ = 'Europe/Istanbul';
const ist = getProvince('34')!;

/**
 * Referans: NTV'nin yayımladığı İstanbul vakit tablosu (17 Ekim ve 1 Kasım 2026), erişim 17.10.2026.
 * Üçüncü taraf yayınıdır; resmî kaynak olarak değil, hesaplama doğruluğu için kıyas olarak kullanılır.
 * Kabul edilen sapma: ±2 dakika (yayıncının kullandığı koordinat/temkin farkları nedeniyle).
 */
const REFERENCE = {
  '2026-10-17': ['05:47', '07:11', '12:54', '15:56', '18:27', '19:47'],
  '2026-11-01': ['06:03', '07:29', '12:53', '15:40', '18:07', '19:27'],
} as const;

const toMin = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3));

describe('Astronomik vakit hesabı (adhan · Türkiye yöntemi)', () => {
  it.each(Object.entries(REFERENCE))('İstanbul %s yayımlanmış tabloyla ±2 dk uyumlu', (key, ref) => {
    const d = computeDay(ist.lat, ist.lon, key, TZ, { asr: 'asr_evvel' });
    PRAYER_KEYS.forEach((k, i) => {
      expect(Math.abs(toMin(formatHM(d.times[k], TZ)) - toMin(ref[i]))).toBeLessThanOrEqual(2);
    });
    expect(d.source.kind).toBe('calculated');
    expect(d.source.label).toMatch(/resmî Diyanet verisi değildir/);
  });

  it('vakitler kronolojik sırada ve aynı takvim gününde', () => {
    for (const key of ['2026-01-15', '2026-03-29', '2026-06-21', '2026-10-25', '2026-12-21']) {
      const d = computeDay(37.42, 41.34, key, TZ, { asr: 'asr_evvel' });
      for (let i = 1; i < PRAYER_KEYS.length; i++) expect(d.times[PRAYER_KEYS[i]].getTime()).toBeGreaterThan(d.times[PRAYER_KEYS[i - 1]].getTime());
      for (const k of PRAYER_KEYS) expect(dateKeyOf(d.times[k], TZ)).toBe(key);
    }
  });

  it('asr-ı sânî, asr-ı evvelden daha geç', () => {
    const a = computeDay(ist.lat, ist.lon, '2026-07-01', TZ, { asr: 'asr_evvel' });
    const b = computeDay(ist.lat, ist.lon, '2026-07-01', TZ, { asr: 'asr_sani' });
    expect(b.times.ikindi.getTime() - a.times.ikindi.getTime()).toBeGreaterThan(30 * 60_000);
    expect(b.times.ogle.getTime()).toBe(a.times.ogle.getTime());
  });

  it('cihaz saat dilimi farklı olsa da (New York / Tokyo / İstanbul) aynı vakitler üretilir', () => {
    const original = process.env.TZ;
    const results: string[] = [];
    try {
      for (const tz of ['America/New_York', 'Asia/Tokyo', 'Europe/Istanbul', 'UTC']) {
        process.env.TZ = tz; // Node, TZ değişikliğini anında uygular
        const d = computeDay(ist.lat, ist.lon, '2026-10-17', TZ, { asr: 'asr_evvel' });
        results.push(PRAYER_KEYS.map((k) => d.times[k].toISOString()).join(','));
      }
    } finally {
      process.env.TZ = original;
    }
    expect(new Set(results).size).toBe(1);
  });

  it('geçersiz koordinatı reddeder', () => {
    expect(() => computeDay(NaN, 30, '2026-10-17', TZ, { asr: 'asr_evvel' })).toThrow();
    expect(() => computeDay(95, 30, '2026-10-17', TZ, { asr: 'asr_evvel' })).toThrow();
  });

  it('yüksek enlemde (Tromsø, yaz ortası) çökmez; tanımlı değerler üretir ya da açık hata verir', () => {
    try {
      const d = computeDay(69.65, 18.96, '2026-06-21', 'Europe/Oslo', { asr: 'asr_evvel' });
      for (const k of PRAYER_KEYS) expect(Number.isNaN(d.times[k].getTime())).toBe(false);
    } catch (e) {
      expect((e as Error).message).toMatch(/hesaplanamadı/);
    }
  });

  it('aylık aralık 31 gün üretir, ay sonu/yıl sonu geçişleri doğru', () => {
    const r = computeRange(ist.lat, ist.lon, '2026-12-15', 31, TZ, { asr: 'asr_evvel' });
    expect(r).toHaveLength(31);
    expect(r[16].dateKey).toBe('2026-12-31');
    expect(r[17].dateKey).toBe('2027-01-01');
  });
});

describe('Saat dilimi ve gün değişimi', () => {
  it('Türkiye her tarihte UTC+3 (yaz/kış saati yok)', () => {
    for (const iso of ['2026-01-01T00:00:00Z', '2026-03-29T01:30:00Z', '2026-10-25T00:30:00Z', '2026-07-01T12:00:00Z']) {
      expect(tzOffsetMinutes(new Date(iso), TZ)).toBe(180);
    }
  });

  it('UTC 21:00 Türkiye\'de ertesi gün 00:00', () => {
    expect(dateKeyOf(new Date('2026-10-17T20:59:59Z'), TZ)).toBe('2026-10-17');
    expect(dateKeyOf(new Date('2026-10-17T21:00:00Z'), TZ)).toBe('2026-10-18');
  });

  it('yurt dışı için yaz saati geçişleri doğru (Europe/Berlin)', () => {
    expect(tzOffsetMinutes(new Date('2026-03-29T00:30:00Z'), 'Europe/Berlin')).toBe(60);
    expect(tzOffsetMinutes(new Date('2026-03-29T01:30:00Z'), 'Europe/Berlin')).toBe(120);
    expect(tzOffsetMinutes(new Date('2026-10-25T00:30:00Z'), 'Europe/Berlin')).toBe(120);
    expect(tzOffsetMinutes(new Date('2026-10-25T01:30:00Z'), 'Europe/Berlin')).toBe(60);
    // DST günü yerel saat → mutlak an
    expect(zonedTimeToInstant('2026-03-29', 12, 0, 'Europe/Berlin').toISOString()).toBe('2026-03-29T10:00:00.000Z');
    expect(zonedTimeToInstant('2026-10-25', 12, 0, 'Europe/Berlin').toISOString()).toBe('2026-10-25T11:00:00.000Z');
  });

  it('addDays artık yıl ve ay sınırlarını doğru geçer', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('geri sayım biçimi', () => {
    expect(formatCountdown(3_723_000)).toBe('01:02:03');
    expect(formatCountdown(-5)).toBe('00:00:00');
  });
});

describe('Bir sonraki vakit', () => {
  const today = computeDay(ist.lat, ist.lon, '2026-10-17', TZ, { asr: 'asr_evvel' });
  const tomorrow = computeDay(ist.lat, ist.lon, '2026-10-18', TZ, { asr: 'asr_evvel' });

  it('öğleden 1 dk önce → sıradaki öğle, şu anki güneş', () => {
    const now = new Date(today.times.ogle.getTime() - 60_000);
    const n = findNextPrayer(now, today, tomorrow)!;
    expect(n.next).toBe('ogle');
    expect(n.current).toBe('gunes');
    expect(n.remainingMs).toBe(60_000);
  });

  it('yatsıdan sonra → yarının imsakı', () => {
    const now = new Date(today.times.yatsi.getTime() + 60_000);
    const n = findNextPrayer(now, today, tomorrow)!;
    expect(n.next).toBe('imsak');
    expect(n.nextIsTomorrow).toBe(true);
    expect(n.nextAt).toEqual(tomorrow.times.imsak);
  });

  it('gece yarısından sonra imsaktan önce → bugünün imsakı, şu anki yatsı', () => {
    const now = new Date('2026-10-17T00:30:00+03:00');
    const n = findNextPrayer(now, today, tomorrow)!;
    expect(n.next).toBe('imsak');
    expect(n.current).toBe('yatsi');
    expect(n.nextIsTomorrow).toBe(false);
  });

  it('tam vakit anında bir sonrakine geçer', () => {
    const n = findNextPrayer(today.times.ikindi, today, tomorrow)!;
    expect(n.next).toBe('aksam');
  });
});

describe('Kaynak seçimi, Diyanet verisi ve çevrimdışı önbellek', () => {
  const loc = locationFromDistrict(findDistrict('47', 'Midyat')!);
  const official: OfficialResponse = {
    source: 'diyanet',
    cityId: 9999,
    fetchedAt: '2026-10-17T10:00:00.000Z',
    days: [
      { date: '2026-10-17', times: { imsak: '05:01', gunes: '06:24', ogle: '12:08', ikindi: '15:13', aksam: '17:42', yatsi: '19:00' }, hijri: 'test' },
      { date: '2026-10-18', times: { imsak: '05:02', gunes: '06:25', ogle: '12:08', ikindi: '15:12', aksam: '17:41', yatsi: '18:59' } },
    ],
  };
  const okFetch = async () => ({ ok: true, status: 200, json: async () => official });
  const failFetch = async () => {
    throw new Error('ağ yok');
  };

  it('backend yoksa hesaplanan vakit kullanılır ve resmî diye etiketlenmez', async () => {
    const r = await getPrayerTimesRange(loc, '2026-10-17', 2, { asr: 'asr_evvel' }, { storage: memoryStorage() });
    expect(r.usedOfficial).toBe(false);
    expect(r.days.every((d) => d.source.kind === 'calculated')).toBe(true);
  });

  it('backend Diyanet verisi döndürürse o kullanılır; HH:MM İstanbul saatine doğru çevrilir', async () => {
    const storage = memoryStorage();
    const r = await getPrayerTimesRange(loc, '2026-10-17', 2, { asr: 'asr_evvel' }, { storage, apiBaseUrl: 'https://api.test', fetchImpl: okFetch });
    expect(r.usedOfficial).toBe(true);
    expect(r.days[0].source.kind).toBe('diyanet');
    expect(r.days[0].times.imsak.toISOString()).toBe('2026-10-17T02:01:00.000Z');
    expect(formatHM(r.days[0].times.aksam, TZ)).toBe('17:42');
  });

  it('ağ kesilince önbellekteki resmî veri gösterilir (çevrimdışı)', async () => {
    const storage = memoryStorage();
    await getPrayerTimesRange(loc, '2026-10-17', 2, { asr: 'asr_evvel' }, { storage, apiBaseUrl: 'https://api.test', fetchImpl: okFetch });
    const r = await getPrayerTimesRange(loc, '2026-10-17', 3, { asr: 'asr_evvel' }, { storage, apiBaseUrl: 'https://api.test', fetchImpl: failFetch });
    expect(r.usedCache).toBe(true);
    expect(r.offlineFallback).toBe(true);
    expect(r.days[0].source.kind).toBe('diyanet');
    expect(r.days[1].source.kind).toBe('diyanet');
    // önbellekte olmayan 3. gün resmî gibi gösterilmez
    expect(r.days[2].source.kind).toBe('calculated');
  });

  it('asr-ı sânî seçiliyse resmî (asr-ı evvel) takvim yerine hesap kullanılır', async () => {
    const r = await getPrayerTimesRange(loc, '2026-10-17', 1, { asr: 'asr_sani' }, { storage: memoryStorage(), apiBaseUrl: 'https://api.test', fetchImpl: okFetch });
    expect(r.days[0].source.kind).toBe('calculated');
  });

  it('bozuk resmî veri reddedilir ve hesaplamaya düşülür', async () => {
    const bad = { ...official, days: [{ date: '2026-10-17', times: { ...official.days[0].times, ogle: '25:99' } }] };
    const r = await getPrayerTimesRange(loc, '2026-10-17', 1, { asr: 'asr_evvel' }, { storage: memoryStorage(), apiBaseUrl: 'https://api.test', fetchImpl: async () => ({ ok: true, status: 200, json: async () => bad }) });
    expect(r.days[0].source.kind).toBe('calculated');
  });

  it('sırası tutarsız resmî veri reddedilir', () => {
    expect(() => officialDayToDayTimes({ date: '2026-10-17', times: { imsak: '06:00', gunes: '05:00', ogle: '12:00', ikindi: '15:00', aksam: '18:00', yatsi: '19:00' } }, TZ, 1, '')).toThrow();
  });
});

describe('Türkçe gün adları', () => {
  it('kısa adlar birbirinden ayırt edilir (Pazar/Pazartesi, Cuma/Cumartesi)', async () => {
    const { weekdayNameTr } = await import('../src/utils/time');
    expect(['2026-10-18', '2026-10-19', '2026-10-23', '2026-10-24'].map((k) => weekdayNameTr(k, true))).toEqual(['Paz', 'Pzt', 'Cum', 'Cmt']);
    expect(weekdayNameTr('2026-10-17')).toBe('Cumartesi');
  });
});

describe('Sunucu yanıt durumları', () => {
  it('sunucu 503 dönerse "çevrimdışı" denmez, hesaplanan vakit gösterilir', async () => {
    const { getPrayerTimesRange } = await import('../src/features/prayer-times/service');
    const { memoryStorage } = await import('../src/utils/storage');
    const { findDistrict, locationFromDistrict } = await import('../src/features/locations/data');
    const loc = locationFromDistrict(findDistrict('47', 'Midyat')!);
    const r = await getPrayerTimesRange(loc, '2026-10-17', 1, { asr: 'asr_evvel' }, { storage: memoryStorage(), apiBaseUrl: 'https://api.test', fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }) });
    expect(r.offlineFallback).toBe(false);
    expect(r.days[0].source.kind).toBe('calculated');
  });
});

import { describe, expect, it } from 'vitest';
import {
  districts,
  districtsOf,
  findDistrict,
  getProvince,
  isRoughlyInTurkey,
  locationFromDistrict,
  locationLabel,
  locationsMeta,
  nearestDistrict,
  provinces,
  settlementsOf,
} from '../src/features/locations/data';
import { foldTr } from '../src/features/locations/normalize';
import { disambiguationLabel, searchLocations } from '../src/features/locations/search';

describe('Türkiye yerleşim verisi bütünlüğü', () => {
  it('81 il, plaka kodları 01–81 eksiksiz ve tekil', () => {
    expect(provinces).toHaveLength(81);
    const codes = provinces.map((p) => p.code).sort();
    expect(codes).toEqual(Array.from({ length: 81 }, (_, i) => String(i + 1).padStart(2, '0')));
  });

  it('973 ilçe; her ilçe geçerli bir ile bağlı ve il içinde ad tekil', () => {
    expect(districts).toHaveLength(973);
    const seen = new Set<string>();
    for (const d of districts) {
      expect(getProvince(d.provinceCode)).toBeDefined();
      const k = `${d.provinceCode}|${d.name}`;
      expect(seen.has(k)).toBe(false);
      seen.add(k);
    }
  });

  it('tüm il ve ilçe koordinatları Türkiye sınırları içinde', () => {
    for (const p of provinces) expect(isRoughlyInTurkey(p.lat, p.lon)).toBe(true);
    for (const d of districts) expect(isRoughlyInTurkey(d.lat, d.lon)).toBe(true);
  });

  it('meta sayıları gerçek veriyle tutarlı, kaynak ve lisans kayıtlı', () => {
    const total = districts.reduce((a, d) => a + d.settlementCount, 0);
    expect(locationsMeta.counts.settlements).toBe(total);
    expect(total).toBeGreaterThan(70000);
    expect(locationsMeta.sources.length).toBeGreaterThanOrEqual(2);
    for (const s of locationsMeta.sources) {
      expect(s.license.length).toBeGreaterThan(5);
      expect(s.title.length).toBeGreaterThan(5);
    }
  });

  it('her ilçenin yerleşim listesi indeksle hizalı ve ilçe içinde tekrarsız', () => {
    for (const d of districts) {
      const list = settlementsOf(d.index);
      expect(list.length).toBe(d.settlementCount);
      const keys = new Set(list.map((s) => foldTr(`${s.name}|${s.parent}`)));
      expect(keys.size).toBe(list.length);
    }
  });

  it('il merkezi yaklaşımı kullanılan ilçe sayısı raporlanan değerle aynı', () => {
    const approx = districts.filter((d) => d.quality === 'province_center').length;
    expect(approx).toBe(locationsMeta.coordinateQuality.province_center);
  });
});

describe('Türkçe karakterli/karaktersiz arama', () => {
  it('"sisli" → Şişli, "ISTANBUL" → İstanbul', () => {
    expect(searchLocations('sisli', { includeSettlements: false })[0]).toMatchObject({ kind: 'district', district: { name: 'Şişli' } });
    expect(searchLocations('ISTANBUL', { includeSettlements: false })[0]).toMatchObject({ kind: 'province', province: { name: 'İstanbul' } });
    expect(searchLocations('gümüşhane', { includeSettlements: false })[0]).toMatchObject({ kind: 'province', province: { name: 'Gümüşhane' } });
    expect(searchLocations('gumushane', { includeSettlements: false })[0]).toMatchObject({ kind: 'province', province: { name: 'Gümüşhane' } });
  });

  it('foldTr büyük İ ve ı harflerini doğru sadeleştirir', () => {
    expect(foldTr('İĞDIR')).toBe('igdir');
    expect(foldTr('Iğdır')).toBe('igdir');
    expect(foldTr('ÇANAKKALE')).toBe('canakkale');
    expect(foldTr('Şanlıurfa')).toBe('sanliurfa');
  });

  it('mahalle/köy araması çalışır ve sonuçlar il/ilçe ile ayırt edilir', () => {
    const r = searchLocations('acirli');
    const hit = r.find((x) => x.kind === 'settlement' && x.district.name === 'Midyat');
    expect(hit).toBeDefined();
    expect(disambiguationLabel(hit!)).toContain('Midyat / Mardin');
  });

  it('aynı isimli yerleşimler farklı ilçe/illerde ayrı sonuç olarak döner', () => {
    const r = searchLocations('cumhuriyet mahallesi', { limit: 500 }).filter((x) => x.kind === 'settlement');
    expect(r.length).toBeGreaterThan(20);
    const labels = new Set(r.map(disambiguationLabel));
    expect(labels.size).toBe(r.length);
  });

  it('çok kelimeli bağlamsal arama: "cumhuriyet midyat" Midyat\'taki mahalleyi öne alır', () => {
    const r = searchLocations('cumhuriyet midyat');
    expect(r.some((x) => x.kind === 'settlement' && x.district.name === 'Midyat' && x.settlement.name.startsWith('Cumhuriyet'))).toBe(true);
  });

  it('posta koduyla arama', () => {
    const anyD = findDistrict('47', 'Midyat')!;
    const pk = settlementsOf(anyD.index).find((s) => s.postalCodes.length)!.postalCodes[0];
    const r = searchLocations(pk, { limit: 500 });
    expect(r.some((x) => x.kind === 'settlement' && x.district.name === 'Midyat')).toBe(true);
  });

  it('çok kısa sorgu sonuç döndürmez (performans)', () => {
    expect(searchLocations('a')).toEqual([]);
  });

  it('70 bin+ yerleşimde arama makul sürede (< 1.5 sn, ilk dizin kurulumu dahil)', () => {
    const t = performance.now();
    searchLocations('yenimahalle');
    searchLocations('karakoy');
    expect(performance.now() - t).toBeLessThan(1500);
  });
});

describe('Seçili konum ve GPS', () => {
  it('locationFromDistrict kimlik ve etiket üretir', () => {
    const d = findDistrict('47', 'Midyat')!;
    const s = settlementsOf(d.index)[0];
    const loc = locationFromDistrict(d, s);
    expect(loc.id).toMatch(/^TR:47:midyat:/);
    expect(loc.timeZone).toBe('Europe/Istanbul');
    expect(locationLabel(loc).subtitle).toContain('Midyat / Mardin');
    expect(locationLabel(locationFromDistrict(districtsOf('06').find((x) => x.name === 'Çankaya')!)).title).toBe('Çankaya');
  });

  it('GPS: Midyat merkezine yakın bir nokta Midyat ilçesine eşlenir', () => {
    const n = nearestDistrict(37.42, 41.34);
    expect(n?.district.name).toBe('Midyat');
    expect(n!.distanceKm).toBeLessThan(5);
  });

  it('GPS: yurt dışı koordinatı Türkiye dışı olarak tanınır', () => {
    expect(isRoughlyInTurkey(52.52, 13.4)).toBe(false); // Berlin
    expect(isRoughlyInTurkey(39.93, 32.85)).toBe(true); // Ankara
  });
});

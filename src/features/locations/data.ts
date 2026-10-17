/**
 * Türkiye yerleşim verisine erişim katmanı.
 * Veri: src/data/*.json — scripts/build-locations.mjs ile üretilir (kaynaklar: docs/DATA_SOURCES.md).
 * Büyük yerleşim listesi yalnızca ilk ihtiyaç duyulduğunda yüklenir.
 */
import indexJson from '../../data/locations-index.json';
import { foldTr } from './normalize';
import type { CoordinateQuality, District, Province, SelectedLocation, Settlement, SettlementType } from './types';
import { TURKEY_TZ } from '../../utils/time';

type IndexFile = {
  meta: LocationsMeta;
  provinces: [string, string, number, number][];
  districts: [string, string, number, number, CoordinateQuality, string | null, number][];
};

export type LocationsMeta = {
  schemaVersion: number;
  country: string;
  generatedAt: string;
  counts: { provinces: number; districts: number; settlements: number; types: Record<string, number> };
  coordinateQuality: Record<string, number>;
  sources: { id: string; title: string; via: string; upstream?: string; license: string }[];
};

const idx = indexJson as unknown as IndexFile;

export const locationsMeta: LocationsMeta = idx.meta;

export const provinces: Province[] = idx.provinces.map(([code, name, lat, lon]) => ({ code, name, lat, lon }));

export const districts: District[] = idx.districts.map(([provinceCode, name, lat, lon, quality, geonameId, settlementCount], index) => ({
  index,
  provinceCode,
  name,
  lat,
  lon,
  quality,
  geonameId,
  settlementCount,
}));

const provinceByCode = new Map(provinces.map((p) => [p.code, p]));
export const getProvince = (code: string) => provinceByCode.get(code);

export const districtsOf = (provinceCode: string) => districts.filter((d) => d.provinceCode === provinceCode);

export function findDistrict(provinceCode: string, name: string): District | undefined {
  const f = foldTr(name);
  return districts.find((d) => d.provinceCode === provinceCode && foldTr(d.name) === f);
}

/** İl adları alfabetik (Türkçe sıralama). */
export const provincesSorted = [...provinces].sort((a, b) => a.name.localeCompare(b.name, 'tr'));

// ---------------- yerleşimler (tembel yükleme) ----------------
const TYPE_FROM_CODE: Record<string, SettlementType> = {
  m: 'mahalle',
  k: 'koy',
  q: 'koy_mahallesi',
  b: 'belde_mahallesi',
  y: 'mezra_yayla',
  d: 'diger',
};

let rawSettlements: string[] | null = null;
const parsedCache = new Map<number, Settlement[]>();

/** Test ortamı (Node/Vitest) için veri kaynağını dışarıdan verme imkânı. */
export function setSettlementsSource(raw: string[]) {
  rawSettlements = raw;
  parsedCache.clear();
}

function loadRaw(): string[] {
  if (!rawSettlements) {
     
    rawSettlements = require('../../data/settlements.json') as string[];
  }
  return rawSettlements;
}

export function settlementsOf(districtIndex: number): Settlement[] {
  const cached = parsedCache.get(districtIndex);
  if (cached) return cached;
  const block = loadRaw()[districtIndex] ?? '';
  const list: Settlement[] = block
    ? block.split('\n').map((line) => {
        const [name, parent, t, pk] = line.split('|');
        return { districtIndex, name, parent, type: TYPE_FROM_CODE[t] ?? 'diger', postalCodes: pk ? pk.split(',') : [] };
      })
    : [];
  parsedCache.set(districtIndex, list);
  return list;
}

export function settlementCountTotal(): number {
  return locationsMeta.counts.settlements;
}

// ---------------- seçili konum oluşturma ----------------
export function locationFromDistrict(d: District, s?: Settlement): SelectedLocation {
  const p = getProvince(d.provinceCode)!;
  const id = ['TR', d.provinceCode, foldTr(d.name), s ? foldTr(`${s.name} ${s.parent}`) : ''].filter(Boolean).join(':');
  return {
    id,
    country: 'TR',
    provinceCode: p.code,
    provinceName: p.name,
    districtName: d.name,
    settlementName: s?.name,
    settlementParent: s?.parent || undefined,
    lat: d.lat,
    lon: d.lon,
    quality: d.quality,
    timeZone: TURKEY_TZ,
  };
}

/** Kısa görünen ad: "Midyat, Mardin" veya "Acırlı Mahallesi, Midyat / Mardin". */
export function locationLabel(l: SelectedLocation): { title: string; subtitle: string } {
  const district = l.districtName === 'Merkez' ? `${l.provinceName} Merkez` : l.districtName;
  if (l.settlementName) {
    return {
      title: l.settlementName,
      subtitle: [l.settlementParent, `${district} / ${l.provinceName}`].filter(Boolean).join(' · '),
    };
  }
  return { title: district, subtitle: l.provinceName };
}

/** İki nokta arası büyük daire mesafesi (km). */
export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371.0088;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * GPS konumuna en yakın ilçe merkezi. Yalnızca gerçek koordinatı olan (il merkezi yaklaşımı
 * kullanılmayan) ilçeler aday olur; böylece yaklaşık kayıtlar yanlış eşleşmeye yol açmaz.
 */
export function nearestDistrict(lat: number, lon: number): { district: District; distanceKm: number } | null {
  let best: District | null = null;
  let bestKm = Infinity;
  for (const d of districts) {
    if (d.quality === 'province_center') continue;
    const km = haversineKm(lat, lon, d.lat, d.lon);
    if (km < bestKm) {
      bestKm = km;
      best = d;
    }
  }
  return best ? { district: best, distanceKm: bestKm } : null;
}

/** Türkiye'nin kaba sınır kutusu — GPS sonucu yurt dışındaysa kullanıcıyı uyarmak için. */
export function isRoughlyInTurkey(lat: number, lon: number): boolean {
  return lat >= 35.8 && lat <= 42.2 && lon >= 25.6 && lon <= 44.9;
}

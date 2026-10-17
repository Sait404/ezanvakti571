#!/usr/bin/env node
/**
 * EzanVakti571 — Türkiye yerleşim verisi içe aktarma aracı.
 *
 * Kaynaklar (ayrıntı: docs/DATA_SOURCES.md):
 *  1) İl / ilçe / mahalle / köy / belde adları + posta kodları:
 *     npm "turkey-neighbourhoods" (MIT). Paket verisi PTT A.Ş. posta kodu listesinden
 *     (https://postakodu.ptt.gov.tr/Dosyalar/pk_list.zip) üretilmektedir.
 *  2) İl ve ilçe merkezi koordinatları: GeoNames (CC BY 4.0), npm "all-the-cities"
 *     (MIT) paketi üzerinden (nüfusu ≥ 1000 yerleşimler, cities1000).
 *
 * İlkeler:
 *  - Hiçbir köy/mahalle tahminle üretilmez; yalnızca kaynakta olanlar alınır.
 *  - Koordinatı kaynakta eşleşmeyen ilçeler "province_center" kalitesiyle işaretlenir
 *    ve rapora yazılır; UI bunu kullanıcıya gösterir.
 *  - Mahalle/köy düzeyinde koordinat kaynağı bulunmadığından yerleşimler bağlı oldukları
 *    ilçe merkezinin koordinatını kullanır (Diyanet de vakitleri ilçe bazında yayımlar).
 *
 * Kullanım: node scripts/build-locations.mjs  →  src/data/locations.json + docs/DATA_REPORT.md
 */
import { createRequire } from 'node:module';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const tn = require('turkey-neighbourhoods');
const tnPkg = JSON.parse(readFileSync(join(root, 'node_modules/turkey-neighbourhoods/package.json'), 'utf8'));
const atcPkg = JSON.parse(readFileSync(join(root, 'node_modules/all-the-cities/package.json'), 'utf8'));
const geonamesAll = require('all-the-cities');

// ---------- yardımcılar ----------
const trLower = (s) => s.toLocaleLowerCase('tr-TR');
/** Türkçe karakterleri sadeleştirir: "Şişli" -> "sisli". src/features/locations/normalize.ts ile aynı kural. */
export const fold = (s) =>
  trLower(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const titleTr = (s) =>
  s
    .split(/(\s+|-)/)
    .map((w) => (w.trim() && !/^(-|\s+)$/.test(w) ? w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1) : w))
    .join('');

/**
 * PTT ham adını ayrıştırır.
 *  "Akarsu Mah"                     -> { name: "Akarsu Mahallesi", type: "mahalle" }
 *  "Camiliyayla Köyü"               -> { name: "Camiliyayla Köyü", type: "koy" }
 *  "Merkez Mah (cihangazi Köyü)"    -> { name: "Merkez Mahallesi", parent: "Cihangazi Köyü", type: "koy_mahallesi" }
 *  "Mithatpaşa Mah (dodurga Beldesi)" -> { ..., parent: "Dodurga Beldesi", type: "belde_mahallesi" }
 */
export function parseSettlement(raw) {
  const clean = raw.replace(/\s+/g, ' ').trim();
  const parens = [...clean.matchAll(/\(([^)]*)\)/g)].map((m) => titleTr(m[1].trim()));
  let base = clean.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  base = base.replace(/\bMah\b\.?/g, 'Mahallesi');
  const parentFull = parens.length ? parens[parens.length - 1].replace(/\bMah\b/g, 'Mahallesi') : undefined;
  const between = parens.length > 1 ? parens.slice(0, -1).map((p) => p.replace(/\bMah\b/g, 'Mahallesi')) : [];
  let type = 'diger';
  if (parentFull && /Köyü$/.test(parentFull)) type = 'koy_mahallesi';
  else if (parentFull && /Beldesi$/.test(parentFull)) type = 'belde_mahallesi';
  else if (/Mahallesi$/.test(base) || (parentFull && /Mahallesi$/.test(parentFull))) type = 'mahalle';
  else if (/Köyü?$/.test(base)) type = 'koy';
  else if (/(Yaylası|Yaylaları|Evleri|Merkez)$/.test(base)) type = 'mezra_yayla';
  const parent = [...between, parentFull].filter(Boolean).join(' / ') || undefined;
  return { name: base, parent, type };
}

// ---------- GeoNames il eşleme ----------
const tr = geonamesAll.filter((c) => c.country === 'TR');
const cities = tn.getCities(); // [{code,name}]
const ppla = tr.filter((c) => c.featureCode === 'PPLA' || c.featureCode === 'PPLC');
const admin1ByPlate = {};
const provinceCoord = {};
const unmatchedProvinces = [];
const PROVINCE_ALIASES = { 'Afyonkarahisar': ['afyon'], 'Kahramanmaraş': ['kahramanmaras'], 'Şanlıurfa': ['sanliurfa', 'urfa'], 'Kocaeli': ['izmit'], 'Sakarya': ['adapazari'], 'Hatay': ['antakya'], 'Mersin': ['mersin'], 'Çankırı': ['khanjarah'], 'Gümüşhane': ['gumushkhane'] }; // GeoNames'te İngilizce/eski transliterasyonla kayıtlı il merkezleri
for (const c of cities) {
  const keys = [fold(c.name), ...(PROVINCE_ALIASES[c.name] ?? [])];
  const g = ppla.find((p) => keys.includes(fold(p.name)));
  if (g) {
    admin1ByPlate[c.code] = g.adminCode;
    provinceCoord[c.code] = { lat: g.loc.coordinates[1], lon: g.loc.coordinates[0], geonameId: g.cityId };
  } else unmatchedProvinces.push(c.name);
}

// ---------- ilçe koordinat eşleme ----------
const rank = { PPLA2: 0, PPLA: 1, PPLC: 1, PPLA3: 2, PPL: 3, PPLX: 4 };
const DISTRICT_ALIASES = { 'Eyüpsultan': ['eyup'], 'Onikişubat': ['kahramanmaras'], 'Dulkadiroğlu': ['kahramanmaras'], 'Antakya': ['antakya'], 'Merkezefendi': ['denizli'], 'Pamukkale': ['denizli'], 'Pülümür': ['pulumer'] }; // GeoNames transliterasyonları
const squash = (s) => s.replace(/\s+/g, '');
const provinces = [];
const districts = [];
const coordReport = { matched: 0, overrides: 0, province_center: [] };
// Doğrulanmış kaynaktan elle düzeltilmiş koordinatlar (her kayıtta source + license zorunlu).
const overridesPath = join(root, 'data/location-overrides.json');
let overrides = [];
try {
  overrides = JSON.parse(readFileSync(overridesPath, 'utf8')).districts ?? [];
  for (const o of overrides) {
    if (!o.source || !o.license || typeof o.lat !== 'number' || typeof o.lon !== 'number')
      throw new Error(`Geçersiz override kaydı (source/license/lat/lon zorunlu): ${JSON.stringify(o)}`);
  }
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}
let settlementCount = 0;
const typeCounts = {};
const dupesRemoved = [];

const neighbourhoodRows = JSON.parse(
  readFileSync(join(root, 'node_modules/turkey-neighbourhoods/src/data/neighbourhoods.json'), 'utf8'),
); // [plate, il, ilçe, ham ad, posta kodu]
const postalByKey = new Map();
for (const [plate, , ilce, raw, pk] of neighbourhoodRows) {
  const k = `${plate}|${ilce}|${raw}`;
  if (!postalByKey.has(k)) postalByKey.set(k, new Set());
  postalByKey.get(k).add(pk);
}

for (const c of [...cities].sort((a, b) => a.code.localeCompare(b.code))) {
  const pc = provinceCoord[c.code];
  provinces.push([c.code, c.name, pc?.lat ?? null, pc?.lon ?? null]);
  const admin1 = admin1ByPlate[c.code];
  const pool = tr.filter((g) => g.adminCode === admin1);
  const byDistrict = tn.getDistrictsAndNeighbourhoodsByCityCode(c.code);
  for (const dName of Object.keys(byDistrict).sort((a, b) => a.localeCompare(b, 'tr'))) {
    let lat = null, lon = null, q = 'province_center', gid = null;
    if (dName === 'Merkez' && pc) {
      ({ lat, lon } = pc); q = 'geonames'; gid = pc.geonameId;
    } else {
      const keys = [fold(dName), ...(DISTRICT_ALIASES[dName] ?? [])].map(squash);
      const cands = pool.filter((g) => keys.includes(squash(fold(g.name)))).sort((a, b) => rank[a.featureCode] - rank[b.featureCode]);
      if (cands.length) {
        lat = cands[0].loc.coordinates[1]; lon = cands[0].loc.coordinates[0]; q = 'geonames'; gid = cands[0].cityId;
      } else if (pc) {
        ({ lat, lon } = pc);
        coordReport.province_center.push(`${c.name} / ${dName}`);
      }
    }
    const ov = overrides.find((o) => o.plate === c.code && o.district === dName);
    if (ov) {
      lat = ov.lat; lon = ov.lon; q = 'override'; gid = null;
      coordReport.province_center = coordReport.province_center.filter((x) => x !== `${c.name} / ${dName}`);
    }
    if (q === 'geonames') coordReport.matched++;
    if (q === 'override') coordReport.overrides++;
    const seen = new Set();
    const settlements = [];
    for (const raw of byDistrict[dName]) {
      const p = parseSettlement(raw);
      const key = fold(p.name + '|' + (p.parent ?? ''));
      if (seen.has(key)) { dupesRemoved.push(`${c.name}/${dName}: ${raw}`); continue; }
      seen.add(key);
      typeCounts[p.type] = (typeCounts[p.type] ?? 0) + 1;
      const pks = [...(postalByKey.get(`${c.code}|${dName}|${raw}`) ?? [])].join(',');
      settlements.push([p.name, p.parent ?? '', p.type, pks]);
    }
    settlements.sort((a, b) => a[0].localeCompare(b[0], 'tr'));
    settlementCount += settlements.length;
    districts.push({ p: c.code, n: dName, lat, lon, q, g: gid, s: settlements });
  }
}

// ---------- bütünlük kontrolleri ----------
const errors = [];
if (provinces.length !== 81) errors.push(`İl sayısı 81 değil: ${provinces.length}`);
if (unmatchedProvinces.length) errors.push(`Koordinatı bulunamayan il: ${unmatchedProvinces.join(', ')}`);
for (const d of districts) {
  if (d.lat == null || d.lon == null) errors.push(`Koordinatsız ilçe: ${d.p}/${d.n}`);
  if (d.lat != null && (d.lat < 35.5 || d.lat > 42.5 || d.lon < 25.5 || d.lon > 45))
    errors.push(`Türkiye sınırı dışında koordinat: ${d.p}/${d.n} ${d.lat},${d.lon}`);
  if (!d.s.length) errors.push(`Yerleşimi olmayan ilçe: ${d.p}/${d.n}`);
}
const dupDistrict = new Set();
for (const d of districts) {
  const k = d.p + '|' + d.n;
  if (dupDistrict.has(k)) errors.push(`Tekrarlanan ilçe: ${k}`);
  dupDistrict.add(k);
}
if (errors.length) {
  console.error('BÜTÜNLÜK HATASI:\n' + errors.join('\n'));
  process.exit(1);
}

const generatedAt = new Date().toISOString();
const meta = {
  schemaVersion: 1,
  country: 'TR',
  generatedAt,
  counts: { provinces: provinces.length, districts: districts.length, settlements: settlementCount, types: typeCounts },
  coordinateQuality: { geonames: coordReport.matched, override: coordReport.overrides, province_center: coordReport.province_center.length },
  sources: [
    {
      id: 'ptt-pk-list',
      title: 'PTT A.Ş. posta kodu listesi (il/ilçe/mahalle/köy adları)',
      via: `npm turkey-neighbourhoods@${tnPkg.version} (MIT, ${tnPkg.repository?.url ?? ''})`,
      upstream: tnPkg.config?.neighbourhoods_endpoint,
      license: 'Paket kodu MIT; ad listesi PTT tarafından kamuya açık yayımlanan posta kodu listesidir. Yayın öncesi PTT kullanım koşulları hukuken teyit edilmelidir.',
    },
    {
      id: 'geonames',
      title: 'GeoNames — il ve ilçe merkezi koordinatları',
      via: `npm all-the-cities@${atcPkg.version} (MIT)`,
      upstream: 'https://www.geonames.org/',
      license: 'CC BY 4.0 — uygulamada "GeoNames" atfı zorunludur (Kaynaklar ekranında gösterilir).',
    },
  ],
};

// Çıktı iki dosyaya bölünür: küçük indeks (açılışta yüklenir) ve büyük yerleşim listesi (yalnızca
// yerleşim araması açıldığında tembel olarak yüklenir).
const TYPE_CODE = { mahalle: 'm', koy: 'k', koy_mahallesi: 'q', belde_mahallesi: 'b', mezra_yayla: 'y', diger: 'd' };
mkdirSync(join(root, 'src/data'), { recursive: true });
const indexDistricts = districts.map((d) => [d.p, d.n, d.lat, d.lon, d.q, d.g, d.s.length]);
writeFileSync(join(root, 'src/data/locations-index.json'), JSON.stringify({ meta, provinces, districts: indexDistricts }));
writeFileSync(
  join(root, 'src/data/settlements.json'),
  JSON.stringify(districts.map((d) => d.s.map(([n, p, t, pk]) => `${n}|${p}|${TYPE_CODE[t]}|${pk}`).join('\n'))),
);

const report = `# Türkiye yerleşim verisi raporu

Oluşturulma: ${generatedAt}

| Ölçü | Değer |
|---|---|
| İl | ${provinces.length} |
| İlçe | ${districts.length} |
| Yerleşim kaydı (mahalle, köy, belde/köy mahallesi) | ${settlementCount} |
| GeoNames ile eşleşen ilçe koordinatı | ${coordReport.matched} |
| İl merkezi koordinatı kullanılan ilçe (yaklaşık) | ${coordReport.province_center.length} |
| Tekrar olarak ayıklanan kayıt | ${dupesRemoved.length} |

Yerleşim türleri: ${Object.entries(typeCounts).map(([k, v]) => `${k}: ${v}`).join(', ')}

## Bilinen eksikler (dürüst durum)

- Mahalle ve köy düzeyinde **ayrı koordinat yoktur**. Bu düzeylerde namaz vakti, bağlı olunan ilçenin merkez koordinatıyla hesaplanır.
- Aşağıdaki ${coordReport.province_center.length} ilçe için GeoNames'te ad eşleşmesi bulunamadı; bunlarda **il merkezi koordinatı** kullanılıyor ve uygulama bunu "yaklaşık konum" olarak gösteriyor. Güvenilir bir koordinat kaynağı eklendiğinde \`scripts/build-locations.mjs\` yeniden çalıştırılmalıdır.
- Veri, PTT listesindeki idari adlandırmayı izler (ör. bazı büyükşehir olmayan illerde merkez ilçe "Merkez" adıyla yer alır).

${coordReport.province_center.map((x) => `- ${x}`).join('\n')}

## Ayıklanan tekrarlar

${dupesRemoved.slice(0, 200).map((x) => `- ${x}`).join('\n') || '- yok'}
`;
mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(join(root, 'docs/DATA_REPORT.md'), report);
console.log(JSON.stringify(meta.counts), JSON.stringify(meta.coordinateQuality));

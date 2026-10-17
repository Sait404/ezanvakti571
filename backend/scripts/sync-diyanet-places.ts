/**
 * Diyanet il/ilçe kimliklerini uygulamanın Türkiye yerleşim verisiyle eşler.
 * Gerekli: DIYANET_EMAIL ve DIYANET_PASSWORD (backend/.env).
 * Çıktı: data/diyanet-place-map.json + eşleşmeyenler raporu (stdout).
 * Kullanım: npm run sync:diyanet-places
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { diyanetConfigured, loadConfig } from '../src/config.js';
import { DiyanetClient } from '../src/diyanet/client.js';
import { foldTr, placeKey } from '../src/diyanet/service.js';

const config = loadConfig();
if (!diyanetConfigured(config)) {
  console.error('DIYANET_EMAIL / DIYANET_PASSWORD tanımlı değil. Erişim için Diyanet İşleri Başkanlığı ile iletişime geçin (docs/DIYANET.md).');
  process.exit(1);
}
const client = new DiyanetClient({ baseUrl: config.DIYANET_BASE_URL, email: config.DIYANET_EMAIL, password: config.DIYANET_PASSWORD });

type Index = { provinces: [string, string, number, number][]; districts: [string, string, ...unknown[]][] };
const idx = JSON.parse(await readFile(new URL('../../src/data/locations-index.json', import.meta.url), 'utf8')) as Index;

const countries = await client.countries();
const tr = countries.find((c) => ['turkiye', 'turkey'].includes(foldTr(c.name)));
if (!tr) throw new Error('Diyanet ülke listesinde Türkiye bulunamadı.');
const states = await client.states(tr.id);

const places: Record<string, number> = {};
const unmatched: string[] = [];
for (const [plate, provinceName] of idx.provinces) {
  const st = states.find((s) => foldTr(s.name) === foldTr(provinceName));
  if (!st) {
    unmatched.push(`İL: ${provinceName}`);
    continue;
  }
  const cities = await client.cities(st.id);
  for (const [p, district] of idx.districts.filter((d) => d[0] === plate)) {
    const wanted = district === 'Merkez' ? [foldTr(provinceName), 'merkez'] : [foldTr(district)];
    const c = cities.find((x) => wanted.includes(foldTr(x.name)));
    if (c) places[placeKey(p, district)] = c.id;
    else unmatched.push(`İLÇE: ${provinceName} / ${district}`);
  }
}

await mkdir(dirname(config.DIYANET_PLACE_MAP), { recursive: true });
await writeFile(config.DIYANET_PLACE_MAP, JSON.stringify({ generatedAt: new Date().toISOString(), places }, null, 1));
console.log(`Eşlenen ilçe: ${Object.keys(places).length} / ${idx.districts.length}`);
if (unmatched.length) console.log(`Eşlenemeyen (${unmatched.length}) — elle kontrol edin:\n${unmatched.join('\n')}`);

// Örnek bir şehirle yanıt şemasını canlı olarak doğrula
const sample = Object.values(places)[0];
if (sample) console.log('Örnek günlük yanıt (şema doğrulandı):', JSON.stringify((await client.daily(sample))[0]));

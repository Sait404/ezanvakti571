/**
 * Türkçe duyarlı arama normalizasyonu.
 * "İSTANBUL", "istanbul", "Istanbul", "ıstanbul" → "istanbul"
 * "Şişli" → "sisli", "Çağlayan" → "caglayan", "Gümüşhane" → "gumushane"
 * Not: scripts/build-locations.mjs içindeki fold() ile aynı kural setidir.
 */
/** Unicode birleşik aksan işaretleri (U+0300–U+036F). */
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

export function foldTr(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .replace(/i̇/g, 'i') // bazı ortamlarda "İ".toLowerCase() → "i̇" (birleşik nokta)
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Arama için ek alternatif yazımlar (yaygın ASCII/kısaltma varyasyonları). */
const ALT_SPELLINGS: [RegExp, string][] = [
  [/\bmah\b/g, 'mahallesi'],
  [/\bmh\b/g, 'mahallesi'],
  [/\bkoy\b/g, 'koyu'],
  [/\bblv\b/g, 'bulvari'],
];

export function expandQuery(q: string): string {
  let s = foldTr(q);
  for (const [re, rep] of ALT_SPELLINGS) s = s.replace(re, rep);
  return s;
}

/** Sorgu kelimelerinin her biri hedefte bir kelime başlangıcı olarak geçiyorsa eşleşir. */
export function matchesAllTokens(haystackFolded: string, queryFolded: string): boolean {
  if (!queryFolded) return true;
  const words = haystackFolded.split(' ');
  return queryFolded.split(' ').every((t) => words.some((w) => w.startsWith(t)) || haystackFolded.includes(t));
}

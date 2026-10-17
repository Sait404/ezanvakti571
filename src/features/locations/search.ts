import { districts, getProvince, provinces, settlementsOf } from './data';
import { expandQuery, foldTr, matchesAllTokens } from './normalize';
import type { District, Province, Settlement } from './types';

export type SearchResult =
  | { kind: 'province'; province: Province; score: number }
  | { kind: 'district'; district: District; province: Province; score: number }
  | { kind: 'settlement'; settlement: Settlement; district: District; province: Province; score: number };

type SettlementIndexEntry = { folded: string; nameFolded: string; districtIndex: number; i: number };
let settlementIndex: SettlementIndexEntry[] | null = null;

/** 73 bin yerleşim için katlanmış (fold) arama dizinini bir kez kurar. */
export function buildSettlementIndex(): SettlementIndexEntry[] {
  if (settlementIndex) return settlementIndex;
  const out: SettlementIndexEntry[] = [];
  for (const d of districts) {
    const list = settlementsOf(d.index);
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const nameFolded = foldTr(s.name);
      out.push({ folded: `${nameFolded} ${foldTr(s.parent)} ${s.postalCodes.join(' ')}`.trim(), nameFolded, districtIndex: d.index, i });
    }
  }
  settlementIndex = out;
  return out;
}

function scoreName(nameFolded: string, q: string): number {
  if (nameFolded === q) return 100;
  if (nameFolded.startsWith(q)) return 80 - Math.min(20, nameFolded.length - q.length);
  if (nameFolded.split(' ').some((w) => w.startsWith(q))) return 60;
  if (nameFolded.includes(q)) return 40;
  return 0;
}

export type SearchOptions = { limit?: number; includeSettlements?: boolean };

/**
 * İl, ilçe ve (isteğe bağlı) mahalle/köy araması.
 * - Türkçe karakterli ve karaktersiz yazımı eşler ("sisli" = "Şişli").
 * - "midyat mardin" gibi çok kelimeli sorgularda ilçe/il bağlamını da kullanır; aynı adlı
 *   yerleşimler bu sayede ayrışır.
 */
export function searchLocations(query: string, opts: SearchOptions = {}): SearchResult[] {
  const limit = opts.limit ?? 50;
  const q = expandQuery(query);
  if (q.length < 2) return [];
  const results: SearchResult[] = [];

  for (const p of provinces) {
    const s = scoreName(foldTr(p.name), q);
    if (s) results.push({ kind: 'province', province: p, score: s + 15 });
  }
  for (const d of districts) {
    const p = getProvince(d.provinceCode)!;
    const nameF = foldTr(d.name);
    let s = scoreName(nameF, q);
    if (!s && matchesAllTokens(`${nameF} ${foldTr(p.name)}`, q)) s = 55;
    if (s) results.push({ kind: 'district', district: d, province: p, score: s + 10 });
  }
  if (opts.includeSettlements !== false && q.length >= 3) {
    const tokens = q.split(' ');
    const head = tokens[0];
    const index = buildSettlementIndex();
    for (const e of index) {
      let s = scoreName(e.nameFolded, q);
      if (!s && tokens.length > 1 && e.folded.includes(head)) {
        const d = districts[e.districtIndex];
        const ctx = `${e.folded} ${foldTr(d.name)} ${foldTr(getProvince(d.provinceCode)!.name)}`;
        if (matchesAllTokens(ctx, q)) s = 50;
      } else if (!s && e.folded.includes(q)) s = 30; // bağlı köy/belde adı ya da posta kodu ile eşleşme
      if (s) {
        const d = districts[e.districtIndex];
        results.push({
          kind: 'settlement',
          settlement: settlementsOf(d.index)[e.i],
          district: d,
          province: getProvince(d.provinceCode)!,
          score: s,
        });
      }
    }
  }
  results.sort((a, b) => b.score - a.score || labelOf(a).localeCompare(labelOf(b), 'tr'));
  return results.slice(0, limit);
}

function labelOf(r: SearchResult): string {
  if (r.kind === 'province') return r.province.name;
  if (r.kind === 'district') return `${r.district.name} ${r.province.name}`;
  return `${r.settlement.name} ${r.district.name} ${r.province.name}`;
}

/** Aynı ada sahip yerleşimleri il/ilçe ile ayırt eden etiket. */
export function disambiguationLabel(r: SearchResult): string {
  if (r.kind === 'province') return 'İl';
  if (r.kind === 'district') return `İlçe · ${r.province.name}`;
  const parent = r.settlement.parent ? `${r.settlement.parent} · ` : '';
  return `${parent}${r.district.name} / ${r.province.name}`;
}

/**
 * Tesbih sayacı. Sayım kullanıcının kendi kaydıdır; uygulama ibadetin yapıldığını doğrulamaz.
 * Tüm veriler yalnızca cihazda tutulur. Her dokunuş anında kalıcı depoya yazılır, böylece
 * ekran kapansa veya uygulama kapatılsa bile sayı korunur.
 */
import { createPersistedStore } from '../../utils/persistedStore';
import { STORAGE_PREFIX } from '../../utils/storage';
import { addDays, dateKeyOf, type DateKey } from '../../utils/time';

export type DhikrCounter = { id: string; name: string; target: number; count: number; favorite: boolean; createdAt: string };
export type DhikrState = {
  counters: DhikrCounter[];
  activeId: string;
  /** Günlük toplamlar: { "2026-10-17": { [counterId]: n } } — en fazla 120 gün tutulur. */
  daily: Record<DateKey, Record<string, number>>;
  sound: boolean;
};

/**
 * Varsayılan sayaçlar yalnızca ad ve kullanıcı tarafından değiştirilebilir bir hedef içerir.
 * Hedef sayıları bir fazilet iddiası değildir; kullanıcı dilediği gibi değiştirebilir.
 */
const DEFAULTS: DhikrCounter[] = [
  { id: 'subhanallah', name: 'Sübhânallah', target: 33, count: 0, favorite: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'elhamdulillah', name: 'Elhamdülillah', target: 33, count: 0, favorite: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'allahuekber', name: 'Allâhu ekber', target: 33, count: 0, favorite: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'serbest', name: 'Serbest sayım', target: 0, count: 0, favorite: false, createdAt: '2026-01-01T00:00:00.000Z' },
];

export const dhikrStore = createPersistedStore<DhikrState>({
  key: `${STORAGE_PREFIX}dhikr`,
  version: 1,
  initial: { counters: DEFAULTS, activeId: 'subhanallah', daily: {}, sound: false },
  validate: (s) => ({
    ...s,
    counters: s.counters?.length ? s.counters : DEFAULTS,
    activeId: s.counters?.some((c) => c.id === s.activeId) ? s.activeId : (s.counters?.[0]?.id ?? 'subhanallah'),
  }),
});

const TZ = 'Europe/Istanbul';

export type IncrementResult = { count: number; reachedTarget: boolean };

export function increment(state: DhikrState, now: Date, tz = TZ): { next: DhikrState; result: IncrementResult } {
  const day = dateKeyOf(now, tz);
  let result: IncrementResult = { count: 0, reachedTarget: false };
  const counters = state.counters.map((c) => {
    if (c.id !== state.activeId) return c;
    const count = c.count + 1;
    result = { count, reachedTarget: c.target > 0 && count === c.target };
    return { ...c, count };
  });
  const today = { ...(state.daily[day] ?? {}) };
  today[state.activeId] = (today[state.activeId] ?? 0) + 1;
  const cutoff = addDays(day, -120);
  const daily: DhikrState['daily'] = { [day]: today };
  for (const [k, v] of Object.entries(state.daily)) if (k !== day && k >= cutoff) daily[k] = v;
  return { next: { ...state, counters, daily }, result };
}

export function resetActive(state: DhikrState): DhikrState {
  return { ...state, counters: state.counters.map((c) => (c.id === state.activeId ? { ...c, count: 0 } : c)) };
}

export function addCounter(state: DhikrState, name: string, target: number, now = new Date()): DhikrState {
  const clean = name.trim().slice(0, 60);
  if (!clean) throw new Error('Zikir adı boş olamaz.');
  const t = Math.max(0, Math.min(100000, Math.floor(target) || 0));
  const id = `c${now.getTime().toString(36)}`;
  return { ...state, counters: [...state.counters, { id, name: clean, target: t, count: 0, favorite: false, createdAt: now.toISOString() }], activeId: id };
}

export function removeCounter(state: DhikrState, id: string): DhikrState {
  const counters = state.counters.filter((c) => c.id !== id);
  if (!counters.length) return state;
  return { ...state, counters, activeId: state.activeId === id ? counters[0].id : state.activeId };
}

export function totals(state: DhikrState, now: Date, tz = TZ): { today: number; last7: number } {
  const day = dateKeyOf(now, tz);
  const sum = (k: DateKey) => Object.values(state.daily[k] ?? {}).reduce((a, b) => a + b, 0);
  let last7 = 0;
  for (let i = 0; i < 7; i++) last7 += sum(addDays(day, -i));
  return { today: sum(day), last7 };
}

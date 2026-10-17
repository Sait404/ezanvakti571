/**
 * Küçük, bağımlılıksız kalıcı durum deposu (useSyncExternalStore + AsyncStorage).
 * - Bozuk/eksik kayıtta varsayılana döner (uygulama çökmez).
 * - Şema sürümü değişirse migrate() ile yükseltilir.
 */
import { useSyncExternalStore } from 'react';
import type { KeyValueStorage } from './storage';
import { defaultStorage } from './storage';

export type PersistedStore<T> = {
  get(): T;
  set(update: Partial<T> | ((prev: T) => T)): void;
  subscribe(fn: () => void): () => void;
  hydrate(): Promise<void>;
  isHydrated(): boolean;
  reset(): Promise<void>;
  key: string;
};

export function createPersistedStore<T extends object>(opts: {
  key: string;
  version: number;
  initial: T;
  migrate?: (raw: unknown, fromVersion: number) => T;
  storage?: KeyValueStorage;
  validate?: (v: T) => T;
}): PersistedStore<T> {
  const storage = opts.storage ?? defaultStorage;
  let state: T = opts.initial;
  let hydrated = false;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  let writeChain: Promise<void> = Promise.resolve();
  const persist = () => {
    const snapshot = JSON.stringify({ v: opts.version, data: state });
    writeChain = writeChain.then(() => storage.setItem(opts.key, snapshot)).catch(() => undefined);
  };

  return {
    key: opts.key,
    get: () => state,
    isHydrated: () => hydrated,
    set(update) {
      const next = typeof update === 'function' ? update(state) : { ...state, ...update };
      state = opts.validate ? opts.validate(next) : next;
      emit();
      persist();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    async hydrate() {
      try {
        const raw = await storage.getItem(opts.key);
        if (raw) {
          const parsed = JSON.parse(raw) as { v: number; data: unknown };
          let data: T;
          if (parsed.v === opts.version) data = { ...opts.initial, ...(parsed.data as T) };
          else if (opts.migrate) data = opts.migrate(parsed.data, parsed.v);
          else data = opts.initial;
          state = opts.validate ? opts.validate(data) : data;
        }
      } catch {
        state = opts.initial;
      }
      hydrated = true;
      emit();
    },
    async reset() {
      state = opts.initial;
      emit();
      await storage.removeItem(opts.key);
    },
  };
}

export function useStore<T extends object, S>(store: PersistedStore<T>, selector: (s: T) => S): S {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()), () => selector(store.get()));
}

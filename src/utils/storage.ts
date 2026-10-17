import AsyncStorage from '@react-native-async-storage/async-storage';

export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys?(): Promise<readonly string[]>;
};

/** Tüm uygulama anahtarları bu önekle başlar; "verilerimi sil" yalnızca bunları temizler. */
export const STORAGE_PREFIX = 'ev571:';

export const defaultStorage: KeyValueStorage = {
  getItem: (k) => AsyncStorage.getItem(k),
  setItem: (k, v) => AsyncStorage.setItem(k, v),
  removeItem: (k) => AsyncStorage.removeItem(k),
  getAllKeys: () => AsyncStorage.getAllKeys(),
};

/** Testler için bellek içi depolama. */
export function memoryStorage(): KeyValueStorage & { dump(): Record<string, string> } {
  const m = new Map<string, string>();
  return {
    getItem: async (k) => m.get(k) ?? null,
    setItem: async (k, v) => void m.set(k, v),
    removeItem: async (k) => void m.delete(k),
    getAllKeys: async () => [...m.keys()],
    dump: () => Object.fromEntries(m),
  };
}

/** Uygulamanın cihazda tuttuğu tüm verileri siler (KVKK: silme hakkı). */
export async function wipeAllLocalData(storage: KeyValueStorage = defaultStorage): Promise<number> {
  const keys = (await storage.getAllKeys?.()) ?? [];
  const ours = keys.filter((k) => k.startsWith(STORAGE_PREFIX));
  for (const k of ours) await storage.removeItem(k);
  return ours.length;
}

/** Cihazdaki uygulama verilerini JSON olarak dışa aktarır (KVKK: veri taşınabilirliği). */
export async function exportAllLocalData(storage: KeyValueStorage = defaultStorage): Promise<Record<string, unknown>> {
  const keys = (await storage.getAllKeys?.()) ?? [];
  const out: Record<string, unknown> = {};
  for (const k of keys.filter((x) => x.startsWith(STORAGE_PREFIX))) {
    const v = await storage.getItem(k);
    try {
      out[k] = v ? JSON.parse(v) : null;
    } catch {
      out[k] = v;
    }
  }
  return out;
}

import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { config } from '../../config';
import { useStore } from '../../utils/persistedStore';
import { defaultStorage } from '../../utils/storage';
import { dateKeyOf, type DateKey } from '../../utils/time';
import type { SelectedLocation } from '../locations/types';
import { settingsStore } from '../settings/store';
import { getPrayerTimesRange, type RangeResult } from './service';

export type PrayerTimesState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | ({ status: 'ready'; todayKey: DateKey; loadedAt: Date } & RangeResult);

type Loaded = { key: string; state: PrayerTimesState };

/** Saniyede (veya verilen aralıkta) bir yeniden çizim için şimdiki zaman. */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Seçili konum için bugünden itibaren `days` günlük vakitleri yükler.
 * İstek anahtarı (konum + ikindi yöntemi + gün + yenileme sayacı) değişince yeniden yükler;
 * böylece gün değişiminde (konumun saat dilimine göre) ve uygulama ön plana döndüğünde güncellenir.
 */
export function usePrayerTimes(loc: SelectedLocation | null, days = 2): PrayerTimesState & { reload: () => void } {
  const asr = useStore(settingsStore, (s) => s.asrMethod);
  const minute = useNow(30_000);
  const [nonce, setNonce] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  const todayKey = loc ? dateKeyOf(minute, loc.timeZone) : '';
  const key = loc ? `${loc.id}|${loc.lat}|${loc.lon}|${asr}|${days}|${todayKey}|${nonce}` : null;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setNonce((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!loc || !key) return;
    let alive = true;
    getPrayerTimesRange(loc, todayKey, days, { asr }, { apiBaseUrl: config.apiBaseUrl, fetchImpl: fetch, storage: defaultStorage })
      .then((res) => {
        if (alive) setLoaded({ key, state: { status: 'ready', todayKey, loadedAt: new Date(), ...res } });
      })
      .catch((e: unknown) => {
        if (alive) setLoaded({ key, state: { status: 'error', message: e instanceof Error ? e.message : 'Bilinmeyen hata' } });
      });
    return () => {
      alive = false;
    };
  }, [key, loc, todayKey, days, asr]);

  const reload = () => setNonce((n) => n + 1);
  if (!loc) return { status: 'idle', reload };
  if (loaded && loaded.key === key) return { ...loaded.state, reload };
  // Yeni anahtar yüklenirken, aynı konuma ait önceki hazır veri varsa onu göstermeye devam et.
  if (loaded && loaded.state.status === 'ready' && loaded.key.startsWith(`${loc.id}|`)) return { ...loaded.state, reload };
  return { status: 'loading', reload };
}

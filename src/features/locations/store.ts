import { createPersistedStore } from '../../utils/persistedStore';
import { STORAGE_PREFIX } from '../../utils/storage';
import type { SelectedLocation } from './types';

export type LocationState = {
  selected: SelectedLocation | null;
  favorites: SelectedLocation[];
  recents: SelectedLocation[];
};

export const MAX_RECENTS = 8;
export const MAX_FAVORITES = 20;

export const locationStore = createPersistedStore<LocationState>({
  key: `${STORAGE_PREFIX}location`,
  version: 1,
  initial: { selected: null, favorites: [], recents: [] },
  validate: (s) => ({
    selected: s.selected ?? null,
    favorites: Array.isArray(s.favorites) ? s.favorites.slice(0, MAX_FAVORITES) : [],
    recents: Array.isArray(s.recents) ? s.recents.slice(0, MAX_RECENTS) : [],
  }),
});

export function selectLocation(loc: SelectedLocation) {
  locationStore.set((s) => ({
    ...s,
    selected: loc,
    recents: [loc, ...s.recents.filter((r) => r.id !== loc.id)].slice(0, MAX_RECENTS),
  }));
}

export function isFavorite(state: LocationState, id: string) {
  return state.favorites.some((f) => f.id === id);
}

export function toggleFavorite(loc: SelectedLocation) {
  locationStore.set((s) => ({
    ...s,
    favorites: isFavorite(s, loc.id)
      ? s.favorites.filter((f) => f.id !== loc.id)
      : [loc, ...s.favorites].slice(0, MAX_FAVORITES),
  }));
}

export function removeRecent(id: string) {
  locationStore.set((s) => ({ ...s, recents: s.recents.filter((r) => r.id !== id) }));
}

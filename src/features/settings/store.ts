import { createPersistedStore } from '../../utils/persistedStore';
import { STORAGE_PREFIX } from '../../utils/storage';
import type { AsrMethod } from '../prayer-times/types';

export type ThemeMode = 'system' | 'light' | 'dark';
export const FONT_SCALES = [1, 1.15, 1.3, 1.5] as const;
export type FontScale = (typeof FONT_SCALES)[number];

export type Settings = {
  themeMode: ThemeMode;
  fontScale: FontScale;
  asrMethod: AsrMethod;
  /** Tesbih sayacı için dokunsal geri bildirim. */
  haptics: boolean;
  onboardingDone: boolean;
};

export const settingsStore = createPersistedStore<Settings>({
  key: `${STORAGE_PREFIX}settings`,
  version: 1,
  initial: { themeMode: 'system', fontScale: 1, asrMethod: 'asr_evvel', haptics: true, onboardingDone: false },
  validate: (s) => ({
    ...s,
    themeMode: ['system', 'light', 'dark'].includes(s.themeMode) ? s.themeMode : 'system',
    fontScale: (FONT_SCALES as readonly number[]).includes(s.fontScale) ? s.fontScale : 1,
    asrMethod: s.asrMethod === 'asr_sani' ? 'asr_sani' : 'asr_evvel',
  }),
});

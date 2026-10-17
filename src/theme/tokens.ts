/**
 * EzanVakti571 tasarım dili: koyu zümrüt, kırık beyaz, zarif altın.
 * Kontrast oranları (WCAG): metin/zemin çiftleri ≥ 4.5:1 olacak şekilde seçildi;
 * tests/theme.test.ts bu oranları otomatik denetler.
 */
export type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  hero: string;
  heroText: string;
  heroMuted: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  onPrimary: string;
  gold: string;
  goldOnHero: string;
  danger: string;
  success: string;
  tabBar: string;
  focus: string;
};

export const light: Palette = {
  bg: '#F7F3EA', // kırık beyaz
  surface: '#FFFDF8',
  surfaceAlt: '#EFE8D8',
  hero: '#0B3D2E', // koyu zümrüt
  heroText: '#F7F3EA',
  heroMuted: '#B9CCBF',
  text: '#16231D',
  textMuted: '#4F5E56',
  border: '#DDD3BE',
  primary: '#0E5A43',
  onPrimary: '#FFFFFF',
  gold: '#8A6A1F', // metin olarak kullanılabilen koyu altın
  goldOnHero: '#D9B45B',
  danger: '#A8322B',
  success: '#1F6B4A',
  tabBar: '#FFFDF8',
  focus: '#C9A54B',
};

export const dark: Palette = {
  bg: '#08140F',
  surface: '#10211A',
  surfaceAlt: '#173027',
  hero: '#0E3A2C',
  heroText: '#F3EEE2',
  heroMuted: '#A9BFB2',
  text: '#EDE8DC',
  textMuted: '#A7B3AC',
  border: '#24402F',
  primary: '#5CC39A',
  onPrimary: '#06140E',
  gold: '#D9B45B',
  goldOnHero: '#E2C06E',
  danger: '#F08A80',
  success: '#7BD3A8',
  tabBar: '#0C1A14',
  focus: '#D9B45B',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;

export const type = {
  display: { fontSize: 40, lineHeight: 46, fontWeight: '300' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600' as const },
  heading: { fontSize: 17, lineHeight: 23, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const, letterSpacing: 0.2 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  mono: { fontSize: 17, lineHeight: 22, fontWeight: '500' as const, fontVariant: ['tabular-nums' as const] },
};

/** Minimum dokunma alanı (Android 48dp, iOS 44pt) */
export const MIN_TOUCH = 48;

// ---- kontrast hesabı (testlerde kullanılır) ----
function channel(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
export function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

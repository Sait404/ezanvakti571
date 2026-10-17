import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { type as typeScale } from '../theme/tokens';

type Variant = keyof typeof typeScale;
type Tone = 'default' | 'muted' | 'gold' | 'hero' | 'heroMuted' | 'primary' | 'danger' | 'onPrimary';

export type AppTextProps = TextProps & { variant?: Variant; tone?: Tone; align?: TextStyle['textAlign']; weight?: TextStyle['fontWeight'] };

/**
 * Uygulama içi yazı ölçeği (Ayarlar > Yazı boyutu) ile sistem erişilebilirlik ölçeğini birlikte uygular.
 * Sistem ölçeği aşırı büyüdüğünde düzen bozulmasın diye maxFontSizeMultiplier sınırlanır.
 */
export function AppText({ variant = 'body', tone = 'default', align, weight, style, ...rest }: AppTextProps) {
  const { colors, fontScale } = useTheme();
  const base = typeScale[variant];
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    gold: colors.gold,
    hero: colors.heroText,
    heroMuted: colors.heroMuted,
    primary: colors.primary,
    danger: colors.danger,
    onPrimary: colors.onPrimary,
  }[tone];
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        base,
        { fontSize: base.fontSize * fontScale, lineHeight: base.lineHeight * fontScale, color },
        align ? { textAlign: align } : null,
        weight ? { fontWeight: weight } : null,
        style,
      ]}
    />
  );
}

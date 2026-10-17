import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { MIN_TOUCH, radius, spacing } from '../theme/tokens';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export function Screen({ children, scroll = true, edges = ['top'] as const, contentStyle }: { children: ReactNode; scroll?: boolean; edges?: readonly ('top' | 'bottom')[]; contentStyle?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={[{ padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.lg }, contentStyle]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, tone = 'surface' }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'surface' | 'alt' }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: tone === 'alt' ? colors.surfaceAlt : colors.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm }}>
      <AppText variant="label" tone="muted" accessibilityRole="header" style={{ textTransform: 'uppercase', letterSpacing: 1.2 }}>
        {children}
      </AppText>
      {action}
    </View>
  );
}

export function Button({
  label,
  onPress,
  icon,
  kind = 'primary',
  disabled,
  accessibilityHint,
  compact,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  accessibilityHint?: string;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const bg = { primary: colors.primary, secondary: colors.surfaceAlt, ghost: 'transparent', danger: 'transparent' }[kind];
  const fg = { primary: colors.onPrimary, secondary: colors.text, ghost: colors.primary, danger: colors.danger }[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        minHeight: compact ? 40 : MIN_TOUCH,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.pill,
        backgroundColor: bg,
        borderWidth: kind === 'danger' || kind === 'ghost' ? 1 : 0,
        borderColor: kind === 'danger' ? colors.danger : colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
      })}
    >
      {icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <AppText variant="label" style={{ color: fg, fontWeight: '600' }} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function ListRow({
  title,
  subtitle,
  icon,
  onPress,
  right,
  accessibilityLabel,
  disabled,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  onPress?: () => void;
  right?: ReactNode;
  accessibilityLabel?: string;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const content = (
    <>
      {icon ? (
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={20} color={colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="body" weight="500" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted" numberOfLines={3}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron" size={18} color={colors.textMuted} /> : null)}
    </>
  );
  const style = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.md, minHeight: 56, paddingVertical: spacing.sm, opacity: disabled ? 0.5 : 1 };
  if (!onPress) return <View style={style} accessible accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join(', ')}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join(', ')}
      style={({ pressed }) => [style, { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'official' | 'warning' }) {
  const { colors } = useTheme();
  const map = {
    neutral: { bg: colors.surfaceAlt, fg: colors.textMuted },
    official: { bg: colors.surfaceAlt, fg: colors.success },
    warning: { bg: colors.surfaceAlt, fg: colors.gold },
  }[tone];
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: map.bg, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4 }}>
      <AppText variant="caption" style={{ color: map.fg, fontWeight: '600' }}>
        {label}
      </AppText>
    </View>
  );
}

export type StateKind = 'loading' | 'empty' | 'offline' | 'error' | 'permission' | 'comingSoon';

const STATE_ICON: Record<Exclude<StateKind, 'loading'>, IconName> = {
  empty: 'search',
  offline: 'cloudOff',
  error: 'info',
  permission: 'pin',
  comingSoon: 'sparkle',
};

/** Yükleniyor / boş / çevrimdışı / hata / izin reddi / hazırlanıyor durumları için ortak ekran. */
export function StateView({ kind, title, message, action }: { kind: StateKind; title: string; message?: string; action?: { label: string; onPress: () => void } }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md }} accessibilityLiveRegion="polite">
      {kind === 'loading' ? (
        <ActivityIndicator color={colors.primary} size="large" />
      ) : (
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={STATE_ICON[kind]} size={28} color={kind === 'error' ? colors.danger : colors.gold} />
        </View>
      )}
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText tone="muted" align="center">
          {message}
        </AppText>
      ) : null}
      {action ? <Button label={action.label} onPress={action.onPress} kind="secondary" /> : null}
    </View>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 4, gap: 4 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={o.label}
            style={{ flexGrow: 1, minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? colors.surface : 'transparent' }}
          >
            <AppText variant="label" style={{ color: active ? colors.primary : colors.textMuted, fontWeight: active ? '700' : '500' }}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

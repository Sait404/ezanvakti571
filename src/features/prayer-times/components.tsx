import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { GeometricMotif } from '../../components/GeometricMotif';
import { Icon } from '../../components/Icon';
import { Badge } from '../../components/ui';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import { formatCountdown, formatDateKeyTr, formatDurationSpoken, formatHM } from '../../utils/time';
import type { NextPrayerInfo } from './next';
import { PRAYER_KEYS, PRAYER_LABEL, type DayTimes } from './types';

export function NextPrayerHero({
  info,
  placeTitle,
  placeSubtitle,
  approximate,
  onPressLocation,
  timeZone,
}: {
  info: NextPrayerInfo;
  placeTitle: string;
  placeSubtitle: string;
  approximate: boolean;
  onPressLocation: () => void;
  timeZone: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.hero, { backgroundColor: colors.hero }]}>
      <View style={styles.motif} pointerEvents="none">
        <GeometricMotif color={colors.goldOnHero} size={230} />
      </View>
      <Pressable
        onPress={onPressLocation}
        accessibilityRole="button"
        accessibilityLabel={`Seçili konum: ${placeTitle}, ${placeSubtitle}. Değiştirmek için dokunun.`}
        style={({ pressed }) => [styles.locChip, { borderColor: colors.goldOnHero, opacity: pressed ? 0.7 : 1 }]}
      >
        <Icon name="pin" size={16} color={colors.goldOnHero} />
        <View style={{ flexShrink: 1 }}>
          <AppText variant="label" tone="hero" numberOfLines={1}>
            {placeTitle}
          </AppText>
          <AppText variant="caption" tone="heroMuted" numberOfLines={1}>
            {placeSubtitle}
            {approximate ? ' · yaklaşık konum' : ''}
          </AppText>
        </View>
      </Pressable>

      <View
        accessible
        accessibilityLabel={`Sıradaki vakit ${PRAYER_LABEL[info.next]}, saat ${formatHM(info.nextAt, timeZone)}. Kalan süre ${formatDurationSpoken(info.remainingMs)}.`}
        style={{ gap: 2 }}
      >
        <AppText variant="label" style={{ color: colors.goldOnHero, letterSpacing: 2, textTransform: 'uppercase' }}>
          {info.nextIsTomorrow ? 'Yarın · ' : ''}
          {PRAYER_LABEL[info.next]} vaktine
        </AppText>
        <AppText variant="display" tone="hero" style={{ fontVariant: ['tabular-nums'] }} accessibilityElementsHidden>
          {formatCountdown(info.remainingMs)}
        </AppText>
        <AppText variant="body" tone="heroMuted">
          {PRAYER_LABEL[info.next]} {formatHM(info.nextAt, timeZone)} · şu an {PRAYER_LABEL[info.current].toLocaleLowerCase('tr-TR')} vakti
        </AppText>
      </View>
    </View>
  );
}

export function DayTimesList({ day, highlight }: { day: DayTimes; highlight?: (typeof PRAYER_KEYS)[number] }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 2 }}>
      {PRAYER_KEYS.map((k) => {
        const active = k === highlight;
        return (
          <View
            key={k}
            accessible
            accessibilityLabel={`${PRAYER_LABEL[k]} ${formatHM(day.times[k], day.timeZone)}${active ? ', sıradaki vakit' : ''}`}
            style={[
              styles.timeRow,
              { borderRadius: radius.md },
              active ? { backgroundColor: colors.surfaceAlt, borderLeftColor: colors.gold, borderLeftWidth: 3 } : { borderLeftWidth: 3, borderLeftColor: 'transparent' },
            ]}
          >
            <AppText variant="body" weight={active ? '700' : '500'}>
              {PRAYER_LABEL[k]}
            </AppText>
            <AppText variant="mono" weight={active ? '700' : '500'} tone={active ? 'primary' : 'default'}>
              {formatHM(day.times[k], day.timeZone)}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

export function SourceNote({ day, usedCache, offline, updatedAt }: { day: DayTimes; usedCache?: boolean; offline?: boolean; updatedAt?: Date }) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const official = day.source.kind === 'diyanet';
  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Vakit kaynağı: ${day.source.label}. Ayrıntılar için dokunun.`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}
      >
        <Badge label={official ? 'Diyanet verisi' : 'Hesaplanan vakit'} tone={official ? 'official' : 'warning'} />
        {usedCache ? <Badge label={offline ? 'Çevrimdışı · kayıtlı veri' : 'Kayıtlı veri'} /> : null}
        <Icon name="info" size={16} color={colors.textMuted} />
      </Pressable>
      {open ? (
        <View style={{ gap: 4 }}>
          <AppText variant="caption" tone="muted">
            {day.source.label}
          </AppText>
          {day.source.kind === 'calculated' ? (
            <AppText variant="caption" tone="muted">
              Yöntem: {day.source.method}. Diyanet'in yayımladığı vakitlerle 1–2 dakikaya kadar fark olabilir. Resmî vakitler için sunucu bağlantısı yapılandırıldığında Diyanet verisi kullanılır.
            </AppText>
          ) : (
            <AppText variant="caption" tone="muted">
              Alınma zamanı: {new Date(day.source.fetchedAt).toLocaleString('tr-TR')}
            </AppText>
          )}
          {updatedAt ? (
            <AppText variant="caption" tone="muted">
              Son güncelleme: {updatedAt.toLocaleString('tr-TR')} · Tarih: {formatDateKeyTr(day.dateKey)}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg, overflow: 'hidden' },
  motif: { position: 'absolute', right: -60, top: -40 },
  locChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start', borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: spacing.md, maxWidth: '100%', minHeight: 44 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: spacing.md, minHeight: 44 },
});

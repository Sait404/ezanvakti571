import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, Share, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Icon, type IconName } from '../../components/Icon';
import { Button, Card, Screen, SectionTitle, StateView } from '../../components/ui';
import { dhikrStore, totals } from '../../features/dhikr/store';
import { locationLabel } from '../../features/locations/data';
import { locationStore } from '../../features/locations/store';
import { reschedule, notificationStore } from '../../features/notifications/scheduler';
import { DayTimesList, NextPrayerHero, SourceNote } from '../../features/prayer-times/components';
import { findNextPrayer } from '../../features/prayer-times/next';
import { shareText } from '../../features/prayer-times/share';
import { useNow, usePrayerTimes } from '../../features/prayer-times/usePrayerTimes';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import { useStore } from '../../utils/persistedStore';
import { formatDateKeyTr } from '../../utils/time';
import { APP_NAME } from '../../config';

function QuickAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexBasis: '22%',
        flexGrow: 1,
        minWidth: 72,
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Icon name={icon} size={24} color={colors.primary} />
      <AppText variant="caption" weight="600" align="center" numberOfLines={2}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const selected = useStore(locationStore, (s) => s.selected);
  const prayer = usePrayerTimes(selected, 7);
  const now = useNow(1000);
  const dhikr = useStore(dhikrStore, (s) => s);
  const notifEnabled = useStore(notificationStore, (s) => s.enabled);
  const label = selected ? locationLabel(selected) : null;

  // Vakitler ya da konum değişince bildirim planını yenile (eski planlar iptal edilir).
  useEffect(() => {
    if (prayer.status === 'ready' && label && notifEnabled) void reschedule(prayer.days, label.title).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prayer.status === 'ready' ? prayer.loadedAt.getTime() : 0, notifEnabled]);

  const next = useMemo(() => (prayer.status === 'ready' ? findNextPrayer(now, prayer.days[0], prayer.days[1]) : null), [prayer, now]);
  const dhikrTotals = totals(dhikr, now);

  if (!selected) {
    return (
      <Screen>
        <View style={{ gap: spacing.xs, marginTop: spacing.lg }}>
          <AppText variant="title" accessibilityRole="header">
            {APP_NAME}
          </AppText>
          <AppText tone="muted">Namaz vakitleri ve ibadet yardımcınız.</AppText>
        </View>
        <Card>
          <StateView
            kind="permission"
            title="Önce konumunuzu seçin"
            message="Vakitler seçtiğiniz il, ilçe, mahalle ya da köye göre gösterilir. GPS kullanmak zorunda değilsiniz; listeden de seçebilirsiniz."
            action={{ label: 'Konum seç', onPress: () => router.push('/location') }}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
        <AppText variant="heading" accessibilityRole="header">
          {APP_NAME}
        </AppText>
        {prayer.status === 'ready' ? (
          <AppText variant="caption" tone="muted">
            {formatDateKeyTr(prayer.todayKey, { weekday: true })}
          </AppText>
        ) : null}
      </View>

      {prayer.status === 'loading' || prayer.status === 'idle' ? <StateView kind="loading" title="Vakitler hazırlanıyor" /> : null}
      {prayer.status === 'error' ? (
        <Card>
          <StateView kind="error" title="Vakitler gösterilemedi" message={prayer.message} action={{ label: 'Tekrar dene', onPress: prayer.reload }} />
        </Card>
      ) : null}

      {prayer.status === 'ready' && next && label ? (
        <>
          <NextPrayerHero
            info={next}
            placeTitle={label.title}
            placeSubtitle={label.subtitle}
            approximate={selected.quality === 'province_center'}
            onPressLocation={() => router.push('/location')}
            timeZone={selected.timeZone}
          />
          <Card>
            <DayTimesList day={prayer.days[0]} highlight={next.nextIsTomorrow ? undefined : next.next} />
            <SourceNote day={prayer.days[0]} usedCache={prayer.usedCache} offline={prayer.offlineFallback} updatedAt={prayer.loadedAt} />
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              <Button kind="secondary" compact icon="calendar" label="Haftalık / aylık" onPress={() => router.push('/prayer-calendar')} />
              <Button
                kind="ghost"
                compact
                icon="share"
                label="Paylaş"
                onPress={() => void Share.share({ message: shareText(prayer.days[0], `${label.title}, ${label.subtitle}`) })}
              />
            </View>
          </Card>
        </>
      ) : null}

      <SectionTitle>Kısayollar</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <QuickAction icon="beads" label="Tesbih" onPress={() => router.push('/tesbih')} />
        <QuickAction icon="compass" label="Kıble" onPress={() => router.push('/qibla')} />
        <QuickAction icon="calendar" label="Takvim" onPress={() => router.push('/prayer-calendar')} />
        <QuickAction icon="bell" label="Bildirim" onPress={() => router.push('/notifications')} />
      </View>

      <SectionTitle>Bugünkü özetiniz</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', gap: spacing.lg }}>
          <View style={{ flex: 1 }}>
            <AppText variant="title">{dhikrTotals.today}</AppText>
            <AppText variant="caption" tone="muted">
              bugün kaydettiğiniz zikir
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="title">{dhikrTotals.last7}</AppText>
            <AppText variant="caption" tone="muted">
              son 7 gün
            </AppText>
          </View>
        </View>
        <AppText variant="caption" tone="muted">
          Bu sayılar yalnızca sizin kendi kaydınızdır ve yalnızca bu cihazda tutulur.
        </AppText>
      </Card>

      <SectionTitle>Günün ayeti ve duası</SectionTitle>
      <Card tone="alt">
        <AppText variant="body" weight="600">
          Doğrulanmış kaynak bağlantısı bekleniyor
        </AppText>
        <AppText variant="caption" tone="muted">
          Ayet ve dua metinleri yalnızca kaynağı ve lisansı doğrulanmış veri setlerinden gösterilecek; bu sürümde henüz eklenmedi. Yapay zekâ ile metin üretilmez.
        </AppText>
      </Card>
    </Screen>
  );
}

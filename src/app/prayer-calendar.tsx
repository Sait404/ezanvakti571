import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Button, Segmented, StateView } from '../components/ui';
import { locationLabel } from '../features/locations/data';
import { locationStore } from '../features/locations/store';
import { getPrayerTimesRange } from '../features/prayer-times/service';
import { PRAYER_KEYS, PRAYER_LABEL, type DayTimes } from '../features/prayer-times/types';
import { settingsStore } from '../features/settings/store';
import { config } from '../config';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing } from '../theme/tokens';
import { useStore } from '../utils/persistedStore';
import { defaultStorage } from '../utils/storage';
import { dateKeyOf, daysInMonth, formatHM, monthNameTr, parseDateKey, toDateKey, weekdayNameTr } from '../utils/time';

type Mode = 'week' | 'month';

export default function PrayerCalendar() {
  const router = useRouter();
  const { colors } = useTheme();
  const loc = useStore(locationStore, (s) => s.selected);
  const asr = useStore(settingsStore, (s) => s.asrMethod);
  const [mode, setMode] = useState<Mode>('week');
  const today = loc ? dateKeyOf(new Date(), loc.timeZone) : '';
  const t = today ? parseDateKey(today) : { year: 2026, month: 1, day: 1 };
  const [ym, setYm] = useState({ y: t.year, m: t.month });
  const start = mode === 'week' ? today : toDateKey(ym.y, ym.m, 1);
  const count = mode === 'week' ? 7 : daysInMonth(ym.y, ym.m);
  const reqKey = loc ? `${loc.id}|${asr}|${start}|${count}` : '';
  const [result, setResult] = useState<{ key: string; days?: DayTimes[]; error?: string } | null>(null);

  useEffect(() => {
    if (!loc) return;
    let alive = true;
    getPrayerTimesRange(loc, start, count, { asr }, { apiBaseUrl: config.apiBaseUrl, fetchImpl: fetch, storage: defaultStorage })
      .then((r) => alive && setResult({ key: reqKey, days: r.days }))
      .catch((e: unknown) => alive && setResult({ key: reqKey, error: e instanceof Error ? e.message : 'Hata' }));
    return () => {
      alive = false;
    };
  }, [loc, asr, start, count, reqKey]);

  const current = result?.key === reqKey ? result : null;
  const days = current?.days ?? null;
  const error = current?.error ?? null;

  if (!loc) {
    return <StateView kind="permission" title="Konum seçilmedi" action={{ label: 'Konum seç', onPress: () => router.replace('/location') }} />;
  }
  const lab = locationLabel(loc);
  const shiftMonth = (d: number) => setYm(({ y, m }) => {
    const n = m + d;
    return n < 1 ? { y: y - 1, m: 12 } : n > 12 ? { y: y + 1, m: 1 } : { y, m: n };
  });
  const anyCalculated = days?.some((d) => d.source.kind === 'calculated');

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={days ?? []}
        keyExtractor={(d) => d.dateKey}
        contentContainerStyle={{ padding: spacing.lg, gap: 2 }}
        stickyHeaderIndices={[0]}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.bg }}>
            <AppText variant="heading">{lab.title}</AppText>
            <AppText variant="caption" tone="muted">{lab.subtitle}</AppText>
            <Segmented label="Görünüm" value={mode} onChange={setMode} options={[{ value: 'week', label: 'Haftalık' }, { value: 'month', label: 'Aylık / yıllık' }]} />
            {mode === 'month' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Button kind="ghost" compact icon="back" label="Önceki" onPress={() => shiftMonth(-1)} />
                <AppText variant="heading" accessibilityLiveRegion="polite">
                  {monthNameTr(ym.m)} {ym.y}
                </AppText>
                <Button kind="ghost" compact icon="chevron" label="Sonraki" onPress={() => shiftMonth(1)} />
              </View>
            ) : null}
            {anyCalculated ? (
              <AppText variant="caption" tone="gold">
                Bu tablodaki vakitler cihazda hesaplanmıştır; resmî Diyanet verisi değildir.
              </AppText>
            ) : null}
            <View style={{ flexDirection: 'row', paddingHorizontal: spacing.sm }} accessibilityElementsHidden>
              <AppText variant="caption" tone="muted" style={{ width: 64 }}>Gün</AppText>
              {PRAYER_KEYS.map((k) => (
                <AppText key={k} variant="caption" tone="muted" style={{ flex: 1, textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {PRAYER_LABEL[k]}
                </AppText>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={error ? <StateView kind="error" title="Takvim yüklenemedi" message={error} /> : <StateView kind="loading" title="Hazırlanıyor" />}
        renderItem={({ item }) => {
          const isToday = item.dateKey === today;
          const { day } = parseDateKey(item.dateKey);
          return (
            <View
              accessible
              accessibilityLabel={`${day} ${monthNameTr(parseDateKey(item.dateKey).month)} ${weekdayNameTr(item.dateKey)}: ${PRAYER_KEYS.map((k) => `${PRAYER_LABEL[k]} ${formatHM(item.times[k], item.timeZone)}`).join(', ')}`}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: spacing.sm, borderRadius: radius.sm, backgroundColor: isToday ? colors.surfaceAlt : 'transparent' }}
            >
              <View style={{ width: 64 }}>
                <AppText variant="label" weight={isToday ? '700' : '500'}>{day}</AppText>
                <AppText variant="caption" tone="muted">{weekdayNameTr(item.dateKey, true)}</AppText>
              </View>
              {PRAYER_KEYS.map((k) => (
                <AppText key={k} variant="caption" style={{ flex: 1, textAlign: 'center', fontVariant: ['tabular-nums'] }} weight={isToday ? '700' : '400'}>
                  {formatHM(item.times[k], item.timeZone)}
                </AppText>
              ))}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { AppText } from '../components/AppText';
import { Button, Card } from '../components/ui';
import { addCounter, dhikrStore, increment, removeCounter, resetActive, totals } from '../features/dhikr/store';
import { settingsStore } from '../features/settings/store';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing } from '../theme/tokens';
import { useStore } from '../utils/persistedStore';

function Ring({ progress, size, color, track }: { progress: number; size: number; color: string; track: string }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} style={{ position: 'absolute' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={6} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={6}
        fill="none"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={c * (1 - Math.min(1, progress))}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

export default function TesbihScreen() {
  const { colors } = useTheme();
  const state = useStore(dhikrStore, (s) => s);
  const haptics = useStore(settingsStore, (s) => s.haptics);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('33');
  const active = state.counters.find((c) => c.id === state.activeId) ?? state.counters[0];
  const t = totals(state, new Date());
  const SIZE = 260;

  const tap = () => {
    const { next, result } = increment(dhikrStore.get(), new Date());
    dhikrStore.set(() => next);
    if (!haptics) return;
    if (result.reachedTarget) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const confirmReset = () =>
    Alert.alert('Sayacı sıfırla', `"${active.name}" sayacı 0'a dönecek. Günlük toplamlarınız korunur.`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sıfırla', style: 'destructive', onPress: () => dhikrStore.set((s) => resetActive(s)) },
    ]);

  const reached = active.target > 0 && active.count >= active.target;

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {state.counters.map((c) => {
            const on = c.id === state.activeId;
            return (
              <Pressable
                key={c.id}
                onPress={() => dhikrStore.set({ activeId: c.id })}
                onLongPress={() =>
                  c.id.startsWith('c') &&
                  Alert.alert('Zikri sil', `"${c.name}" silinsin mi?`, [
                    { text: 'Vazgeç', style: 'cancel' },
                    { text: 'Sil', style: 'destructive', onPress: () => dhikrStore.set((s) => removeCounter(s, c.id)) },
                  ])
                }
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${c.name}, ${c.count} sayım`}
                style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.surfaceAlt : colors.surface }}
              >
                <AppText variant="label" style={{ color: on ? colors.primary : colors.text, fontWeight: on ? '700' : '500' }}>
                  {c.name}
                </AppText>
              </Pressable>
            );
          })}
          <Pressable onPress={() => setAdding(true)} accessibilityRole="button" accessibilityLabel="Özel zikir ekle" style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border }}>
            <AppText variant="label" tone="primary">+ Ekle</AppText>
          </Pressable>
        </ScrollView>

        {adding ? (
          <Card>
            <AppText variant="heading">Özel zikir</AppText>
            <TextInput value={name} onChangeText={setName} placeholder="Zikir adı" placeholderTextColor={colors.textMuted} accessibilityLabel="Zikir adı" maxLength={60} style={{ minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text }} />
            <TextInput value={target} onChangeText={(v) => setTarget(v.replace(/\D/g, ''))} placeholder="Hedef (0 = hedefsiz)" placeholderTextColor={colors.textMuted} keyboardType="number-pad" accessibilityLabel="Hedef sayı" style={{ minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text }} />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                label="Kaydet"
                onPress={() => {
                  try {
                    dhikrStore.set((s) => addCounter(s, name, Number(target)));
                    setAdding(false);
                    setName('');
                  } catch (e) {
                    Alert.alert('Eklenemedi', e instanceof Error ? e.message : '');
                  }
                }}
              />
              <Button kind="ghost" label="Vazgeç" onPress={() => setAdding(false)} />
            </View>
          </Card>
        ) : null}

        <View style={{ alignItems: 'center' }}>
          <Pressable
            onPress={tap}
            accessibilityRole="button"
            accessibilityLabel={`${active.name}. Sayım ${active.count}${active.target ? `, hedef ${active.target}` : ''}. Saymak için dokunun.`}
            style={({ pressed }) => ({ width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.hero, transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            <Ring progress={active.target ? active.count / active.target : 0} size={SIZE} color={colors.goldOnHero} track={colors.primary} />
            <AppText variant="display" tone="hero" style={{ fontSize: 64, lineHeight: 72, fontVariant: ['tabular-nums'] }}>
              {active.count}
            </AppText>
            <AppText variant="label" tone="heroMuted">
              {active.target ? `hedef ${active.target}` : 'hedefsiz'}
            </AppText>
          </Pressable>
          {reached ? (
            <AppText variant="label" tone="gold" style={{ marginTop: spacing.md }} accessibilityLiveRegion="assertive">
              Hedefinize ulaştınız.
            </AppText>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' }}>
          <Button kind="danger" compact icon="refresh" label="Sıfırla" onPress={confirmReset} />
        </View>

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText>Titreşim</AppText>
            <Switch value={haptics} onValueChange={(v) => settingsStore.set({ haptics: v })} accessibilityLabel="Titreşim" trackColor={{ true: colors.primary, false: colors.border }} />
          </View>
          <AppText variant="caption" tone="muted">
            Sesli sayım bu sürümde yok; yalnızca titreşim desteklenir.
          </AppText>
          <View style={{ flexDirection: 'row', gap: spacing.lg }}>
            <View style={{ flex: 1 }}>
              <AppText variant="title">{t.today}</AppText>
              <AppText variant="caption" tone="muted">bugün (tüm zikirler)</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="title">{t.last7}</AppText>
              <AppText variant="caption" tone="muted">son 7 gün</AppText>
            </View>
          </View>
          <AppText variant="caption" tone="muted">
            Bu sayaç yalnızca sizin kendi kaydınızdır; uygulama ibadetin yapıldığını doğrulamaz. Veriler yalnızca bu cihazda tutulur ve her dokunuşta kaydedilir. Hedef sayıları size aittir; herhangi bir fazilet iddiası içermez.
          </AppText>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

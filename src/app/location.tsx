import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Icon } from '../components/Icon';
import { Button, Divider, ListRow, StateView } from '../components/ui';
import { districtsOf, getProvince, locationFromDistrict, locationLabel, locationsMeta, provincesSorted, settlementsOf } from '../features/locations/data';
import { locateOnce } from '../features/locations/gps';
import { foldTr } from '../features/locations/normalize';
import { disambiguationLabel, searchLocations, type SearchResult } from '../features/locations/search';
import { isFavorite, locationStore, selectLocation, toggleFavorite } from '../features/locations/store';
import { SETTLEMENT_TYPE_LABEL, type District, type SelectedLocation } from '../features/locations/types';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing } from '../theme/tokens';
import { useStore } from '../utils/persistedStore';

type Step = { level: 'provinces' } | { level: 'districts'; code: string } | { level: 'settlements'; district: District };

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function LocationPicker() {
  const router = useRouter();
  const { colors, fontScale } = useTheme();
  const state = useStore(locationStore, (s) => s);
  const [query, setQuery] = useState('');
  const [step, setStep] = useState<Step>({ level: 'provinces' });
  const [filter, setFilter] = useState('');
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);
  const debounced = useDebounced(query, 250);

  const results = useMemo(() => (debounced.trim().length >= 2 ? searchLocations(debounced, { limit: 60 }) : null), [debounced]);

  const choose = (loc: SelectedLocation) => {
    selectLocation(loc);
    router.back();
  };

  const onGps = async () => {
    setGpsBusy(true);
    setGpsMsg(null);
    const r = await locateOnce();
    setGpsBusy(false);
    if (r.ok) choose(r.location);
    else setGpsMsg(r.message);
  };

  const fromResult = (r: SearchResult) => {
    if (r.kind === 'province') {
      setQuery('');
      setStep({ level: 'districts', code: r.province.code });
    } else if (r.kind === 'district') choose(locationFromDistrict(r.district));
    else choose(locationFromDistrict(r.district, r.settlement));
  };

  const header = (
    <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md }}>
        <Icon name="search" size={20} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="İl, ilçe, mahalle, köy veya posta kodu"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Konum ara"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={{ flex: 1, minHeight: 48, color: colors.text, fontSize: 16 * fontScale }}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Aramayı temizle" hitSlop={12}>
            <Icon name="close" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {!results ? (
        <View style={{ gap: spacing.sm }}>
          <Button kind="secondary" icon="gps" label={gpsBusy ? 'Konum alınıyor…' : 'Bulunduğum yeri kullan (GPS)'} onPress={onGps} disabled={gpsBusy} accessibilityHint="Konum izni ister. İzin vermeseniz de listeden seçebilirsiniz." />
          {gpsMsg ? (
            <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
              {gpsMsg}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const savedRow = (l: SelectedLocation, kind: 'fav' | 'recent') => {
    const lab = locationLabel(l);
    const fav = isFavorite(state, l.id);
    return (
      <ListRow
        key={`${kind}-${l.id}`}
        icon={kind === 'fav' ? 'starFilled' : 'clock'}
        title={lab.title}
        subtitle={lab.subtitle}
        onPress={() => choose(l)}
        right={
          <Pressable onPress={() => toggleFavorite(l)} hitSlop={12} accessibilityRole="button" accessibilityLabel={fav ? `${lab.title} favorilerden çıkar` : `${lab.title} favorilere ekle`} style={{ padding: spacing.sm }}>
            <Icon name={fav ? 'starFilled' : 'star'} size={20} color={colors.gold} />
          </Pressable>
        }
      />
    );
  };

  // ---------- arama sonuçları ----------
  if (results) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
        {header}
        <FlatList
          data={results}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.lg }}
          ItemSeparatorComponent={Divider}
          keyExtractor={(r, i) => `${r.kind}-${i}-${r.kind === 'settlement' ? r.settlement.name : ''}`}
          ListEmptyComponent={<StateView kind="empty" title="Sonuç bulunamadı" message="Yazımı kontrol edin; Türkçe karakter kullanmadan da arayabilirsiniz (ör. 'sisli')." />}
          renderItem={({ item }) => (
            <ListRow
              icon={item.kind === 'settlement' ? 'pin' : item.kind === 'district' ? 'home' : 'compass'}
              title={item.kind === 'province' ? item.province.name : item.kind === 'district' ? item.district.name : item.settlement.name}
              subtitle={`${item.kind === 'settlement' ? SETTLEMENT_TYPE_LABEL[item.settlement.type] + ' · ' : ''}${disambiguationLabel(item)}`}
              onPress={() => fromResult(item)}
            />
          )}
        />
      </SafeAreaView>
    );
  }

  // ---------- hiyerarşik gezinme ----------
  if (step.level === 'provinces') {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
        <FlatList
          data={provincesSorted}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={{ gap: spacing.md }}>
              {header}
              <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xs }}>
                {state.favorites.length ? <AppText variant="label" tone="muted">FAVORİLER</AppText> : null}
                {state.favorites.map((l) => savedRow(l, 'fav'))}
                {state.recents.length ? <AppText variant="label" tone="muted" style={{ marginTop: spacing.sm }}>SON SEÇİLENLER</AppText> : null}
                {state.recents.filter((r) => !isFavorite(state, r.id)).map((l) => savedRow(l, 'recent'))}
                <AppText variant="label" tone="muted" style={{ marginTop: spacing.md }}>
                  İLLER ({locationsMeta.counts.provinces})
                </AppText>
              </View>
            </View>
          }
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          ItemSeparatorComponent={() => <View style={{ marginHorizontal: spacing.lg }}><Divider /></View>}
          keyExtractor={(p) => p.code}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: spacing.lg }}>
              <ListRow title={item.name} subtitle={`${item.code} · ${districtsOf(item.code).length} ilçe`} onPress={() => setStep({ level: 'districts', code: item.code })} />
            </View>
          )}
        />
      </SafeAreaView>
    );
  }

  if (step.level === 'districts') {
    const p = getProvince(step.code)!;
    const list = districtsOf(step.code);
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
        <FlatList
          data={list}
          ListHeaderComponent={
            <View style={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
              <Button kind="ghost" compact icon="back" label="İllere dön" onPress={() => setStep({ level: 'provinces' })} />
              <AppText variant="title" accessibilityRole="header">
                {p.name}
              </AppText>
              <AppText variant="caption" tone="muted">
                İlçeyi seçerek doğrudan kaydedebilir ya da mahalle/köy listesini açabilirsiniz.
              </AppText>
            </View>
          }
          contentContainerStyle={{ padding: spacing.lg }}
          ItemSeparatorComponent={Divider}
          keyExtractor={(d) => String(d.index)}
          renderItem={({ item }) => (
            <ListRow
              title={item.name === 'Merkez' ? `${p.name} Merkez` : item.name}
              subtitle={`${item.settlementCount} mahalle/köy${item.quality === 'province_center' ? ' · koordinat yaklaşık (il merkezi)' : ''}`}
              onPress={() => {
                setFilter('');
                setStep({ level: 'settlements', district: item });
              }}
            />
          )}
        />
      </SafeAreaView>
    );
  }

  const d = step.district;
  const p = getProvince(d.provinceCode)!;
  const all = settlementsOf(d.index);
  const f = foldTr(filter);
  const shown = f ? all.filter((s) => foldTr(`${s.name} ${s.parent}`).includes(f)) : all;
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={shown}
        initialNumToRender={20}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
            <Button kind="ghost" compact icon="back" label={`${p.name} ilçelerine dön`} onPress={() => setStep({ level: 'districts', code: p.code })} />
            <AppText variant="title" accessibilityRole="header">
              {d.name === 'Merkez' ? `${p.name} Merkez` : d.name}
            </AppText>
            <Button label="İlçenin tamamını seç" icon="check" onPress={() => choose(locationFromDistrict(d))} />
            <TextInput
              value={filter}
              onChangeText={setFilter}
              placeholder={`${all.length} yerleşim içinde ara`}
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Mahalle veya köy filtrele"
              style={{ minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, color: colors.text, backgroundColor: colors.surface, fontSize: 16 * fontScale }}
            />
            <AppText variant="caption" tone="muted">
              Not: Mahalle ve köylerde vakit, bağlı oldukları ilçe merkezinin koordinatına göre gösterilir.
            </AppText>
          </View>
        }
        contentContainerStyle={{ padding: spacing.lg }}
        ItemSeparatorComponent={Divider}
        keyExtractor={(s, i) => `${s.name}-${s.parent}-${i}`}
        ListEmptyComponent={<StateView kind="empty" title="Eşleşen yerleşim yok" />}
        renderItem={({ item }) => (
          <ListRow title={item.name} subtitle={[SETTLEMENT_TYPE_LABEL[item.type], item.parent, item.postalCodes.join(', ')].filter(Boolean).join(' · ')} onPress={() => choose(locationFromDistrict(d, item))} />
        )}
      />
    </SafeAreaView>
  );
}

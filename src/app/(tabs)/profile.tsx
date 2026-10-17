import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Alert, Share, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button, Card, Divider, ListRow, Screen, SectionTitle, Segmented } from '../../components/ui';
import { APP_NAME } from '../../config';
import { dhikrStore } from '../../features/dhikr/store';
import { locationLabel } from '../../features/locations/data';
import { locationStore } from '../../features/locations/store';
import { notificationStore, reschedule } from '../../features/notifications/scheduler';
import { ASR_METHOD_LABEL, type AsrMethod } from '../../features/prayer-times/types';
import { FONT_SCALES, settingsStore, type FontScale, type ThemeMode } from '../../features/settings/store';
import { spacing } from '../../theme/tokens';
import { useStore } from '../../utils/persistedStore';
import { exportAllLocalData, wipeAllLocalData } from '../../utils/storage';

export default function ProfileTab() {
  const router = useRouter();
  const settings = useStore(settingsStore, (s) => s);
  const loc = useStore(locationStore, (s) => s.selected);
  const lab = loc ? locationLabel(loc) : null;

  const exportData = async () => {
    const data = await exportAllLocalData();
    await Share.share({ title: `${APP_NAME} verilerim`, message: JSON.stringify({ app: APP_NAME, exportedAt: new Date().toISOString(), data }, null, 2) });
  };

  const wipe = () =>
    Alert.alert('Tüm verileri sil', 'Konum, favoriler, ayarlar, tesbih kayıtları ve planlanmış bildirimler bu cihazdan kalıcı olarak silinecek. Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await reschedule([], '').catch(() => undefined); // bildirim planını temizle
          await wipeAllLocalData();
          await Promise.all([settingsStore.reset(), locationStore.reset(), dhikrStore.reset(), notificationStore.reset()]);
          Alert.alert('Silindi', 'Bu cihazdaki tüm uygulama verileri silindi.');
        },
      },
    ]);

  return (
    <Screen>
      <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
        <AppText variant="title" accessibilityRole="header">
          Profil ve ayarlar
        </AppText>
        <AppText tone="muted">Hesap gerekmez; tüm temel özellikler hesapsız çalışır ve verileriniz bu cihazda kalır.</AppText>
      </View>

      <SectionTitle>Konum ve vakit</SectionTitle>
      <Card>
        <ListRow icon="pin" title={lab ? lab.title : 'Konum seçilmedi'} subtitle={lab?.subtitle ?? 'Seçmek için dokunun'} onPress={() => router.push('/location')} />
        <Divider />
        <AppText variant="label">İkindi vakti hesabı</AppText>
        <Segmented<AsrMethod>
          label="İkindi vakti hesabı"
          value={settings.asrMethod}
          onChange={(asrMethod) => settingsStore.set({ asrMethod })}
          options={[
            { value: 'asr_evvel', label: 'Asr-ı evvel' },
            { value: 'asr_sani', label: 'Asr-ı sânî' },
          ]}
        />
        <AppText variant="caption" tone="muted">
          {ASR_METHOD_LABEL[settings.asrMethod]}. Asr-ı sânî seçildiğinde vakitler cihazda hesaplanır.
        </AppText>
        <Divider />
        <ListRow icon="bell" title="Bildirimler" subtitle="Vakit bildirimleri ve hatırlatmalar" onPress={() => router.push('/notifications')} />
      </Card>

      <SectionTitle>Görünüm</SectionTitle>
      <Card>
        <AppText variant="label">Tema</AppText>
        <Segmented<ThemeMode>
          label="Tema"
          value={settings.themeMode}
          onChange={(themeMode) => settingsStore.set({ themeMode })}
          options={[
            { value: 'system', label: 'Sistem' },
            { value: 'light', label: 'Açık' },
            { value: 'dark', label: 'Koyu' },
          ]}
        />
        <AppText variant="label">Yazı boyutu</AppText>
        <Segmented<FontScale>
          label="Yazı boyutu"
          value={settings.fontScale}
          onChange={(fontScale) => settingsStore.set({ fontScale })}
          options={FONT_SCALES.map((v) => ({ value: v, label: v === 1 ? 'Normal' : `%${Math.round(v * 100)}` }))}
        />
        <AppText variant="caption" tone="muted">
          Dil: Türkçe (diğer diller ileride eklenecek).
        </AppText>
      </Card>

      <SectionTitle>Gizlilik ve verileriniz</SectionTitle>
      <Card>
        <ListRow icon="share" title="Verilerimi dışa aktar" subtitle="Cihazdaki tüm uygulama verilerini JSON olarak paylaşın" onPress={() => void exportData()} />
        <Divider />
        <ListRow icon="info" title="Gizlilik politikası" onPress={() => router.push('/privacy')} />
        <Divider />
        <ListRow icon="book" title="Kaynaklar ve lisanslar" subtitle="Veri kaynakları, hesaplama yöntemi, atıflar" onPress={() => router.push('/sources')} />
        <Divider />
        <Button kind="danger" icon="trash" label="Bu cihazdaki tüm verilerimi sil" onPress={wipe} />
        <AppText variant="caption" tone="muted">
          Bu sürümde hesap ve bulut senkronizasyonu yoktur; bu nedenle "hesap silme" gerekmez. Bulut özelliği eklendiğinde açık onayla etkinleşecek ve hesap silme seçeneği burada yer alacak.
        </AppText>
      </Card>

      <AppText variant="caption" tone="muted" align="center">
        {APP_NAME} · sürüm {Constants.expoConfig?.version ?? '—'}
      </AppText>
    </Screen>
  );
}

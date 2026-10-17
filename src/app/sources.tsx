import { Linking } from 'react-native';
import { AppText } from '../components/AppText';
import { Button, Card, Screen } from '../components/ui';
import { locationsMeta } from '../features/locations/data';
import { CALC_METHOD_LABEL } from '../features/prayer-times/calculate';
import { config } from '../config';

export default function SourcesScreen() {
  const c = locationsMeta.counts;
  const q = locationsMeta.coordinateQuality;
  return (
    <Screen edges={[]}>
      <Card>
        <AppText variant="heading">Namaz vakitleri</AppText>
        <AppText variant="caption" tone="muted">
          {config.apiBaseUrl
            ? 'Sunucu bağlantısı yapılandırılmış: Diyanet İşleri Başkanlığı Awqat Salah servisinden alınan vakitler "Diyanet verisi" etiketiyle gösterilir. Servise ulaşılamazsa son kayıtlı resmî veri, o da yoksa cihazda hesaplanan vakit kullanılır.'
            : 'Bu yapılandırmada sunucu bağlantısı yok. Gösterilen tüm vakitler cihazda hesaplanır ve "Hesaplanan vakit" etiketiyle gösterilir; resmî Diyanet verisi değildir.'}
        </AppText>
        <AppText variant="caption" tone="muted">Hesaplama: {CALC_METHOD_LABEL}. Kütüphane: adhan-js (MIT lisansı).</AppText>
      </Card>
      <Card>
        <AppText variant="heading">Türkiye yerleşim verisi</AppText>
        <AppText variant="caption" tone="muted">
          {c.provinces} il, {c.districts} ilçe, {c.settlements.toLocaleString('tr-TR')} mahalle/köy/belde kaydı. Veri oluşturma: {new Date(locationsMeta.generatedAt).toLocaleDateString('tr-TR')}.
        </AppText>
        <AppText variant="caption" tone="muted">
          İlçe koordinatları: {q.geonames} ilçe GeoNames ile eşleşti; {q.province_center} ilçede eşleşme bulunamadığı için il merkezi koordinatı (yaklaşık) kullanılıyor. Mahalle ve köylerde vakit, bağlı oldukları ilçe merkezine göre hesaplanır.
        </AppText>
        {locationsMeta.sources.map((s) => (
          <AppText key={s.id} variant="caption" tone="muted">
            • {s.title} — {s.via}. Lisans: {s.license}
          </AppText>
        ))}
        <Button kind="ghost" compact label="GeoNames (CC BY 4.0)" onPress={() => void Linking.openURL('https://www.geonames.org/')} />
      </Card>
      <Card>
        <AppText variant="heading">Kıble</AppText>
        <AppText variant="caption" tone="muted">Kâbe koordinatı 21.4225° K, 39.8262° D alınarak büyük daire yönü hesaplanır; adhan-js ile çapraz doğrulanmıştır.</AppText>
      </Card>
    </Screen>
  );
}

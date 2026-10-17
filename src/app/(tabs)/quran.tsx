import { View } from 'react-native';
import { AppText } from '../../components/AppText';
import { RoadmapList } from '../../components/RoadmapList';
import { Screen } from '../../components/ui';
import { spacing } from '../../theme/tokens';

export default function QuranTab() {
  return (
    <Screen>
      <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
        <AppText variant="title" accessibilityRole="header">
          Kur'an-ı Kerîm
        </AppText>
        <AppText tone="muted">Bu bölüm bir sonraki geliştirme aşamasında eklenecek.</AppText>
      </View>
      <RoadmapList
        intro="Kur'an metni hiçbir zaman yapay zekâ ile üretilmeyecek veya yeniden yazılmayacak. Metin, meal ve tilavet yalnızca kaynağı ve lisansı doğrulanmış veri setlerinden alınacak ve metin bütünlüğü otomatik testlerle denetlenecek."
        items={[
          { title: 'Arapça metin (114 sure, 6236 ayet, 30 cüz)', requirement: 'Gerekli: lisansı uygun, doğrulanmış metin kaynağı (ör. Tanzil Uthmani metni — atıf koşullarıyla) ve sağlama toplamı testleri.' },
          { title: 'Türkçe meal', requirement: 'Gerekli: yayın hakkı sahibinden (ör. Diyanet meali için Diyanet İşleri Başkanlığı) yazılı kullanım izni.' },
          { title: 'Sesli tilavet ve çevrimdışı indirme', requirement: 'Gerekli: kıraat kayıtları için dağıtım izni olan kaynak.' },
          { title: 'Yer imleri, notlar, hatim planı, okuma geçmişi', requirement: 'Metin modülüyle birlikte gelecek; veriler varsayılan olarak cihazda tutulacak.' },
        ]}
      />
    </Screen>
  );
}

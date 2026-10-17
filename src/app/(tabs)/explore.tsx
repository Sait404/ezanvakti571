import { View } from 'react-native';
import { AppText } from '../../components/AppText';
import { RoadmapList } from '../../components/RoadmapList';
import { Screen } from '../../components/ui';
import { spacing } from '../../theme/tokens';

export default function ExploreTab() {
  return (
    <Screen>
      <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
        <AppText variant="title" accessibilityRole="header">
          Keşfet
        </AppText>
        <AppText tone="muted">Bilgi kütüphanesi ve Dinî Asistan bu bölümde yer alacak.</AppText>
      </View>
      <RoadmapList
        intro="Bu modüller henüz tamamlanmadı. Hazır olmayan bir özellik çalışıyormuş gibi gösterilmez."
        items={[
          { title: 'Dinî Asistan (yapay zekâ)', requirement: 'Kaynaklı yanıt (RAG) zorunlu: lisanslı dinî kaynak koleksiyonu, sunucu tarafı model anahtarı ve kapsam/uydurma/prompt-injection testleri tamamlanmadan açılmayacak. Anahtar hiçbir zaman uygulamaya gömülmez.' },
          { title: 'Hadis ve İslami bilgi kütüphanesi', requirement: 'Kaynak, hadis numarası ve sıhhat derecesi kayıtlı, lisansı uygun veri seti gerekli.' },
          { title: 'Hicri takvim ve dinî günler', requirement: 'Diyanet\'in yayımladığı dinî günler takvimi esas alınacak; henüz yayımlanmamış tarihler kesin gibi gösterilmeyecek.' },
          { title: 'Yakındaki camiler', requirement: 'Kullanım şartları uygun bir harita/yer verisi servisi (ör. OpenStreetMap tabanlı) gerekli; gerçek olmayan cami veya adres üretilmeyecek.' },
          { title: 'Çocuk modu ve elifba', requirement: 'Ebeveyn izni ve veri minimizasyonu ile; çocuk verisi toplanmayacak şekilde tasarlanacak.' },
        ]}
      />
    </Screen>
  );
}

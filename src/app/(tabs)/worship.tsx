import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { AppText } from '../../components/AppText';
import { RoadmapList } from '../../components/RoadmapList';
import { Card, Divider, ListRow, Screen, SectionTitle } from '../../components/ui';
import { spacing } from '../../theme/tokens';

export default function WorshipTab() {
  const router = useRouter();
  return (
    <Screen>
      <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
        <AppText variant="title" accessibilityRole="header">
          İbadetler
        </AppText>
        <AppText tone="muted">Günlük ibadetleriniz için araçlar.</AppText>
      </View>
      <SectionTitle>Kullanıma hazır</SectionTitle>
      <Card>
        <ListRow icon="beads" title="Tesbih sayacı" subtitle="Hedef, özel zikir, günlük ve haftalık toplam" onPress={() => router.push('/tesbih')} />
        <Divider />
        <ListRow icon="compass" title="Kıble pusulası" subtitle="Sensörle yön ve derece; GPS izni gerekmez" onPress={() => router.push('/qibla')} />
        <Divider />
        <ListRow icon="calendar" title="Vakit takvimi" subtitle="Haftalık ve aylık tablo, yıl boyunca gezinme" onPress={() => router.push('/prayer-calendar')} />
        <Divider />
        <ListRow icon="bell" title="Vakit bildirimleri" subtitle="Her vakit için ayrı ayar, öncesi/sonrası hatırlatma" onPress={() => router.push('/notifications')} />
      </Card>
      <SectionTitle>Sıradaki aşamalar</SectionTitle>
      <RoadmapList
        intro="Aşağıdaki modüllerin içerikleri dinî doğruluk ve kaynak gerektirdiği için doğrulanmış kaynaklar bağlanmadan yayınlanmayacak."
        items={[
          { title: 'Dua ve zikir kütüphanesi', requirement: 'Her içerik için ayet/hadis referansı ve kaynak kaydı zorunlu; kaynaksız söz hadis olarak sunulmayacak.' },
          { title: 'Namaz öğrenme merkezi', requirement: 'Mezhep farkları kaynaklı olarak gösterilecek; Hanefî görüşü ortak görüş gibi sunulmayacak. Fıkıh editörü incelemesi gerekli.' },
          { title: 'Ramazan modülü (imsakiye, oruç takibi, fitre/fidye)', requirement: 'Fitre ve fidye tutarları her yıl Diyanet duyurusundan alınacak; tarih ve kaynak gösterilecek.' },
          { title: 'İbadet takip çizelgesi', requirement: 'Yargılamayan tasarım; veriler varsayılan olarak yalnızca cihazda.' },
        ]}
      />
    </Screen>
  );
}

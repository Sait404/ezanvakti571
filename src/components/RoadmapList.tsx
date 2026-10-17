import { View } from 'react-native';
import { AppText } from './AppText';
import { Badge, Card, Divider } from './ui';
import { spacing } from '../theme/tokens';

export type RoadmapItem = { title: string; requirement: string };

/** Henüz tamamlanmamış modülleri açıkça "hazırlanıyor" olarak listeler (bitmiş gibi göstermez). */
export function RoadmapList({ items, intro }: { items: RoadmapItem[]; intro: string }) {
  return (
    <Card>
      <Badge label="Hazırlanıyor" tone="warning" />
      <AppText variant="caption" tone="muted">
        {intro}
      </AppText>
      {items.map((it, i) => (
        <View key={it.title} style={{ gap: 2 }}>
          {i > 0 ? <Divider /> : null}
          <AppText variant="body" weight="600" style={{ marginTop: i > 0 ? spacing.sm : 0 }}>
            {it.title}
          </AppText>
          <AppText variant="caption" tone="muted">
            {it.requirement}
          </AppText>
        </View>
      ))}
    </Card>
  );
}

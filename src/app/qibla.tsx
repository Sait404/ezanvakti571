import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { Magnetometer } from 'expo-sensors';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { AppText } from '../components/AppText';
import { Card, Screen, StateView } from '../components/ui';
import { locationLabel } from '../features/locations/data';
import { locationStore } from '../features/locations/store';
import { compassPoint, headingFromMagnetometer, qiblaBearing, turnAngle, turnInstruction } from '../features/qibla/qibla';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';
import { useStore } from '../utils/persistedStore';

type Sensor = { kind: 'true' | 'magnetic'; heading: number; accuracy?: number } | { kind: 'none' } | { kind: 'pending' };

export default function QiblaScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const loc = useStore(locationStore, (s) => s.selected);
  const [sensor, setSensor] = useState<Sensor>({ kind: 'pending' });

  // Sensör yalnızca bu ekran odaktayken dinlenir; ekrandan çıkınca abonelik kapanır.
  useFocusEffect(
    useCallback(() => {
      let stop: (() => void) | undefined;
      let cancelled = false;
      (async () => {
        try {
          const perm = await Location.getForegroundPermissionsAsync();
          if (perm.granted) {
            const sub = await Location.watchHeadingAsync((h) => {
              const trueOk = h.trueHeading >= 0;
              setSensor({ kind: trueOk ? 'true' : 'magnetic', heading: trueOk ? h.trueHeading : h.magHeading, accuracy: h.accuracy });
            });
            if (cancelled) sub.remove();
            else stop = () => sub.remove();
            return;
          }
          if (!(await Magnetometer.isAvailableAsync())) {
            if (!cancelled) setSensor({ kind: 'none' });
            return;
          }
          Magnetometer.setUpdateInterval(150);
          const sub = Magnetometer.addListener(({ x, y }) => setSensor({ kind: 'magnetic', heading: headingFromMagnetometer(x, y) }));
          if (cancelled) sub.remove();
          else stop = () => sub.remove();
        } catch {
          if (!cancelled) setSensor({ kind: 'none' });
        }
      })();
      return () => {
        cancelled = true;
        stop?.();
      };
    }, []),
  );

  if (!loc) {
    return (
      <Screen edges={[]}>
        <StateView kind="permission" title="Konum seçilmedi" message="Kıble açısı, seçtiğiniz konuma göre hesaplanır. GPS izni gerekmez." action={{ label: 'Konum seç', onPress: () => router.push('/location') }} />
      </Screen>
    );
  }

  const qibla = qiblaBearing(loc.lat, loc.lon);
  const lab = locationLabel(loc);
  const SIZE = 280;
  const heading = sensor.kind === 'true' || sensor.kind === 'magnetic' ? sensor.heading : 0;
  const turn = turnAngle(heading, qibla);
  const aligned = (sensor.kind === 'true' || sensor.kind === 'magnetic') && Math.abs(turn) <= 3;

  return (
    <Screen edges={[]}>
      <Card>
        <AppText variant="caption" tone="muted">
          {lab.title}, {lab.subtitle}
        </AppText>
        <AppText variant="title" accessibilityLabel={`Kıble açısı kuzeyden saat yönünde ${qibla.toFixed(1)} derece, ${compassPoint(qibla)} yönü`}>
          Kıble: {qibla.toFixed(1)}° ({compassPoint(qibla)})
        </AppText>
        <AppText variant="caption" tone="muted">
          Gerçek kuzeyden saat yönünde ölçülür. Konumdan Kâbe'ye (21.4225° K, 39.8262° D) büyük daire yönüdür.
        </AppText>
      </Card>

      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 200 200" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <G rotation={-heading} origin="100, 100">
            <Circle cx={100} cy={100} r={92} stroke={colors.border} strokeWidth={2} fill={colors.surface} />
            {Array.from({ length: 36 }, (_, i) => (
              <Line key={i} x1={100} y1={10} x2={100} y2={i % 9 === 0 ? 22 : 16} stroke={colors.textMuted} strokeWidth={i % 9 === 0 ? 2 : 1} transform={`rotate(${i * 10} 100 100)`} />
            ))}
            {(['K', 'D', 'G', 'B'] as const).map((d, i) => {
              // Harfler halka içinde konumlanır ve dik kalır (ters dönmez).
              const a = (i * Math.PI) / 2;
              return (
                <SvgText key={d} x={100 + 68 * Math.sin(a)} y={100 - 68 * Math.cos(a) + 5} fill={d === 'K' ? colors.danger : colors.text} fontSize={14} fontWeight="700" fontFamily="System" textAnchor="middle">
                  {d}
                </SvgText>
              );
            })}
            <G rotation={qibla} origin="100, 100">
              <Path d="M100 44 L108 100 L100 93 L92 100 Z" fill={aligned ? colors.success : colors.gold} />
              <Circle cx={100} cy={44} r={6} fill={aligned ? colors.success : colors.gold} />
            </G>
          </G>
          <Path d="M100 2 L106 12 L94 12 Z" fill={colors.primary} />
          <Circle cx={100} cy={100} r={5} fill={colors.primary} />
        </Svg>

        {sensor.kind === 'pending' ? <AppText tone="muted">Pusula başlatılıyor…</AppText> : null}
        {sensor.kind === 'none' ? (
          <StateView kind="error" title="Pusula sensörü bulunamadı" message={`Cihazınızda manyetometre yok ya da erişilemiyor. Kıble açısı yine de ${qibla.toFixed(1)}°: bir pusula veya harita ile bu açıyı kullanabilirsiniz.`} />
        ) : null}
        {sensor.kind === 'true' || sensor.kind === 'magnetic' ? (
          <View style={{ alignItems: 'center', gap: 4 }} accessibilityLiveRegion="polite">
            <AppText variant="heading" tone={aligned ? 'primary' : 'default'}>
              {turnInstruction(turn)}
            </AppText>
            <AppText variant="caption" tone="muted">
              Telefonun üst kenarı: {Math.round(heading)}° ({compassPoint(heading)}) · {sensor.kind === 'true' ? 'gerçek kuzey' : 'manyetik kuzey (sapma düzeltmesi yok)'}
            </AppText>
          </View>
        ) : null}
      </View>

      <Card tone="alt">
        <AppText variant="heading">Doğru ölçüm için</AppText>
        <AppText variant="caption" tone="muted">
          • Telefonu yere paralel tutun; üst kenarı baktığınız yöndür.{'\n'}• Kalibrasyon için telefonu havada birkaç kez "8" çizerek çevirin.{'\n'}• Metal eşyalar, mıknatıslı kılıflar, hoparlörler ve elektronik cihazlar pusulayı saptırabilir; onlardan uzaklaşın.{'\n'}• Konum izni verirseniz cihaz gerçek kuzeyi kullanabilir; vermezseniz manyetik kuzey kullanılır ve bölgeye göre birkaç derece sapma olabilir.
        </AppText>
      </Card>
    </Screen>
  );
}

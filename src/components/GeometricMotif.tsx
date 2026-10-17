import Svg, { G, Path, Rect } from 'react-native-svg';

/**
 * Sekiz köşeli yıldız (iki üst üste kare) ile kurulmuş, düşük opaklıkta geometrik desen.
 * Ana kartın arka planında kullanılır; dekoratiftir, ekran okuyucudan gizlenir.
 */
export function GeometricMotif({ color, size = 220, opacity = 0.14 }: { color: string; size?: number; opacity?: number }) {
  const star = 'M50 8 L62 38 L92 50 L62 62 L50 92 L38 62 L8 50 L38 38 Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <G opacity={opacity} stroke={color} strokeWidth={0.8} fill="none">
        <Rect x={22} y={22} width={56} height={56} />
        <Rect x={22} y={22} width={56} height={56} transform="rotate(45 50 50)" />
        <Path d={star} />
        <Rect x={36} y={36} width={28} height={28} transform="rotate(45 50 50)" />
      </G>
    </Svg>
  );
}

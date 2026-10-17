/**
 * Uygulamaya özel, tek çizgi kalınlığında ikon seti (react-native-svg).
 * Harici ikon fontu kullanılmaz; böylece paket boyutu küçük kalır ve stil tutarlı olur.
 */
import type { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export type IconName =
  | 'home'
  | 'book'
  | 'prayer'
  | 'compass'
  | 'user'
  | 'pin'
  | 'search'
  | 'star'
  | 'starFilled'
  | 'clock'
  | 'calendar'
  | 'bell'
  | 'beads'
  | 'chevron'
  | 'back'
  | 'close'
  | 'gps'
  | 'share'
  | 'info'
  | 'cloudOff'
  | 'refresh'
  | 'check'
  | 'sparkle'
  | 'trash';

const P: Record<IconName, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5M10 20v-5.5h4V20',
  book: 'M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5V5.5ZM12 6v13.5',
  prayer: 'M12 3c-2.6 2.2-4 4.7-4 7.5h8C16 7.7 14.6 5.2 12 3ZM6 10.5h12V20H6zM10 20v-4a2 2 0 0 1 4 0v4M3 20h18',
  compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.5 5.5-2 5-5 2 2-5 5-2Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7.5 8.5c1.2-3.5 4.1-5.5 7.5-5.5s6.3 2 7.5 5.5',
  pin: 'M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm4.6-1.9L20 20',
  star: 'm12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z',
  starFilled: 'm12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l3 2',
  calendar: 'M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 4v4M15.5 4v4',
  bell: 'M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15l1.5-2ZM10 20.5a2 2 0 0 0 4 0',
  beads: 'M12 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM6.5 6.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM17.5 6.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM5 12.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM19 12.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM12 15v6M10 21h4',
  chevron: 'm9 5 7 7-7 7',
  back: 'm15 5-7 7 7 7',
  close: 'M6 6l12 12M18 6 6 18',
  gps: 'M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm0-4a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 2v3M12 19v3M2 12h3M19 12h3',
  share: 'M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v8h14v-8',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v6M12 7.5v.5',
  cloudOff: 'M3 3l18 18M8 7.6A5.5 5.5 0 0 1 17.5 10a4 4 0 0 1 2.4 6.8M17 19H7a4.5 4.5 0 0 1-1.6-8.7',
  refresh: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  sparkle: 'M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3Z',
  trash: 'M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13',
};

export function Icon({ name, size = 22, color, strokeWidth = 1.7 }: { name: IconName; size?: number; color: ColorValue; strokeWidth?: number }) {
  const filled = name === 'starFilled';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d={P[name]} stroke={color} strokeWidth={strokeWidth} fill={filled ? color : 'none'} strokeLinecap="round" strokeLinejoin="round" />
      {name === 'compass' ? <Circle cx={12} cy={12} r={0.9} fill={color} /> : null}
    </Svg>
  );
}

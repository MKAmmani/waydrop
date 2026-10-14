/**
 * Brand art: logo mark, the four mascots, Nigerian flag and the Google "G".
 * Mascots are decorative, so they're hidden from screen readers by default.
 */
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { Platform } from 'react-native';

type P = { size?: number };
const hidden = Platform.OS === 'web' 
  ? { 'aria-hidden': true } 
  : { accessible: false, importantForAccessibility: 'no-hide-descendants' as const };

export function LogoMark({ size = 40 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" {...hidden}>
      <Rect width="40" height="40" rx="12" fill="#0F172A" />
      <Path d="M8 31 C 12 31, 13 25, 18 25" stroke="#FF5500" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 4.2" fill="none" />
      <Path d="M24 8c5.5 0 9 3.9 9 8.6 0 5.6-5.4 9.8-9 12.4-3.6-2.6-9-6.8-9-12.4C15 11.9 18.5 8 24 8Z" fill="#FF5500" />
      <Circle cx="24" cy="16.6" r="3.2" fill="#fff" />
    </Svg>
  );
}

const Face = ({ y = 60, mouth = 'smile' as 'smile' | 'o' }) => (
  <G>
    <Ellipse cx="47" cy={y} rx="4.5" ry="6" fill="#0F172A" />
    <Ellipse cx="73" cy={y} rx="4.5" ry="6" fill="#0F172A" />
    <Circle cx="48.5" cy={y - 2} r="1.6" fill="#fff" />
    <Circle cx="74.5" cy={y - 2} r="1.6" fill="#fff" />
    {mouth === 'smile' ? (
      <Path d={`M51 ${y + 13} Q60 ${y + 21} 69 ${y + 13}`} stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    ) : (
      <Ellipse cx="61" cy={y + 17} rx="5.5" ry="4.5" fill="#0F172A" />
    )}
    <Circle cx="35" cy={y + 11} r="6" fill="#FF4D6D" opacity={0.3} />
    <Circle cx="85" cy={y + 11} r="6" fill="#FF4D6D" opacity={0.3} />
  </G>
);

export function Parcel({ size = 96 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" {...hidden}>
      <Rect x="16" y="30" width="88" height="74" rx="24" fill="#FF8A4C" />
      <Path d="M16 54 Q60 60 104 54 V52 Q104 30 80 30 H40 Q16 30 16 52Z" fill="#FF9F6B" />
      <Rect x="52" y="30" width="16" height="28" rx="4" fill="#FFD3B8" />
      <Face y={74} />
    </Svg>
  );
}

export function Pin({ size = 96 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" {...hidden}>
      <Path d="M60 10C88 10 104 30 104 54C104 82 78 102 60 114C42 102 16 82 16 54C16 30 32 10 60 10Z" fill="#34D399" />
      <Path d="M60 10C88 10 104 30 104 54C104 60 103 64 101 68C92 42 74 30 44 30C36 30 30 32 24 35C32 18 44 10 60 10Z" fill="#6EE7B7" opacity={0.7} />
      <Path d="M42 56 q6 -7 12 0" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <Path d="M66 56 q6 -7 12 0" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <Path d="M50 70 Q60 80 70 70" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <Circle cx="36" cy="66" r="6" fill="#FF4D6D" opacity={0.28} />
      <Circle cx="84" cy="66" r="6" fill="#FF4D6D" opacity={0.28} />
    </Svg>
  );
}

export function Blob({ size = 96 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" {...hidden}>
      <Path d="M26 64C18 36 42 16 66 20C92 24 108 44 100 70C93 94 70 108 46 100C30 94 30 82 26 64Z" fill="#B9A6FF" />
      <Path d="M40 34C52 24 72 24 86 34C78 30 62 30 50 38Z" fill="#fff" opacity={0.5} />
      <Face y={62} mouth="o" />
    </Svg>
  );
}

export function Coin({ size = 96 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" {...hidden}>
      <Circle cx="60" cy="62" r="44" fill="#FFC94A" />
      <Circle cx="60" cy="62" r="34" fill="none" stroke="#F2A900" strokeWidth="3.5" />
      <Path d="M34 40 A34 34 0 0 1 72 30" stroke="#FFE7A3" strokeWidth="5" strokeLinecap="round" fill="none" />
      <Face y={60} />
    </Svg>
  );
}

export function FlagNG({ width = 22, height = 16 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 3 2" {...hidden}>
      <Rect width="1" height="2" fill="#008751" />
      <Rect x="1" width="1" height="2" fill="#fff" />
      <Rect x="2" width="1" height="2" fill="#008751" />
    </Svg>
  );
}

export function GoogleG({ size = 20 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" {...hidden}>
      <Path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <Path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </Svg>
  );
}

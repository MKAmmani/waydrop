/**
 * Vector illustrations for Batch 3B: Buy For Me props.
 * Price tag, Aquafina bottle, Stadium seat view, and Payment Receipt.
 */
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Platform } from 'react-native';

type P = { size?: number };
const hidden = Platform.OS === 'web'
  ? { 'aria-hidden': true }
  : { accessible: false, importantForAccessibility: 'no-hide-descendants' as const };

export function PriceTagProp({ size = 84 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 84 84" {...hidden}>
      <Rect width="84" height="84" rx="12" fill="#E8EEF5" />
      <Rect x="10" y="20" width="22" height="50" rx="6" fill="#7DD3FC" />
      <Rect x="14" y="12" width="14" height="10" rx="3" fill="#0EA5E9" />
      <Rect x="34" y="24" width="22" height="46" rx="6" fill="#7DD3FC" />
      <Rect x="38" y="16" width="14" height="10" rx="3" fill="#0EA5E9" />
      <Path d="M50 40 h28 v18 h-28 l-6 -9 z" fill="#FFC94A" />
      <SvgText
        x="64"
        y="53"
        textAnchor="middle"
        fontFamily="System"
        fontWeight="800"
        fontSize="11"
        fill="#0F172A"
      >
        ₦350
      </SvgText>
    </Svg>
  );
}

export function AquafinaProp({ size = 84 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 84 84" {...hidden}>
      <Rect width="84" height="84" rx="12" fill="#E8EEF5" />
      <Rect x="30" y="18" width="26" height="58" rx="7" fill="#BAE6FD" />
      <Rect x="36" y="9" width="14" height="11" rx="3" fill="#1D4ED8" />
      <Rect x="30" y="38" width="26" height="16" fill="#1D4ED8" />
      <SvgText
        x="43"
        y="49"
        textAnchor="middle"
        fontFamily="System"
        fontWeight="700"
        fontSize="6.5"
        fill="#fff"
      >
        AQUA
      </SvgText>
    </Svg>
  );
}

export function SeatViewProp({ size = 84 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 84 84" {...hidden}>
      <Rect width="84" height="84" rx="12" fill="#86C99B" />
      <Rect y="0" width="84" height="30" fill="#CBD5E1" />
      <G fill="#94A3B8">
        <Rect x="4" y="34" width="76" height="6" rx="2" />
        <Rect x="4" y="46" width="76" height="6" rx="2" />
        <Rect x="4" y="58" width="76" height="6" rx="2" />
      </G>
      <Rect x="30" y="6" width="24" height="12" rx="2" fill="#0F172A" />
      <SvgText
        x="42"
        y="15"
        textAnchor="middle"
        fontFamily="System"
        fontWeight="800"
        fontSize="7"
        fill="#FFC94A"
      >
        2 - 1
      </SvgText>
      <Circle cx="58" cy="62" r="6" fill="#E11D48" />
    </Svg>
  );
}

export function ReceiptProp({ size = 84 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 84 84" {...hidden}>
      <Rect width="84" height="84" rx="12" fill="#C9A27A" />
      <Path
        d="M22 8 h40 v68 l-5-4 -5 4 -5-4 -5 4 -5-4 -5 4 -5-4 -5 4z"
        fill="#fff"
      />
      <G fill="#94A3B8">
        <Rect x="28" y="16" width="28" height="4" rx="2" />
        <Rect x="28" y="28" width="20" height="3" rx="1.5" />
        <Rect x="28" y="36" width="24" height="3" rx="1.5" />
        <Rect x="28" y="44" width="16" height="3" rx="1.5" />
      </G>
      <Rect x="28" y="56" width="28" height="5" rx="2" fill="#0F172A" />
    </Svg>
  );
}

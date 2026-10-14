/**
 * The onboarding "desk": real-world paper things from a campus errand.
 * A handwritten request on a sticky note, a scrap of map with the route drawn on it,
 * a receipt with the handshake PIN, a dark earnings card. These props are the one bold
 * idea in onboarding; forms around them stay quiet.
 */
import { useEffect, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { color, motion, radius, shadow } from '@/theme/tokens';

/* ───────── Landing: props drop onto the page ───────── */

type LandingProps = { children: ReactNode; delay?: number; rotate?: number; from?: 'above' | 'below'; play?: boolean; style?: StyleProp<ViewStyle> };

/**
 * Drops a prop into place with a small settle, like paper landing on a desk.
 * Starts at 0.94 scale (never from 0) and skips motion entirely when reduce motion is on.
 */
export function Landing({ children, delay = 0, rotate = 0, from = 'above', play = true, style }: LandingProps) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) { p.value = 1; return; }
    if (!play) { p.value = 0; return; }
    p.value = 0;
    p.value = withDelay(delay, withSpring(1, motion.prop));
  }, [play, reduce, delay]);
  const a = useAnimatedStyle(() => {
    const t = p.value;
    const dy = (from === 'above' ? -28 : 36) * (1 - t);
    return {
      opacity: Math.min(1, t * 1.6),
      transform: [{ translateY: dy }, { rotate: `${rotate + (1 - t) * (from === 'above' ? -6 : 4)}deg` }, { scale: 0.94 + 0.06 * Math.min(1, t) }],
    };
  });
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/* ───────── Tape ───────── */

export function Tape({ width = 64, rotate = -4, style }: { width?: number; rotate?: number; style?: StyleProp<ViewStyle> }) {
  return <View accessible={false} style={[{ width, height: 22, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 3, transform: [{ rotate: `${rotate}deg` }] }, style]} />;
}

/* ───────── Sticky note ───────── */

const NOTE = { butter: color.butterNote, lilac: color.lilacNote, mint: '#C9F2DF', white: '#FFFFFF' } as const;

type NoteProps = { children: ReactNode; tone?: keyof typeof NOTE; width?: number; rotate?: number; tape?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string };

/** Handwritten note. Text inside uses the handwriting face; it's still real text for screen readers. */
export function StickyNote({ children, tone = 'butter', width = 200, rotate = -3, tape = true, style, accessibilityLabel }: NoteProps) {
  return (
    <View accessibilityLabel={accessibilityLabel} style={[{ width, transform: [{ rotate: `${rotate}deg` }] }, style]}>
      <View style={[s.note, { backgroundColor: NOTE[tone] }]}>
        {typeof children === 'string' ? <Text variant="note">{children}</Text> : children}
        {/* Curl shadow at the bottom-right corner */}
        <View style={s.curl} />
      </View>
      {tape && <Tape width={58} style={s.tape} />}
    </View>
  );
}

/* ───────── Map scrap with route ───────── */

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** A torn piece of campus map with the errand route drawn by hand-ish tangerine line. */
export function MapScrap({ width = 300, height = 210, play = true, delay = 300, rotate = 2, children }: { width?: number; height?: number; play?: boolean; delay?: number; rotate?: number; children?: ReactNode }) {
  const reduce = useReducedMotion();
  const d = useSharedValue(reduce ? 0 : 1);
  useEffect(() => {
    if (reduce || Platform.OS === 'web') { d.value = 0; return; }
    d.value = 1;
    if (play) d.value = withDelay(delay, withTiming(0, { duration: 800, easing: motion.easeInOut }));
  }, [play, reduce]);
  const ap = useAnimatedProps(() => ({ strokeDashoffset: d.value * 520 }));
  const route = 'M34 168 C 80 168, 90 112, 140 110 S 214 50, 262 46';
  return (
    <View style={{ width, height, transform: [{ rotate: `${rotate}deg` }] }}>
      <View style={[s.scrap, shadow.prop]}>
        <Svg width="100%" height="100%" viewBox="0 0 300 210" preserveAspectRatio="xMidYMid slice" aria-hidden={true}>
          <Rect width="300" height="210" fill="#EEF2F6" />
          <Path d="M-10 160 Q90 128 160 150 T320 140 V230 H-10Z" fill="#D8EEDF" />
          <G fill="#DEE4EA">
            <Rect x="14" y="14" width="70" height="52" rx="7" /><Rect x="104" y="14" width="82" height="52" rx="7" />
            <Rect x="206" y="80" width="80" height="60" rx="7" /><Rect x="14" y="86" width="52" height="48" rx="7" />
          </G>
          <G stroke="#fff" strokeLinecap="round" fill="none">
            <Path d="M-10 78 H310" strokeWidth="10" /><Path d="M94 -10 V220" strokeWidth="10" /><Path d="M196 -10 V220" strokeWidth="8" />
          </G>
          <Path d={route} stroke="#FF5500" strokeOpacity={0.22} strokeWidth="16" strokeLinecap="round" fill="none" />
          <AnimatedPath d={route} stroke="#FF5500" strokeWidth="5" strokeLinecap="round" fill="none" strokeDasharray="520" animatedProps={ap} />
          <Circle cx="34" cy="168" r="9" fill="#fff" stroke="#FF5500" strokeWidth="5" />
          <Rect x="252" y="36" width="20" height="20" rx="4" fill="#0F172A" transform="rotate(45 262 46)" />
          <SvgText x="236" y="80" fontSize="12" fontWeight="600" fill="#64748B">LT3</SvgText>
          <SvgText x="14" y="198" fontSize="12" fontWeight="600" fill="#64748B">Moremi Hall</SvgText>
        </Svg>
      </View>
      {children}
    </View>
  );
}

/* ───────── PIN receipt ───────── */

export function PinReceipt({ pin = '1842', width = 260 }: { pin?: string; width?: number }) {
  return (
    <View style={{ width }} accessibilityLabel={`Handshake PIN ${pin.split('').join(' ')}`}>
      <View style={[s.receipt, shadow.prop]}>
        <Text variant="caption" tone="ink3">Handshake PIN</Text>
        <View style={s.pinRow}>
          {pin.split('').map((n, i) => (
            <View key={i} style={s.pinBox}><Text variant="number" tone="mintInk" style={{ fontSize: 32 }}>{n}</Text></View>
          ))}
        </View>
        <View style={s.dash} />
        <View style={s.receiptFoot}>
          <Text variant="caption" tone="ink3">Calculator, Moremi Hall to LT3</Text>
          <Text variant="label" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>₦500</Text>
        </View>
      </View>
      {/* Torn bottom edge */}
      <Svg width={width} height={10} viewBox={`0 0 ${width} 10`} style={{ marginTop: -1 }} aria-hidden={true}>
        <Path d={`M0 0 ${Array.from({ length: Math.ceil(width / 12) }, (_, i) => `L${i * 12 + 6} 9 L${i * 12 + 12} 0`).join(' ')} V0Z`} fill="#fff" />
      </Svg>
    </View>
  );
}

/* ───────── Dark earnings card ───────── */

export function EarnCard({ amount = '₦720', children }: { amount?: string; children?: ReactNode }) {
  return (
    <View style={[s.earn, shadow.prop]} accessibilityLabel={`${amount} earned on your walk`}>
      <View style={{ flex: 1 }}>
        <Text variant="caption" style={{ color: '#CBD5E1' }}>Earned on your walk</Text>
        <Text variant="number" style={{ color: '#6EE7B7', fontSize: 40, lineHeight: 44 }}>{amount}</Text>
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  note: { padding: 16, paddingTop: 20, borderRadius: 4, ...shadow.prop, shadowOpacity: 0.18 },
  curl: { position: 'absolute', right: 0, bottom: 0, width: 28, height: 28, borderTopLeftRadius: 28, backgroundColor: 'rgba(0,0,0,0.05)' },
  tape: { position: 'absolute', top: -10, alignSelf: 'center' },
  scrap: { flex: 1, borderRadius: 6, overflow: 'hidden', backgroundColor: '#EEF2F6' },
  receipt: { backgroundColor: '#fff', borderTopLeftRadius: 6, borderTopRightRadius: 6, padding: 16, paddingBottom: 14 },
  pinRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  pinBox: { flex: 1, height: 62, borderRadius: radius.md, backgroundColor: color.mintSoft, alignItems: 'center', justifyContent: 'center' },
  dash: { borderBottomWidth: 1.5, borderStyle: 'dashed', borderColor: color.line, marginVertical: 12 },
  receiptFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earn: { flexDirection: 'row', alignItems: 'center', backgroundColor: color.midnight, borderRadius: radius.xl, paddingVertical: 18, paddingHorizontal: 20, width: 280 },
});

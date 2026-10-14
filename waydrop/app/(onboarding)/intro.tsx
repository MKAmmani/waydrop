import { useRef, useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withTiming, useReducedMotion } from 'react-native-reanimated';
import { LockSimple } from 'phosphor-react-native';
import { Blob, Coin, Parcel, Pin } from '@/components/art/Brand';
import { EarnCard, Landing, MapScrap, PinReceipt, StickyNote } from '@/components/art/Props';
import { GridPaper } from '@/components/ui/Layout';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useSession } from '@/store/session';
import { color, motion, radius, space } from '@/theme/tokens';

const SCENE_H = 340;

type Slide = { key: string; bg: 'tangerine' | 'grid' | 'mint'; title: string; lede: string; Scene: (p: { play: boolean; w: number }) => ReactElement };

const SLIDES: Slide[] = [
  {
    key: 'send',
    bg: 'tangerine',
    title: "Need it moved?\nSomeone's already going.",
    lede: 'Type one line. Someone walking that way brings it.',
    Scene: ({ play, w }) => (
      <View style={[sc.stage, { width: w }]}>
        <Landing play={play} delay={60} rotate={3} style={{ position: 'absolute', top: 40, right: -24 }}>
          <MapScrap width={Math.min(320, w * 0.82)} height={220} play={play} delay={420} rotate={0} />
        </Landing>
        <Landing play={play} delay={200} rotate={-6} style={{ position: 'absolute', top: 6, left: 18 }}>
          <StickyNote width={190} tone="butter" accessibilityLabel="Note: Abeg, bring my calculator from Moremi Hall to LT3. 500 naira.">
            <Text variant="note">Abeg, bring my calculator from Moremi to LT3</Text>
            <Text variant="note" style={{ marginTop: 6, fontSize: 26 }}>₦500</Text>
          </StickyNote>
        </Landing>
        <Landing play={play} delay={340} from="below" style={{ position: 'absolute', top: 150, left: w * 0.42 }}>
          <Pin size={86} />
        </Landing>
        <Landing play={play} delay={420} from="below" rotate={-8} style={{ position: 'absolute', bottom: -18, left: 8 }}>
          <Parcel size={120} />
        </Landing>
      </View>
    ),
  },
  {
    key: 'earn',
    bg: 'grid',
    title: 'Walk your usual route.\nGet paid on the way.',
    lede: 'Errands that fit your path find you. No scrolling lists.',
    Scene: ({ play, w }) => (
      <View style={[sc.stage, { width: w }]}>
        <Landing play={play} delay={60} rotate={-3} style={{ position: 'absolute', top: 20, alignSelf: 'center' }}>
          <EarnCard amount="+₦720"><Coin size={64} /></EarnCard>
        </Landing>
        <Landing play={play} delay={220} rotate={4} style={{ position: 'absolute', top: 132, right: 18 }}>
          <View style={sc.chip} accessibilityLabel="Pickup is 50 metres off your route">
            <View style={sc.chipDot} />
            <Text variant="label" style={{ fontFamily: 'DMSans_600SemiBold' }}>50m off your route</Text>
          </View>
        </Landing>
        <Landing play={play} delay={300} rotate={-5} style={{ position: 'absolute', top: 186, left: 20 }}>
          <StickyNote width={176} tone="lilac">Heading to class anyway? Take one along.</StickyNote>
        </Landing>
        <Landing play={play} delay={420} from="below" style={{ position: 'absolute', bottom: -10, right: 26 }}>
          <Pin size={128} />
        </Landing>
      </View>
    ),
  },
  {
    key: 'safe',
    bg: 'mint',
    title: 'Your money waits for\nthe handshake.',
    lede: 'We hold the payment until the item is in your hands and you read the runner your PIN.',
    Scene: ({ play, w }) => (
      <View style={[sc.stage, { width: w }]}>
        <Landing play={play} delay={60} rotate={2} style={{ position: 'absolute', top: 34, alignSelf: 'center' }}>
          <PinReceipt pin="1842" width={Math.min(268, w - 80)} />
        </Landing>
        <Landing play={play} delay={200} rotate={-4} style={{ position: 'absolute', top: 10, left: 26 }}>
          <View style={sc.held} accessibilityLabel="500 naira held">
            <LockSimple size={16} weight="bold" color={color.midnight} />
            <Text variant="label" style={{ fontFamily: 'DMSans_700Bold' }}>₦500 held</Text>
          </View>
        </Landing>
        <Landing play={play} delay={360} from="below" rotate={-6} style={{ position: 'absolute', bottom: -6, left: 14 }}>
          <Blob size={118} />
        </Landing>
        <Landing play={play} delay={440} from="below" rotate={6} style={{ position: 'absolute', bottom: 4, right: 20 }}>
          <Parcel size={100} />
        </Landing>
      </View>
    ),
  },
];

export default function Intro() {
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const [stageH, setStageH] = useState(SCENE_H);
  const k = Math.min(1, Math.max(0.6, stageH / SCENE_H));
  const ref = useRef<ScrollView>(null);
  const setSession = useSession((s) => s.set);
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];
  const onTangerine = slide.bg === 'tangerine';

  const finish = () => { setSession({ seenIntro: true }); router.replace('/welcome'); };
  const goTo = (n: number) => { ref.current?.scrollTo({ x: n * W, animated: true }); setI(n); };
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setI(Math.round(e.nativeEvent.contentOffset.x / W));

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <StatusBar style={onTangerine ? 'light' : 'dark'} />
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onEnd}
        scrollEventThrottle={16}
        accessibilityRole="adjustable"
        accessibilityLabel={`Slide ${i + 1} of ${SLIDES.length}`}
      >
        {SLIDES.map((sl, n) => (
          <View key={sl.key} style={{ width: W, flex: 1, backgroundColor: sl.bg === 'tangerine' ? color.tangerine : sl.bg === 'mint' ? '#EAF8F1' : color.paper }}>
            {sl.bg === 'grid' && <GridPaper />}
            <View style={{ paddingTop: insets.top + 64, paddingHorizontal: space[6], alignItems: 'center' }}>
              <Text variant="display" align="center" tone={sl.bg === 'tangerine' ? 'white' : 'midnight'} accessibilityRole="header">{sl.title}</Text>
              <Text variant="body" align="center" tone={sl.bg === 'tangerine' ? 'midnight' : 'ink2'} style={{ marginTop: space[3], maxWidth: 320 }}>{sl.lede}</Text>
            </View>
            <View style={{ flex: 1, marginTop: space[6], marginBottom: 104 + insets.bottom, alignItems: 'center' }} onLayout={n === 0 ? (e) => setStageH(e.nativeEvent.layout.height) : undefined}>
              {/* Scenes are drawn for a 340pt-tall stage and scaled down on short phones so props never collide. */}
              <View style={{ height: SCENE_H, width: W, transform: [{ scale: k }], transformOrigin: 'top' }}>
                <sl.Scene play={n === i} w={W} />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Skip */}
      <View style={[sc.top, { top: insets.top + space[2] }]}>
        <Dots i={i} onTangerine={onTangerine} />
        <PressableScale onPress={finish} accessibilityLabel="Skip intro" style={sc.skip} hitSlop={8}>
          <Text variant="label" tone={onTangerine ? 'white' : 'ink2'} style={{ fontFamily: 'DMSans_600SemiBold' }}>Skip</Text>
        </PressableScale>
      </View>

      {/* Main action */}
      <View style={[sc.bottom, { paddingBottom: Math.max(insets.bottom, space[4]) + space[2] }]}>
        <Button
          label={last ? 'Get started' : 'Next'}
          variant={onTangerine ? 'onTangerine' : 'primary'}
          onPress={() => (last ? finish() : goTo(i + 1))}
        />
      </View>
    </View>
  );
}

/** Progress as a tally: the current slide stretches into a bar. */
function Dots({ i, onTangerine }: { i: number; onTangerine: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {SLIDES.map((_, n) => <Dot key={n} on={n === i} onTangerine={onTangerine} />)}
    </View>
  );
}
function Dot({ on, onTangerine }: { on: boolean; onTangerine: boolean }) {
  const reduce = useReducedMotion();
  const a = useAnimatedStyle(() => ({ width: withTiming(on ? 26 : 8, { duration: reduce ? 0 : 320, easing: motion.easeOut }) }));
  const bg = onTangerine ? (on ? color.white : 'rgba(255,255,255,0.45)') : on ? color.midnight : color.line;
  return <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: bg }, a]} />;
}

const sc = StyleSheet.create({
  stage: { flex: 1, position: 'relative' },
  top: { position: 'absolute', left: space[6], right: space[4], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skip: { minHeight: 48, minWidth: 64, paddingHorizontal: space[3], alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: space[6], right: space[6], bottom: 0 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: color.card, borderRadius: radius.pill, paddingHorizontal: 14, height: 40, shadowColor: '#0F172A', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  chipDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 3, borderColor: color.tangerine, backgroundColor: color.white },
  held: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: color.mint, borderRadius: radius.pill, paddingHorizontal: 14, height: 38 },
});

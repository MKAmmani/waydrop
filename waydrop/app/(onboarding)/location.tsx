import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { EyeSlash, NavigationArrow, PathIcon, UsersThree } from 'phosphor-react-native';
import { Coin, Parcel, Pin } from '@/components/art/Brand';
import { Landing, MapScrap } from '@/components/art/Props';
import { Button } from '@/components/ui/Button';
import { Screen, StepHeader, Title } from '@/components/ui/Layout';
import { Text } from '@/components/ui/Text';
import { color, radius, space } from '@/theme/tokens';

export default function LocationPrime() {
  const [asking, setAsking] = useState(false);

  const allow = async () => {
    setAsking(true);
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') router.push('/area?mode=detect');
      else router.push(`/area?mode=search&denied=1&settings=${canAskAgain ? 0 : 1}`);
    } finally {
      setAsking(false);
    }
  };

  return (
    <Screen
      header={<StepHeader step={3} />}
      footer={
        <>
          <Button label="Allow location" icon={<NavigationArrow size={20} weight="duotone" color={color.white} />} onPress={allow} loading={asking} />
          <Button label="Choose my area instead" variant="ghost" onPress={() => router.push('/area?mode=search')} />
        </>
      }
    >
      <View style={s.art} accessible={false}>
        <Landing delay={40} rotate={-2}><MapScrap width={300} height={190} rotate={0} delay={350}><YouDot /></MapScrap></Landing>
        <Landing delay={260} from="below" style={{ position: 'absolute', left: 6, bottom: -14 }}><Pin size={64} /></Landing>
        <Landing delay={340} from="below" rotate={8} style={{ position: 'absolute', right: 4, bottom: -10 }}><Parcel size={60} /></Landing>
        <Landing delay={420} style={{ position: 'absolute', right: 26, top: -12 }}><Coin size={44} /></Landing>
      </View>

      <Title>Let Waydrop see where you are</Title>

      <View style={{ gap: space[4] }}>
        <Benefit icon={<UsersThree size={22} weight="duotone" color={color.tangerine} />} bg={color.tangerineSoft} title="Find runners near you" body="Matches come from people already close by." />
        <Benefit icon={<PathIcon size={22} weight="duotone" color={color.mintInk} />} bg={color.mintSoft} title="Earn along your route" body="Only errands that fit the way you're walking." />
        <Benefit icon={<EyeSlash size={22} weight="duotone" color={color.midnight} />} bg={color.sunken} title="Shared only during an errand" body="Nobody sees your location the rest of the time." />
      </View>
    </Screen>
  );
}

function Benefit({ icon, bg, title, body }: { icon: ReactNode; bg: string; title: string; body: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: space[4], alignItems: 'flex-start' }}>
      <View style={[s.bIcon, { backgroundColor: bg }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text variant="h3">{title}</Text>
        <Text variant="label" tone="ink2">{body}</Text>
      </View>
    </View>
  );
}

/** Pulsing "you are here" dot. One slow pulse; holds still with reduce motion. */
function YouDot() {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => { if (!reduce) p.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.out(Easing.cubic) }), -1); }, [reduce]);
  const ring = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ scale: 0.4 + p.value * 1.8 }] }));
  return (
    <View style={s.you} pointerEvents="none">
      <Animated.View style={[s.youRing, ring]} />
      <View style={s.youDot} />
    </View>
  );
}

const s = StyleSheet.create({
  art: { alignItems: 'center', marginTop: space[2], marginBottom: space[8] },
  bIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  you: { position: 'absolute', left: '46%', top: '50%', width: 0, height: 0, alignItems: 'center', justifyContent: 'center' },
  youRing: { position: 'absolute', width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,85,0,0.22)' },
  youDot: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: color.midnight, borderWidth: 4, borderColor: color.white },
});

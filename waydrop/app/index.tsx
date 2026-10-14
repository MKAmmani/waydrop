import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { LogoMark } from '@/components/art/Brand';
import { Landing, StickyNote } from '@/components/art/Props';
import { Text } from '@/components/ui/Text';
import { nextOnboardingRoute, useSession } from '@/store/session';
import { color, motion } from '@/theme/tokens';

/**
 * Picks up from the native splash (same tangerine), lands the brand, then routes.
 * Returning users skip straight through: no splash ceremony on every open.
 */
export default function Splash() {
  const state = useSession();
  const reduce = useReducedMotion();
  const firstOpen = !state.seenIntro;
  const logo = useSharedValue(reduce || !firstOpen ? 1 : 0);
  const word = useSharedValue(reduce || !firstOpen ? 1 : 0);

  useEffect(() => {
    const go = () => router.replace(nextOnboardingRoute(useSession.getState()) as never);
    if (!firstOpen) { go(); return; }
    logo.value = withSpring(1, { damping: 12, stiffness: 140 });
    word.value = withDelay(180, withTiming(1, { duration: 420, easing: motion.easeOut }));
    const t = setTimeout(go, reduce ? 600 : 1900);
    return () => clearTimeout(t);
  }, []);

  const logoA = useAnimatedStyle(() => ({ opacity: Math.min(1, logo.value * 1.5), transform: [{ scale: 0.8 + 0.2 * logo.value }] }));
  const wordA = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: 16 * (1 - word.value) }] }));

  return (
    <View style={s.root} accessibilityLabel="Waydrop. Errands that ride along your way.">
      <StatusBar style="light" />
      <Animated.View style={logoA}><LogoMark size={88} /></Animated.View>
      <Animated.View style={[{ alignItems: 'center' }, wordA]}>
        <Text variant="display" tone="white" style={{ marginTop: 18, fontSize: 44, lineHeight: 46 }}>Waydrop</Text>
      </Animated.View>
      {firstOpen && (
        <Landing delay={520} rotate={-4} from="below" style={{ marginTop: 28 }}>
          <StickyNote width={232} tone="butter">Errands that ride along your way.</StickyNote>
        </Landing>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.tangerine, alignItems: 'center', justifyContent: 'center' },
});

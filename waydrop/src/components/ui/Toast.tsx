import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Info } from 'phosphor-react-native';
import { Text } from './Text';
import { color, radius, shadow } from '@/theme/tokens';

/** One-line note that drops from the top and leaves on its own. Announced to screen readers. */
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(t.current);
    t.current = setTimeout(() => setMsg(null), 2800);
  }, []);
  const insets = useSafeAreaInsets();
  const node = msg ? (
    <Animated.View entering={FadeInUp.springify().damping(15)} exiting={FadeOutUp.duration(180)} style={[s.wrap, { top: insets.top + 64 }]} pointerEvents="none">
      <View style={[s.toast, shadow[2]]} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <Info size={20} weight="duotone" color={color.tangerine} />
        <Text variant="label" tone="white" style={{ flex: 1, fontFamily: 'DMSans_600SemiBold' }}>{msg}</Text>
      </View>
    </Animated.View>
  ) : null;
  return { show, node };
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 100 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: color.midnight, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 14 },
});

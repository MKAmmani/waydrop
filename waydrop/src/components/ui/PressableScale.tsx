import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { motion } from '@/theme/tokens';
import { tap } from '@/lib/haptics';

const APressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number; haptic?: boolean };

/**
 * Every pressable surface: scales to 0.97 in 100ms on press, springs back on release.
 * Scale never changes layout bounds, so nothing around it jumps.
 */
export function PressableScale({ style, scaleTo = motion.press.inScale, haptic = true, onPressIn, onPressOut, disabled, ...rest }: Props) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled: !!disabled }}
      onPressIn={(e) => {
        s.value = withTiming(scaleTo, { duration: motion.press.inMs, easing: motion.easeOut });
        if (haptic) tap();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, motion.press.out);
        onPressOut?.(e);
      }}
      style={[style, anim]}
      {...rest}
    />
  );
}

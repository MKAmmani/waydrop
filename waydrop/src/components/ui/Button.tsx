import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { color, radius, shadow, touch } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'money' | 'ghost' | 'onTangerine' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

const V: Record<Variant, { bg: string; fg: keyof typeof color; border?: string; shadow?: object }> = {
  primary: { bg: color.midnight, fg: 'white', shadow: { ...shadow[1], shadowOpacity: 0.18 } },
  secondary: { bg: color.card, fg: 'midnight', border: color.line },
  money: { bg: color.mint, fg: 'midnight' },
  ghost: { bg: 'transparent', fg: 'ink2' },
  onTangerine: { bg: color.card, fg: 'midnight', shadow: shadow.prop },
  danger: { bg: color.roseSoft, fg: 'roseInk' },
};

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, style, accessibilityHint }: Props) {
  const v = V[variant];
  const off = disabled || loading;
  return (
    <PressableScale
      onPress={onPress}
      disabled={off}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={[
        s.base,
        variant === 'ghost' && s.ghost,
        { backgroundColor: v.bg, opacity: disabled ? 0.38 : 1 },
        v.border ? { borderWidth: 1.5, borderColor: v.border } : null,
        !disabled && v.shadow,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color[v.fg]} />
      ) : (
        <View style={s.row}>
          {icon}
          <Text variant="h3" tone={v.fg} numberOfLines={1}>{label}</Text>
        </View>
      )}
    </PressableScale>
  );
}

const s = StyleSheet.create({
  base: { minHeight: 56, borderRadius: radius.pill, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  ghost: { minHeight: touch.min },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});

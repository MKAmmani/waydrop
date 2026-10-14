import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming, withDelay, withSpring, useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { router } from 'expo-router';
import { ArrowLeft } from 'phosphor-react-native';
import { Text } from './Text';
import { PressableScale } from './PressableScale';
import { color, motion, radius, space } from '@/theme/tokens';

/* ───────── Grid paper: the planning-pad background for quiet screens ───────── */

export function GridPaper() {
  return (
    <Svg style={StyleSheet.absoluteFill} aria-hidden={true} pointerEvents="none">
      <Defs>
        <Pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <Path d="M24 0 H0 V24" fill="none" stroke={color.grid} strokeWidth="1" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={color.paper} />
      <Rect width="100%" height="100%" fill="url(#grid)" />
    </Svg>
  );
}

/* ───────── Screen shell ───────── */

type ScreenProps = {
  children: ReactNode;
  footer?: ReactNode;
  header?: ReactNode;
  bg?: 'grid' | 'paper' | 'tangerine';
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Safe areas, keyboard handling and a pinned footer for the main action. */
export function Screen({ children, footer, header, bg = 'grid', scroll = true, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;
  return (
    <View style={{ flex: 1, backgroundColor: bg === 'tangerine' ? color.tangerine : color.paper }}>
      {bg === 'grid' && <GridPaper />}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingTop: insets.top + space[2] }}>{header}</View>
        <Body
          style={{ flex: 1 }}
          {...(scroll
            ? {
                keyboardShouldPersistTaps: 'handled',
                keyboardDismissMode: 'on-drag',
                removeClippedSubviews: false,
                contentContainerStyle: [s.content, contentStyle],
                showsVerticalScrollIndicator: false,
              }
            : {})}
        >
          {scroll ? children : <View style={[s.content, { flex: 1 }, contentStyle]}>{children}</View>}
        </Body>
        {footer && <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, space[4]) + space[2] }]}>{footer}</View>}
      </KeyboardAvoidingView>
    </View>
  );
}

/* ───────── Back button + step progress ───────── */

export function BackButton({ onPress, tone = 'light' }: { onPress?: () => void; tone?: 'light' | 'onTangerine' }) {
  return (
    <PressableScale
      accessibilityLabel="Back"
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/welcome')))}
      hitSlop={6}
      style={[s.back, tone === 'onTangerine' && { backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'transparent' }]}
    >
      <ArrowLeft size={20} weight="bold" color={tone === 'onTangerine' ? color.white : color.midnight} />
    </PressableScale>
  );
}

/** Back, segmented progress and an "n/total" counter, like a page tally on a notepad. */
export function StepHeader({ step, total = 3, onBack, right }: { step?: number; total?: number; onBack?: () => void; right?: ReactNode }) {
  return (
    <View style={s.header}>
      <BackButton onPress={onBack} />
      {step ? (
        <View style={s.progress} accessible accessibilityRole="progressbar" accessibilityLabel={`Step ${step} of ${total}`} accessibilityValue={{ min: 0, max: total, now: step }}>
          <View style={s.segs}>
            {Array.from({ length: total }, (_, i) => <Seg key={i} on={i < step} delay={i === step - 1 ? 120 : 0} />)}
          </View>
          <Text variant="label" tone="ink3" style={s.count}>{step}/{total}</Text>
        </View>
      ) : <View style={{ flex: 1 }} />}
      {right}
    </View>
  );
}

function Seg({ on, delay }: { on: boolean; delay: number }) {
  const reduce = useReducedMotion();
  const w = useSharedValue(on && (reduce || !delay) ? 1 : 0);
  useEffect(() => { w.value = withDelay(delay, withTiming(on ? 1 : 0, { duration: reduce ? 0 : 450, easing: motion.easeOut })); }, [on]);
  const a = useAnimatedStyle(() => ({ transform: [{ scaleX: w.value }] }));
  return (
    <View style={s.seg}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color.tangerine, transformOrigin: 'left' }, a]} />
    </View>
  );
}

/* ───────── Titles ───────── */

export function Title({ children, lede }: { children: ReactNode; lede?: ReactNode }) {
  return (
    <View style={{ gap: space[2], marginBottom: space[6] }}>
      <Text variant="h1" accessibilityRole="header">{children}</Text>
      {lede ? <Text variant="body" tone="ink2">{lede}</Text> : null}
    </View>
  );
}

/* ───────── Field ───────── */

type FieldProps = TextInputProps & { label: string; icon?: ReactNode; hint?: string; error?: string | null; optional?: boolean; prefix?: ReactNode };

/** Visible label above, hint or error below; the error replaces the hint so the space doesn't jump. */
export const Field = forwardRef<TextInput, FieldProps>(function Field({ label, icon, hint, error, optional, prefix, style, onFocus, onBlur, autoFocus, ...rest }, ref) {
  const [focus, setFocus] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useImperativeHandle(ref, () => inputRef.current as TextInput);

  useEffect(() => {
    if (autoFocus && Platform.OS === 'android') {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  return (
    <View style={{ gap: space[2] }}>
      <View style={s.labelRow}>
        {icon}
        <Text variant="label" style={{ fontFamily: 'DMSans_600SemiBold' }}>{label}</Text>
        {optional && <Text variant="label" tone="ink3">(optional)</Text>}
      </View>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        accessible={false}
        collapsable={false}
        style={[s.input, focus && s.inputFocus, !!error && s.inputError]}
      >
        {prefix}
        <TextInput
          ref={inputRef}
          collapsable={false}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={color.ink4}
          style={[s.inputText, style]}
          onFocus={(e) => { setFocus(true); onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); onBlur?.(e); }}
          autoFocus={Platform.OS === 'android' ? false : autoFocus}
          {...rest}
        />
      </Pressable>
      {(error || hint) && (
        <Text variant="caption" tone={error ? 'roseInk' : 'ink3'} accessibilityLiveRegion={error ? 'polite' : 'none'}>{error ?? hint}</Text>
      )}
    </View>
  );
});

/* ───────── One-time code ───────── */

export type OtpHandle = { shake(): void; clear(): void; focus(): void };

/**
 * One hidden TextInput behind six boxes. That keeps SMS autofill, paste and
 * password managers working, which separate inputs per digit often break.
 */
export const OtpField = forwardRef<OtpHandle, { value: string; onChange(v: string): void; state?: 'idle' | 'checking' | 'ok' | 'bad'; length?: number; autoFocus?: boolean }>(
  function OtpField({ value, onChange, state = 'idle', length = 6, autoFocus = true }, ref) {
    const input = useRef<TextInput>(null);
    const x = useSharedValue(0);
    const reduce = useReducedMotion();
    const [focused, setFocused] = useState(false);
    useImperativeHandle(ref, () => ({
      shake() {
        if (reduce) return;
        x.value = withSequence(...[-10, 10, -10, 10, 0].map((v) => withTiming(v, { duration: 60 })));
      },
      clear() { onChange(''); },
      focus() { input.current?.focus(); },
    }));
    useEffect(() => {
      if (autoFocus && Platform.OS === 'android') {
        const timer = setTimeout(() => {
          input.current?.focus();
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [autoFocus]);
    const a = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
    return (
      <Pressable onPress={() => input.current?.focus()} accessibilityRole="none" collapsable={false}>
        <Animated.View style={[s.otpRow, a]} pointerEvents="none">
          {Array.from({ length }, (_, i) => {
            const ch = value[i] ?? '';
            const active = focused && i === Math.min(value.length, length - 1) && state === 'idle';
            return (
              <OtpBox key={i} ch={ch} active={active} state={state} index={i} />
            );
          })}
        </Animated.View>
        <TextInput
          ref={input}
          collapsable={false}
          value={value}
          onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
          maxLength={length}
          autoFocus={Platform.OS === 'android' ? false : autoFocus}
          editable={state !== 'checking' && state !== 'ok'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={`Verification code, ${length} digits`}
          style={s.otpHidden}
          caretHidden
        />
      </Pressable>
    );
  },
);

function OtpBox({ ch, active, state, index }: { ch: string; active: boolean; state: string; index: number }) {
  const pop = useSharedValue(1);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (state === 'ok' && !reduce) pop.value = withDelay(index * 40, withSequence(withTiming(0.88, { duration: 90 }), withSpring(1, motion.press.out)));
  }, [state]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <Animated.View
      style={[
        s.otpBox,
        ch && s.otpFilled,
        active && s.inputFocus,
        state === 'ok' && { backgroundColor: color.mintSoft, borderColor: color.mint },
        state === 'bad' && { borderColor: color.rose, backgroundColor: color.roseSoft },
        a,
      ]}
    >
      <Text variant="number" tone={state === 'ok' ? 'mintInk' : state === 'bad' ? 'roseInk' : 'midnight'}>{ch}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: space[6], paddingTop: space[2], paddingBottom: space[8] },
  footer: { paddingHorizontal: space[6], paddingTop: space[3], gap: space[2], backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[5], minHeight: 52, marginBottom: space[2] },
  back: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.card, borderWidth: 1.5, borderColor: color.lineSoft, alignItems: 'center', justifyContent: 'center' },
  progress: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[3] },
  segs: { flex: 1, flexDirection: 'row', gap: 6 },
  seg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: color.line, overflow: 'hidden' },
  count: { fontVariant: ['tabular-nums'], minWidth: 28, textAlign: 'right' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  input: { minHeight: 58, borderRadius: radius.md, backgroundColor: color.card, borderWidth: 1.5, borderColor: color.line, paddingHorizontal: space[4], flexDirection: 'row', alignItems: 'center', gap: space[3] },
  inputFocus: {
    borderColor: color.tangerine,
    ...Platform.select({
      ios: {
        shadowColor: color.tangerine,
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
  },
  inputError: { borderColor: color.rose },
  inputText: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 18, color: color.midnight, paddingVertical: 14, minWidth: 0, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  otpRow: { flexDirection: 'row', gap: space[2] },
  otpBox: { flex: 1, height: 64, borderRadius: radius.md, backgroundColor: color.card, borderWidth: 1.5, borderColor: color.line, alignItems: 'center', justifyContent: 'center' },
  otpFilled: { borderColor: color.midnight },
  otpHidden: { position: 'absolute', opacity: 0.011, width: '100%', height: '100%', color: 'transparent' },
});

import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import * as AppleAuthentication from 'expo-apple-authentication';
import { ArrowRight, Phone } from 'phosphor-react-native';
import { GoogleG, LogoMark } from '@/components/art/Brand';
import { Landing } from '@/components/art/Props';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { api, ApiError } from '@/api';
import { signInWithGoogle, signInWithApple } from '@/lib/social';
import { useSession } from '@/store/session';
import { color, radius, shadow, space } from '@/theme/tokens';

/** Real errands people send. The pill types them out so the product explains itself. */
const EXAMPLES = [
  'Bring my calculator from Moremi to LT3',
  'Buy 6 bottles of water, I’m at the stadium',
  'Pick up my laundry from Block C',
  'Take my file to the Faculty office',
];

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const setSession = useSession((s) => s.set);
  const signIn = useSession((s) => s.signIn);
  const [busy, setBusy] = useState<null | 'google' | 'apple'>(null);
  const [appleOk, setAppleOk] = useState(false);

  useEffect(() => { if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleOk).catch(() => {}); }, []);

  const phone = (flow: 'signup' | 'login') => { setSession({ flow }); router.push('/phone'); };

  const social = async (provider: 'google' | 'apple') => {
    setBusy(provider);
    try {
      const idToken = provider === 'google' ? await signInWithGoogle() : await signInWithApple();
      if (!idToken) return; // cancelled: stay put, no error
      const res = await api.oauth(provider, idToken);
      await signIn({ access_token: res.access_token, refresh_token: res.refresh_token }, res.me);
      setSession({ flow: 'signup' });
      router.push(res.needs_phone ? '/phone' : '/profile');
    } catch (e) {
      Alert.alert(`Couldn't sign in with ${provider === 'google' ? 'Google' : 'Apple'}`, e instanceof ApiError ? e.message : 'Try again, or continue with your phone number.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.tangerine }}>
      <StatusBar style="light" />
      <View style={[s.hero, { paddingTop: insets.top + space[4] }]}>
        <View style={s.brand} accessibilityRole="header" accessibilityLabel="Waydrop">
          <LogoMark size={34} />
          <Text variant="h2" tone="white" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>Waydrop</Text>
        </View>
        <Text variant="display" tone="white" align="center" style={{ marginTop: space[8] }}>
          Get it moved.{'\n'}Or get paid to move it.
        </Text>
        <View style={s.badge}><Text variant="label" tone="white" style={{ fontFamily: 'DMSans_600SemiBold' }}>Any campus. Any street.</Text></View>
        <Landing delay={150} from="below" style={{ alignSelf: 'stretch', marginTop: space[6] }}>
          <TypewriterPill onPress={() => phone('signup')} />
        </Landing>
      </View>

      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, space[4]) + space[2] }]}>
        <Button label="Continue with phone number" icon={<Phone size={20} weight="duotone" color={color.white} />} onPress={() => phone('signup')} />
        <Button label="Continue with Google" variant="secondary" icon={<GoogleG size={20} />} loading={busy === 'google'} disabled={!!busy && busy !== 'google'} onPress={() => social('google')} />
        {appleOk && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={28}
            style={{ height: 56, alignSelf: 'stretch' }}
            onPress={() => social('apple')}
          />
        )}
        <Button label="I already have an account" variant="ghost" onPress={() => phone('login')} style={{ minHeight: 48 }} />
        <Text variant="caption" tone="ink3" align="center">
          By continuing you agree to our <Text variant="caption" tone="ink2" style={s.link} onPress={() => {}}>Terms</Text> and <Text variant="caption" tone="ink2" style={s.link} onPress={() => {}}>Privacy Policy</Text>.
        </Text>
      </View>
    </View>
  );
}

/** A fake input that types example errands. Tapping it starts sign-up; it's honest about being a preview. */
function TypewriterPill({ onPress }: { onPress: () => void }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  const [text, setText] = useState(reduce ? EXAMPLES[0] : '');

  useEffect(() => {
    if (reduce) return;
    let i = 0, deleting = false, hold = 0, cancelled = false;
    const full = EXAMPLES[n];
    const tick = () => {
      if (cancelled) return;
      if (!deleting) {
        i++;
        setText(full.slice(0, i));
        if (i >= full.length) { deleting = true; hold = 1600; }
      } else if (hold > 0) {
        hold -= 50;
      } else {
        i -= 2;
        setText(full.slice(0, Math.max(0, i)));
        if (i <= 0) { setN((x) => (x + 1) % EXAMPLES.length); return; }
      }
      setTimeout(tick, deleting && hold <= 0 ? 18 : hold > 0 ? 50 : 42);
    };
    const t = setTimeout(tick, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [n, reduce]);

  return (
    <PressableScale onPress={onPress} style={[s.pill, shadow.prop]} accessibilityLabel="Describe an errand. Sign up to send your first one." accessibilityHint="Opens phone sign-up">
      <Text variant="body" tone={text ? 'midnight' : 'ink4'} numberOfLines={1} style={{ flex: 1 }}>
        {text || 'Describe what you need moved'}<Text tone="tangerine">{reduce ? '' : '|'}</Text>
      </Text>
      <View style={s.send}><ArrowRight size={20} weight="bold" color={color.white} /></View>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  hero: { flex: 1, paddingHorizontal: space[6], alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start' },
  badge: { marginTop: space[4], backgroundColor: color.midnight, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: space[3], backgroundColor: color.card, borderRadius: radius.pill, paddingLeft: space[5], paddingRight: 6, height: 60 },
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.tangerine, alignItems: 'center', justifyContent: 'center' },
  sheet: { backgroundColor: color.paper, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: space[6], paddingTop: space[6], gap: space[3] },
  link: { textDecorationLine: 'underline' },
});

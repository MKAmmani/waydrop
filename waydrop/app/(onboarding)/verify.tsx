import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { OtpField, Screen, StepHeader, Title, type OtpHandle } from '@/components/ui/Layout';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { api, ApiError } from '@/api';
import { pretty, toE164 } from '@/lib/phone';
import { error as hapticError, success } from '@/lib/haptics';
import { nextOnboardingRoute, useSession } from '@/store/session';
import { space } from '@/theme/tokens';

const RESEND_S = 30;

export default function Verify() {
  const digits = useSession((s) => s.phoneDigits);
  const flow = useSession((s) => s.flow);
  const signIn = useSession((s) => s.signIn);
  const setSession = useSession((s) => s.set);
  const [code, setCode] = useState('');
  const [state, setState] = useState<'idle' | 'checking' | 'ok' | 'bad'>('idle');
  const [msg, setMsg] = useState<string | null>(null);
  const [left, setLeft] = useState(RESEND_S);
  const otp = useRef<OtpHandle>(null);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  useEffect(() => { if (code.length === 6 && state === 'idle') check(code); }, [code]);

  const check = async (c: string) => {
    setState('checking');
    setMsg(null);
    try {
      const res = await api.verifyOtp(toE164(digits), c);
      setState('ok');
      success();
      // If they came via Google, the server links this phone to that account and returns the same user.
      await signIn({ access_token: res.access_token, refresh_token: res.refresh_token }, res.me);
      if (!res.is_new_user) setSession({ firstAction: 'send' }); // returning users skip "What first?"
      setTimeout(() => router.replace(nextOnboardingRoute(useSession.getState()) as never), 650);
    } catch (e) {
      setState('bad');
      hapticError();
      otp.current?.shake();
      const err = e instanceof ApiError ? e : null;
      setMsg(err?.message ?? 'Something went wrong. Try again.');
      if (err?.code === 'CODE_EXPIRED') setLeft(RESEND_S);
      setTimeout(() => { setCode(''); setState('idle'); otp.current?.focus(); }, 550);
    }
  };

  const resend = async () => {
    try {
      await api.requestOtp(toE164(digits));
      setLeft(RESEND_S);
      setMsg('New code sent.');
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'Couldn’t send a new code. Try again.');
    }
  };

  return (
    <Screen header={<StepHeader step={flow === 'login' ? undefined : 1} />}>
      <Title
        lede={
          <Text variant="body" tone="ink2">
            Sent to <Text variant="body" style={{ fontFamily: 'DMSans_600SemiBold' }}>{pretty(digits)}</Text>.{' '}
            <Text variant="body" tone="tangerineInk" style={{ fontFamily: 'DMSans_600SemiBold' }} onPress={() => router.back()} accessibilityRole="link">Change</Text>
          </Text>
        }
      >
        Enter the 6-digit code
      </Title>

      <OtpField ref={otp} value={code} onChange={(v) => { setCode(v); if (state === 'bad') setState('idle'); }} state={state} />

      <View style={{ minHeight: 48, justifyContent: 'center', marginTop: space[3] }}>
        {state === 'checking' && <Text variant="caption" tone="ink3">Checking…</Text>}
        {state === 'ok' && <Text variant="caption" tone="mintInk" style={{ fontFamily: 'DMSans_600SemiBold' }}>Number confirmed</Text>}
        {msg && state !== 'ok' && state !== 'checking' && (
          <Text variant="caption" tone={msg === 'New code sent.' ? 'mintInk' : 'roseInk'} accessibilityLiveRegion="polite">{msg}</Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <Text variant="label" tone="ink3">Didn’t get it?</Text>
        <PressableScale onPress={resend} disabled={left > 0} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 }} accessibilityLabel={left > 0 ? `Resend code in ${left} seconds` : 'Resend code'}>
          <Text variant="label" tone={left > 0 ? 'ink3' : 'tangerineInk'} style={{ fontFamily: 'DMSans_600SemiBold', fontVariant: ['tabular-nums'] }}>
            {left > 0 ? `Resend in 0:${String(left).padStart(2, '0')}` : 'Resend code'}
          </Text>
        </PressableScale>
      </View>
    </Screen>
  );
}

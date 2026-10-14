import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { DeviceMobile } from 'phosphor-react-native';
import { FlagNG } from '@/components/art/Brand';
import { StickyNote } from '@/components/art/Props';
import { Button } from '@/components/ui/Button';
import { Field, Screen, StepHeader, Title } from '@/components/ui/Layout';
import { Text } from '@/components/ui/Text';
import { api, ApiError } from '@/api';
import { formatNational, isValidNational, nationalDigits, toE164 } from '@/lib/phone';
import { useSession } from '@/store/session';
import { color, space } from '@/theme/tokens';

export default function PhoneScreen() {
  const flow = useSession((s) => s.flow);
  const saved = useSession((s) => s.phoneDigits);
  const setSession = useSession((s) => s.set);
  const [digits, setDigits] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const login = flow === 'login';
  const valid = isValidNational(digits);

  const submit = async () => {
    if (!valid) { setError('Enter a Nigerian mobile number, like 803 123 4567.'); return; }
    setLoading(true);
    setError(null);
    try {
      await api.requestOtp(toE164(digits));
      setSession({ phoneDigits: digits });
      router.push('/verify');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      header={<StepHeader step={login ? undefined : 1} />}
      footer={<Button label="Send code" onPress={submit} loading={loading} disabled={digits.length < 10} />}
    >
      <Title lede={login ? "Enter the number you signed up with. We'll text you a code." : "We'll text you a 6-digit code to make sure it's really you."}>
        {login ? 'Welcome back' : "What's your number?"}
      </Title>

      <Field
        label="Phone number"
        icon={<DeviceMobile size={18} weight="duotone" color={color.ink2} />}
        prefix={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 12, borderRightWidth: 1.5, borderRightColor: color.line, height: 28 }}>
            <FlagNG />
            <Text variant="h3">+234</Text>
          </View>
        }
        value={formatNational(digits)}
        onChangeText={(t) => { setDigits(nationalDigits(t)); if (error) setError(null); }}
        onSubmitEditing={submit}
        placeholder="803 123 4567"
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        importantForAutofill="no"
        autoFocus
        returnKeyType="send"
        error={error}
      />

      {!login && (
        <StickyNote tone="butter" width={230} rotate={2} style={{ marginTop: space[8], alignSelf: 'flex-end', marginRight: space[2] }}>
          Runners never see your number. Calls go through Waydrop.
        </StickyNote>
      )}
    </Screen>
  );
}

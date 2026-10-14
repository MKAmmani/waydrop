import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { BellRinging } from 'phosphor-react-native';
import { Blob, LogoMark } from '@/components/art/Brand';
import { Landing } from '@/components/art/Props';
import { Button } from '@/components/ui/Button';
import { Screen, StepHeader, Title } from '@/components/ui/Layout';
import { Text } from '@/components/ui/Text';
import { api } from '@/api';
import { requestAndRegisterPushToken } from '@/lib/notifications';
import { nextOnboardingRoute, useSession } from '@/store/session';
import { color, radius, shadow, space } from '@/theme/tokens';

export default function NotificationsPrime() {
  const setSession = useSession((s) => s.set);
  const [asking, setAsking] = useState(false);

  const done = () => { setSession({ notificationsAsked: true }); router.push(nextOnboardingRoute(useSession.getState()) as never); };

  const turnOn = async () => {
    setAsking(true);
    try {
      await requestAndRegisterPushToken((token, platform, locale) =>
        api.registerDevice(token, platform, locale)
      );
    } finally {
      setAsking(false);
      done();
    }
  };

  return (
    <Screen
      header={<StepHeader right={<Button label="Skip" variant="ghost" onPress={done} style={{ alignSelf: 'auto', paddingHorizontal: 12 }} />} />}
      footer={
        <>
          <Button label="Turn on notifications" icon={<BellRinging size={20} weight="duotone" color={color.white} />} onPress={turnOn} loading={asking} />
          <Button label="Maybe later" variant="ghost" onPress={done} />
        </>
      }
    >
      <View style={s.art} accessible={false}>
        <Landing delay={60} rotate={-2} style={{ alignSelf: 'stretch' }}>
          <Notif when="now" text="Tobi is 2 min from LT3 with your calculator." />
        </Landing>
        <Landing delay={200} rotate={2} style={{ alignSelf: 'stretch', marginTop: -10, marginLeft: 28, marginRight: -6 }}>
          <Notif when="9:12 PM" text="+₦720 just landed in your wallet." />
        </Landing>
        <Landing delay={320} rotate={-1} style={{ alignSelf: 'stretch', marginTop: -10, marginRight: 34 }}>
          <Notif when="8:40 PM" text="An errand fits your walk to the library." />
        </Landing>
        <Landing delay={420} from="below" style={{ position: 'absolute', right: -6, bottom: -26 }}><Blob size={92} /></Landing>
      </View>

      <Title lede="We tell you when a runner accepts or arrives, and when an errand fits your route. No spam.">Know the moment it moves</Title>
    </Screen>
  );
}

function Notif({ when, text }: { when: string; text: string }) {
  return (
    <View style={[s.notif, shadow[2]]}>
      <LogoMark size={36} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="label" style={{ fontFamily: 'DMSans_700Bold' }}>Waydrop</Text>
          <Text variant="caption" tone="ink3">{when}</Text>
        </View>
        <Text variant="label" tone="midnight">{text}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  art: { marginTop: space[4], marginBottom: space[10], paddingHorizontal: space[1] },
  notif: { flexDirection: 'row', gap: space[3], alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: radius.lg, padding: space[3] + 2, borderWidth: 1, borderColor: color.lineSoft },
});

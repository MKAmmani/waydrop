import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, Package, PersonSimpleWalk } from 'phosphor-react-native';
import { Blob, Coin, Parcel, Pin } from '@/components/art/Brand';
import { Landing } from '@/components/art/Props';
import { Screen } from '@/components/ui/Layout';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { success } from '@/lib/haptics';
import { useSession } from '@/store/session';
import { color, radius, shadow, space } from '@/theme/tokens';

export default function Ready() {
  const name = useSession((s) => s.me?.first_name) ?? 'there';
  const setSession = useSession((s) => s.set);
  useEffect(() => { success(); }, []);

  const choose = (firstAction: 'send' | 'earn') => { setSession({ firstAction }); router.replace('/home'); };

  return (
    <Screen bg="grid" header={<View style={{ height: space[4] }} />}>
      <View style={s.crew} accessible={false}>
        <Landing delay={0} rotate={-8} style={{ position: 'absolute', left: '6%', top: 46 }}><Parcel size={92} /></Landing>
        <Landing delay={90} style={{ position: 'absolute', left: '33%', top: 0 }}><Pin size={118} /></Landing>
        <Landing delay={180} rotate={8} style={{ position: 'absolute', right: '6%', top: 40 }}><Blob size={98} /></Landing>
        <Landing delay={260} from="below" style={{ position: 'absolute', left: '42%', top: 112 }}><Coin size={64} /></Landing>
      </View>

      <Text variant="display" align="center" accessibilityRole="header">You're in, {name}!</Text>
      <Text variant="body" tone="ink2" align="center" style={{ marginTop: space[2], marginBottom: space[8] }}>
        What would you like to do first? You can switch any time from the top of the map.
      </Text>

      {/* Two folders in a stack. The front one is the most common first step. */}
      <Folder tone="earn" title="Earn on my route" body="Carry errands where you're already going" icon={<PersonSimpleWalk size={26} weight="duotone" color={color.mintInk} />} onPress={() => choose('earn')} />
      <Folder tone="send" title="Send an errand" body="Get something moved for you" icon={<Package size={26} weight="duotone" color={color.white} />} onPress={() => choose('send')} front />
    </Screen>
  );
}

function Folder({ tone, title, body, icon, onPress, front }: { tone: 'send' | 'earn'; title: string; body: string; icon: ReactNode; onPress(): void; front?: boolean }) {
  const send = tone === 'send';
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} accessibilityLabel={`${title}. ${body}`} style={[{ marginTop: front ? -26 : 0 }, front && shadow[2]]}>
      <View style={[s.ear, { backgroundColor: send ? color.tangerine : '#D7F3E6', alignSelf: send ? 'flex-end' : 'flex-start' }]}>
        <Text variant="caption" tone={send ? 'white' : 'mintInk'} style={{ fontFamily: 'DMSans_700Bold' }}>{send ? 'Most people start here' : 'Verify once, then earn'}</Text>
      </View>
      <View style={[s.folder, { backgroundColor: send ? color.tangerine : '#D7F3E6' }, send ? { borderTopRightRadius: 0 } : { borderTopLeftRadius: 0, paddingBottom: space[5] + 30 }]}>
        <View style={[s.icon, { backgroundColor: send ? 'rgba(255,255,255,0.2)' : color.card }]}>{icon}</View>
        <View style={{ flex: 1 }}>
          <Text variant="h2" tone={send ? 'white' : 'midnight'} style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>{title}</Text>
          <Text variant="label" tone={send ? 'midnight' : 'ink2'}>{body}</Text>
        </View>
        <ArrowRight size={22} weight="bold" color={send ? color.white : color.midnight} />
      </View>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  crew: { height: 190, marginBottom: space[2] },
  ear: { paddingHorizontal: 14, height: 30, justifyContent: 'center', borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  folder: { flexDirection: 'row', alignItems: 'center', gap: space[4], borderRadius: radius.xl, padding: space[5], minHeight: 104 },
  icon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

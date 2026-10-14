/**
 * Map home (design 02), BUK edition.
 * The app follows where you are and shows only your site: no site buttons.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { ArrowCounterClockwise, Bell, Crosshair, IdentificationCard, Lightning, NavigationArrow, Package, PersonSimpleWalk, Sparkle, Wallet } from 'phosphor-react-native';
import { CampusMap } from '@/components/map/CampusMap';
import type { CampusMapHandle } from '@/components/map/types';
import { PressableScale } from '@/components/ui/PressableScale';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { api, type HomeData } from '@/api';
import { useSite } from '@/lib/sites';
import { tap } from '@/lib/haptics';
import { useSession } from '@/store/session';
import { color, motion, radius, shadow, space } from '@/theme/tokens';

const naira = (kobo: number) => '₦' + Math.round(kobo / 100).toLocaleString('en-NG');
const CHIPS: [string, string][] = [['Parcel', 'Bring my parcel from '], ['Food', 'Get my food from '], ['Forgotten item', 'Bring my '], ['Documents', 'Take my documents from '], ['Laundry', 'Pick up my laundry from ']];

export default function Home() {
  const me = useSession((s) => s.me);
  const firstAction = useSession((s) => s.firstAction);
  const insets = useSafeAreaInsets();
  const { height: H } = useWindowDimensions();
  const { site, you, changedTo, clearChange, locationOff } = useSite();
  const [mode, setMode] = useState<'request' | 'earn'>(firstAction === 'earn' ? 'earn' : 'request');
  const [data, setData] = useState<HomeData | null>(null);
  const map = useRef<CampusMapHandle>(null);
  const toast = useToast();

  useEffect(() => { api.home(site.id, mode).then(setData).catch(() => toast.show("Couldn't load what's around you. Try again in a moment.")); }, [site.id, mode]);
  useEffect(() => { if (changedTo) { toast.show(`You're at the ${changedTo.short} now`); clearChange(); } }, [changedTo]);

  const hour = new Date().getHours();
  const hello = `${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}, ${me?.first_name ?? 'there'}`;

  // Bottom sheet with two snap points; springs use the motion tokens.
  const sheetTop = insets.top + 110;
  const sheetH = H - sheetTop;
  const peek = mode === 'request' ? 290 : 330;
  const closedY = Math.max(0, sheetH - peek - insets.bottom);
  const y = useSharedValue(closedY);
  useEffect(() => { y.value = withSpring(closedY, motion.sheet); }, [closedY]);
  const start = useSharedValue(0);
  const pan = Gesture.Pan()
    .onBegin(() => { start.value = y.value; })
    .onUpdate((e) => { y.value = Math.max(0, Math.min(closedY, start.value + e.translationY)); })
    .onEnd((e) => {
      const open = e.velocityY < -400 || (e.velocityY < 400 && y.value < closedY / 2);
      y.value = withSpring(open ? 0 : closedY, motion.sheet);
      runOnJS(tap)();
    });
  const sheetA = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const dimA = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, closedY || 1], [0.28, 0]) }));
  const expand = () => { y.value = withSpring(0, motion.sheet); };

  const verified = me?.runner_status === 'verified';
  const initials = `${(me?.first_name ?? 'W')[0]}${(me?.last_name ?? '')[0] ?? ''}`;

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <StatusBar style="dark" />
      <CampusMap ref={map} center={site.center} you={you} runners={data?.runners ?? []} busy={data?.busy_spots ?? []} mode={mode} bottomInset={peek + insets.bottom} topInset={sheetTop} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color.midnight }, dimA]} />

      <View style={[st.top, { top: insets.top + space[2] }]}>
        <PressableScale style={[st.round, shadow[2]]} accessibilityLabel="Menu" onPress={() => toast.show('Menu comes with the profile section')}>
          <View style={st.ava}><Text variant="label" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>{initials}</Text></View>
        </PressableScale>
        <ModeSwitch mode={mode} onChange={(m) => { setMode(m); tap(); }} />
        <PressableScale style={[st.round, shadow[2]]} accessibilityLabel={`Notifications, ${data?.unread ?? 0} unread`} onPress={() => toast.show('Notifications come next')}>
          <Bell size={22} weight="duotone" color={color.midnight} />
          {!!data?.unread && <View style={st.badge}><Text variant="caption" tone="white" style={{ fontFamily: 'DMSans_700Bold', fontSize: 11, lineHeight: 14 }}>{data.unread}</Text></View>}
        </PressableScale>
      </View>

      <View style={[st.sub, { top: insets.top + 66 }]}>
        {locationOff ? (
          <PressableScale style={[st.banner, shadow[2]]} onPress={() => Linking.openSettings()} accessibilityLabel="Location is off. Open settings to turn it on.">
            <NavigationArrow size={16} weight="duotone" color={color.butter} />
            <Text variant="caption" tone="white" style={{ flexShrink: 1 }}>Location is off. Turn on</Text>
          </PressableScale>
        ) : (
          <View style={[st.live, shadow[1]]}>
            <View style={st.liveDot} />
            <Text variant="caption" tone="ink2" style={{ fontFamily: 'DMSans_600SemiBold' }}>
              {data ? (mode === 'earn' ? `${data.busy_spots.reduce((a, b) => a + b.count, 0)} errands waiting nearby` : `${data.runners_nearby} runners nearby`) : 'Looking around…'}
            </Text>
          </View>
        )}
        <PressableScale style={[st.wallet, shadow[2]]} accessibilityLabel={`Wallet balance ${data ? naira(data.balance) : ''}`} onPress={() => toast.show('Wallet comes in a later section')}>
          <Wallet size={18} weight="duotone" color={color.midnight} />
          <Text variant="label" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontVariant: ['tabular-nums'] }}>{data ? naira(data.balance) : '₦…'}</Text>
        </PressableScale>
      </View>

      <PressableScale style={[st.round, st.recenter, shadow[2], { bottom: peek + insets.bottom + 16 }]} accessibilityLabel="Centre the map on me" onPress={() => map.current?.recenter()}>
        <Crosshair size={22} weight="duotone" color={color.midnight} />
      </PressableScale>

      <Animated.View style={[st.sheet, shadow[2], { top: sheetTop, height: sheetH }, sheetA]}>
        <GestureDetector gesture={pan}>
          <View style={st.grab} accessibilityRole="adjustable" accessibilityLabel="Drag to open or close the panel"><View style={st.handle} /></View>
        </GestureDetector>
        <ScrollView contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: 140 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {mode === 'request' ? (
            <>
              <Text variant="caption" tone="ink3" style={{ fontFamily: 'DMSans_500Medium' }}>{hello}</Text>
              <Text variant="h2" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 24 }}>What do you need moved?</Text>
              <PressableScale style={st.ask} onPress={() => router.push('/send')} accessibilityLabel="Describe your errand">
                <Sparkle size={22} weight="duotone" color={color.tangerine} />
                <Text variant="body" tone="ink4" style={{ flex: 1 }}>Bring my calculator from my hostel to the library</Text>
              </PressableScale>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space[5], marginTop: space[3] }} contentContainerStyle={{ paddingHorizontal: space[5], gap: space[2] }}>
                {CHIPS.map(([c, hint]) => (
                  <PressableScale key={c} style={st.chip} scaleTo={0.92} onPress={() => router.push({ pathname: '/send', params: { text: hint } })}>
                    <Package size={16} weight="duotone" color={color.ink2} />
                    <Text variant="label">{c}</Text>
                  </PressableScale>
                ))}
              </ScrollView>
              {!!data?.send_again.length && (
                <Section title="Send again">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space[5] }} contentContainerStyle={{ paddingHorizontal: space[5], gap: space[3], paddingBottom: 6 }}>
                    {data.send_again.map((s) => (
                      <PressableScale key={s.id} style={[st.again, shadow[1]]} scaleTo={0.97} onPress={() => router.push({ pathname: '/send', params: { text: `Bring my ${s.item.toLowerCase()} from ${s.from} to ${s.to} for ${s.price / 100}` } })} accessibilityLabel={`Send again: ${s.item}, ${s.from} to ${s.to}, ${naira(s.price)}`}>
                        <Text variant="h3">{s.item}</Text>
                        <Text variant="caption" tone="ink2">{s.from} → {s.to}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space[3] }}>
                          <Text variant="label" tone="mintInk" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>{naira(s.price)}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><ArrowCounterClockwise size={14} weight="bold" color={color.tangerineInk} /><Text variant="caption" tone="tangerineInk" style={{ fontFamily: 'DMSans_600SemiBold' }}>Send again</Text></View>
                        </View>
                      </PressableScale>
                    ))}
                  </ScrollView>
                </Section>
              )}
              {!!data?.saved_places.length && (
                <Section title="Saved places">
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
                    {data.saved_places.map((p) => (
                      <PressableScale key={p.id} style={st.place} onPress={() => toast.show(`${p.label} gets filled into your errand`)}>
                        <Text variant="label" style={{ fontFamily: 'DMSans_600SemiBold' }}>{p.label}</Text>
                        <Text variant="caption" tone="ink3">{p.name}</Text>
                      </PressableScale>
                    ))}
                  </View>
                </Section>
              )}
            </>
          ) : verified ? (
            <>
              <Text variant="caption" tone="ink3" style={{ fontFamily: 'DMSans_500Medium' }}>Ready when you are</Text>
              <Text variant="h2" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 24 }}>Where are you heading?</Text>
              <PressableScale style={st.ask} onPress={() => { expand(); toast.show('Route setup comes in the earn section'); }} accessibilityLabel="Where are you heading">
                <NavigationArrow size={22} weight="duotone" color={color.tangerine} />
                <Text variant="body" tone="ink4" style={{ flex: 1 }}>Search a building, hostel or gate</Text>
              </PressableScale>
              <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[4] }}>
                <Stat label="Today" value={data ? naira(data.earn.today) : '…'} money />
                <Stat label="This week" value={data ? naira(data.earn.week) : '…'} sub={data ? `${data.earn.week_errands} errands, ${data.earn.rating} rating` : ''} />
              </View>
              <View style={st.note}><Lightning size={20} weight="duotone" color={color.tangerine} /><Text variant="label" tone="ink2" style={{ flex: 1 }}>Set where you're going. Errands on your way pop up by themselves.</Text></View>
            </>
          ) : (
            <>
              <Text variant="caption" tone="ink3" style={{ fontFamily: 'DMSans_500Medium' }}>Earn on your route</Text>
              <Text variant="h2" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 24 }}>One quick check first</Text>
              <View style={st.verify}>
                <Text variant="h3">Verify once, then earn on every walk</Text>
                <Text variant="label" tone="ink2" style={{ marginTop: 4 }}>Student ID or NIN, a quick selfie, about 2 minutes.</Text>
                <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center', marginTop: space[3] }}>
                  <IdentificationCard size={18} weight="duotone" color={color.mintInk} />
                  <Text variant="caption" tone="mintInk" style={{ fontFamily: 'DMSans_600SemiBold', flex: 1 }}>Most people are approved in under 5 minutes</Text>
                </View>
                <Button label="Start verification" onPress={() => toast.show('ID check is built in the earn section')} style={{ marginTop: space[4] }} />
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>
      {toast.node}
    </View>
  );
}

function ModeSwitch({ mode, onChange }: { mode: 'request' | 'earn'; onChange(m: 'request' | 'earn'): void }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(mode === 'earn' ? 1 : 0);
  useEffect(() => { x.value = withSpring(mode === 'earn' ? 1 : 0, motion.switch); }, [mode]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * (w / 2 - 4) }] }));
  const opt = (m: 'request' | 'earn', label: string, icon: ReactNode) => (
    <PressableScale key={m} scaleTo={0.96} haptic={false} style={st.opt} onPress={() => onChange(m)} accessibilityRole="tab" accessibilityState={{ selected: mode === m }} accessibilityLabel={m === 'request' ? 'Request an errand' : 'Earn on your route'}>
      {icon}
      <Text variant="label" tone={mode === m ? 'white' : 'ink2'} style={{ fontFamily: 'DMSans_600SemiBold' }}>{label}</Text>
    </PressableScale>
  );
  return (
    <View style={[st.switcher, shadow[2]]} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="tablist">
      {w > 0 && <Animated.View style={[st.pill, { width: w / 2 - 4 }, pill]} />}
      {opt('request', 'Request', <Package size={18} weight="duotone" color={mode === 'request' ? color.tangerine : color.ink2} />)}
      {opt('earn', 'Earn', <PersonSimpleWalk size={18} weight="duotone" color={mode === 'earn' ? color.mint : color.ink2} />)}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={{ marginTop: space[6] }}><Text variant="h3" style={{ fontFamily: 'BricolageGrotesque_700Bold', marginBottom: space[3] }}>{title}</Text>{children}</View>;
}
function Stat({ label, value, sub, money }: { label: string; value: string; sub?: string; money?: boolean }) {
  return (
    <View style={[st.stat, money && { backgroundColor: color.mintSoft }]}>
      <Text variant="caption" tone="ink2">{label}</Text>
      <Text variant="number" tone={money ? 'mintInk' : 'midnight'} style={{ fontSize: 24 }}>{value}</Text>
      {!!sub && <Text variant="caption" tone="ink3">{sub}</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  top: { position: 'absolute', left: space[4], right: space[4], flexDirection: 'row', alignItems: 'center', gap: space[2] + 2, zIndex: 20 },
  round: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.card, alignItems: 'center', justifyContent: 'center' },
  ava: { width: 42, height: 42, borderRadius: 21, backgroundColor: color.tangerineEdge, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 6, right: 6, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: color.tangerine, borderWidth: 2, borderColor: color.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  switcher: { flex: 1, height: 48, borderRadius: radius.pill, backgroundColor: color.card, flexDirection: 'row', padding: 4 },
  pill: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: radius.pill, backgroundColor: color.midnight },
  opt: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.pill },
  sub: { position: 'absolute', left: space[4], right: space[4], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 19 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.94)' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.mint },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: color.midnight, flexShrink: 1, marginRight: space[2] },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: color.card },
  recenter: { position: 'absolute', right: space[4], zIndex: 15 },
  sheet: { position: 'absolute', left: 0, right: 0, backgroundColor: color.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, zIndex: 10 },
  grab: { paddingTop: 10, paddingBottom: 8, alignItems: 'center' },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: color.line },
  ask: { flexDirection: 'row', gap: space[3], alignItems: 'center', marginTop: space[3], borderRadius: radius.lg, borderWidth: 1.5, borderColor: color.line, backgroundColor: color.paper, paddingHorizontal: space[4], minHeight: 58 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: color.line, backgroundColor: color.card },
  again: { width: 220, backgroundColor: color.card, borderRadius: radius.lg, padding: space[4], gap: 2 },
  place: { minHeight: 56, paddingHorizontal: space[4], justifyContent: 'center', borderRadius: radius.md, backgroundColor: color.paper, borderWidth: 1.5, borderColor: color.lineSoft },
  stat: { flex: 1, backgroundColor: color.paper, borderRadius: radius.lg, padding: space[4], gap: 2 },
  note: { flexDirection: 'row', gap: space[3], alignItems: 'center', marginTop: space[4], padding: space[4], borderRadius: radius.md, backgroundColor: color.tangerineSoft },
  verify: { marginTop: space[4], borderRadius: radius.xl, padding: space[5], backgroundColor: color.mintSoft },
});

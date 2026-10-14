import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { Eye, LockSimple, Star, UsersThree } from 'phosphor-react-native';
import { Blob } from '@/components/art/Brand';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Layout';
import { Text } from '@/components/ui/Text';
import { api, ApiError, type Task } from '@/api';
import { success } from '@/lib/haptics';
import { useDraft } from '@/store/errand';
import { color, radius, shadow, space } from '@/theme/tokens';

const naira = (kobo: number) => '₦' + Math.round(kobo / 100).toLocaleString('en-NG');

export default function Finding() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [t, setT] = useState<Task | null>(null);
  const [secs, setSecs] = useState(0);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const t0 = useRef(Date.now());
  const reset = useDraft((s) => s.reset);

  // Polling stands in for the WebSocket "task.updated" events in the contract.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try { const next = await api.getTask(id); if (!alive) return; setT((prev) => { if (prev?.status !== 'accepted' && next.status === 'accepted') success(); return next; }); } catch {}
    };
    tick();
    const a = setInterval(tick, 1000), b = setInterval(() => setSecs(Math.floor((Date.now() - t0.current) / 1000)), 500);
    return () => { alive = false; clearInterval(a); clearInterval(b); };
  }, [id]);

  const cancel = async () => {
    setBusy(true);
    try { const r = await api.cancelTask(id); setAsking(false); reset(); router.replace('/home'); setT(r); }
    catch (e) { setMsg(e instanceof ApiError ? e.message : 'Could not cancel. Try again.'); setAsking(false); }
    finally { setBusy(false); }
  };
  const raise = async (to: number) => {
    setBusy(true);
    try { const r = await api.raiseBounty(id, to); t0.current = Date.now(); setT(r); setMsg(`Offer raised to ${naira(to)}`); }
    catch (e) { setMsg(e instanceof ApiError ? e.message : 'Could not raise the offer.'); }
    finally { setBusy(false); }
  };

  if (!t) return <Screen bg="paper" scroll={false} contentStyle={{ justifyContent: 'center', alignItems: 'center' }}><Radar /></Screen>;

  if (t.status === 'accepted' && t.runner) {
    return (
      <Screen bg="paper" scroll={false} contentStyle={{ justifyContent: 'center' }} footer={<Button label="Back to the map" variant="secondary" onPress={() => { reset(); router.replace('/home'); }} />}>
        <Text variant="label" tone="mintInk" style={{ fontFamily: 'DMSans_700Bold' }}>Runner found</Text>
        <Text variant="h1" accessibilityRole="header">{t.runner.first_name} accepted your errand!</Text>
        <View style={[s.runner, shadow[1]]}>
          <View style={s.ava}><Text variant="h3" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>{t.runner.first_name[0]}</Text></View>
          <View style={{ flex: 1 }}>
            <Text variant="h3">{t.runner.first_name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Star size={14} weight="fill" color={color.butter} /><Text variant="caption" tone="ink2">{t.runner.rating} rating, {t.runner.trips} deliveries</Text></View>
          </View>
          <Text variant="label" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>{Math.round(t.runner.eta_s / 60)} min</Text>
        </View>
        <View style={s.pin} accessibilityLabel={`Your handshake PIN is ${t.pin.split('').join(' ')}`}>
          <Text variant="caption" tone="ink3">Your handshake PIN</Text>
          <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[2] }}>
            {t.pin.split('').map((n, i) => <View key={i} style={s.pinBox}><Text variant="number" tone="mintInk">{n}</Text></View>)}
          </View>
          <Text variant="caption" tone="ink2" style={{ marginTop: space[2] }}>Read it to {t.runner.first_name} only when the {t.item.toLowerCase()} is in your hands.</Text>
        </View>
        <Text variant="caption" tone="ink3" style={{ marginTop: space[4] }}>Live tracking and chat are built next.</Text>
      </Screen>
    );
  }

  const noMatch = t.search.no_match;
  // Jump straight to the usual price for this distance, so one raise is enough.
  const raiseTo = Math.max(t.suggested_min, t.bounty + 10000);
  return (
    <Screen bg="paper" scroll={false} contentStyle={{ justifyContent: 'center' }}
      footer={noMatch ? (
        <>
          <Button label={`Raise to ${naira(raiseTo)} and keep looking`} onPress={() => raise(raiseTo)} loading={busy} />
          <Button label={`Keep waiting at ${naira(t.bounty)}`} variant="secondary" onPress={() => { t0.current = Date.now(); setMsg('Still looking. We\u2019ll tell you the moment someone accepts.'); }} />
          <Button label={`Cancel and get ${naira(t.bounty)} back`} variant="ghost" onPress={() => setAsking(true)} />
        </>
      ) : <Button label="Cancel errand" variant="secondary" onPress={() => setAsking(true)} />}
    >
      {noMatch ? (
        <View style={{ alignItems: 'center' }}>
          <Blob size={104} />
          <Text variant="h1" align="center" style={{ marginTop: space[3] }}>No one's heading that way yet</Text>
          <Text variant="body" tone="ink2" align="center" style={{ marginTop: space[2] }}>It's quiet near {t.pickup.name} right now. A slightly higher offer usually gets picked up faster.</Text>
        </View>
      ) : (
        <>
          <View style={{ alignItems: 'center' }}><Radar /></View>
          <Text variant="h1" align="center" style={{ marginTop: space[5] }} accessibilityLiveRegion="polite">Finding someone headed your way</Text>
          <Text variant="body" tone="ink2" align="center">Near {t.pickup.name} · {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</Text>
          <View style={{ gap: space[2], marginTop: space[5] }}>
            {t.search.notified > 0 && <Line icon={<UsersThree size={18} weight="duotone" color={color.mintInk} />} text={`Sent to ${t.search.notified} runners nearby`} />}
            {t.search.viewing > 0 && <Line icon={<Eye size={18} weight="duotone" color={color.mintInk} />} text={`${t.search.viewing} runners are looking at it`} />}
          </View>
        </>
      )}
      <View style={s.held}><LockSimple size={20} weight="duotone" color={color.mintInk} /><Text variant="label" tone="ink2" style={{ flex: 1 }}><Text variant="label" style={{ fontFamily: 'DMSans_700Bold' }}>{naira(t.bounty)} is held safely.</Text> Cancel for free until someone accepts.</Text></View>
      {msg && <Text variant="caption" tone="ink2" align="center" style={{ marginTop: space[3] }} accessibilityLiveRegion="polite">{msg}</Text>}

      <Modal visible={asking} transparent animationType="fade" onRequestClose={() => setAsking(false)}>
        <View style={s.dim}>
          <View style={s.sheet}>
            <Text variant="h2" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>Cancel this errand?</Text>
            <Text variant="body" tone="ink2" style={{ marginTop: space[2] }}>Nobody has accepted yet, so it's free. {naira(t.bounty)} goes straight back to your wallet.</Text>
            <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[5] }}>
              <Button label="Keep looking" variant="secondary" onPress={() => setAsking(false)} style={{ flex: 1 }} />
              <Button label="Cancel errand" variant="danger" onPress={cancel} loading={busy} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Line({ icon, text }: { icon: ReactNode; text: string }) {
  return <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center', justifyContent: 'center' }}>{icon}<Text variant="label" tone="ink2">{text}</Text></View>;
}

/** Radar token: three tangerine rings, 1.8s loop, still when reduce motion is on. */
function Radar() {
  const reduce = useReducedMotion();
  return (
    <View style={{ width: 170, height: 170, alignItems: 'center', justifyContent: 'center' }} accessible={false}>
      {[0, 600, 1200].map((d) => <Ring key={d} delay={d} still={reduce} />)}
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: color.tangerine, borderWidth: 4, borderColor: color.white }} />
    </View>
  );
}
function Ring({ delay, still }: { delay: number; still: boolean }) {
  const p = useSharedValue(still ? 0.5 : 0);
  useEffect(() => { if (!still) p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) }), -1)); }, []);
  const a = useAnimatedStyle(() => ({ opacity: 0.8 * (1 - p.value), transform: [{ scale: 0.2 + p.value * 2.3 }] }));
  return <Animated.View style={[{ position: 'absolute', width: 70, height: 70, borderRadius: 35, borderWidth: 2.5, borderColor: color.tangerine, backgroundColor: 'rgba(255,85,0,0.07)' }, a]} />;
}

const s = StyleSheet.create({
  runner: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[5], padding: space[4], borderRadius: radius.lg, backgroundColor: color.card },
  ava: { width: 52, height: 52, borderRadius: 26, backgroundColor: color.tangerineEdge, alignItems: 'center', justifyContent: 'center' },
  pin: { marginTop: space[4], padding: space[4], borderRadius: radius.lg, backgroundColor: color.mintSoft },
  pinBox: { flex: 1, height: 60, borderRadius: radius.md, backgroundColor: color.card, alignItems: 'center', justifyContent: 'center' },
  held: { flexDirection: 'row', gap: space[3], alignItems: 'center', marginTop: space[6], padding: space[4], borderRadius: radius.md, backgroundColor: color.mintSoft },
  dim: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: color.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: space[6], paddingBottom: space[10] },
});

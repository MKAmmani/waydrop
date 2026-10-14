import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { CheckCircle, GraduationCap, MagnifyingGlass, MapPinLine, PersonSimpleWalk } from 'phosphor-react-native';
import { Pin } from '@/components/art/Brand';
import { Landing, MapScrap, StickyNote } from '@/components/art/Props';
import { Button } from '@/components/ui/Button';
import { Field, Screen, StepHeader, Title } from '@/components/ui/Layout';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { api, ApiError, type Area } from '@/api';
import { nextOnboardingRoute, useSession } from '@/store/session';
import { color, radius, shadow, space } from '@/theme/tokens';

type Detect = { phase: 'finding' } | { phase: 'found'; area: Area | null; runners: number; coords: { lat: number; lng: number } };

export default function AreaScreen() {
  const params = useLocalSearchParams<{ mode?: string; denied?: string; settings?: string }>();
  const [mode, setMode] = useState<'detect' | 'search'>(params.mode === 'detect' ? 'detect' : 'search');
  const [detect, setDetect] = useState<Detect>({ phase: 'finding' });
  const [note, setNote] = useState<'denied' | 'failed' | null>(params.denied ? 'denied' : null);
  const [saving, setSaving] = useState(false);
  const setSession = useSession((s) => s.set);

  useEffect(() => {
    if (mode !== 'detect') return;
    let alive = true;
    (async () => {
      try {
        const pos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 9000)),
        ]);
        const { latitude: lat, longitude: lng } = pos.coords;
        const res = await api.nearbyArea(lat, lng);
        if (alive) setDetect({ phase: 'found', area: res.area, runners: res.runners_active, coords: { lat, lng } });
      } catch {
        if (alive) { setNote('failed'); setMode('search'); }
      }
    })();
    return () => { alive = false; };
  }, [mode]);

  const save = async (area: Area) => {
    setSaving(true);
    try {
      const me = await api.updateMe({ area_id: area.id });
      setSession({ me, area });
      router.push(nextOnboardingRoute(useSession.getState()) as never);
    } catch (e) {
      setSaving(false);
      throw e;
    }
  };

  if (mode === 'detect') {
    if (detect.phase === 'finding') {
      return (
        <Screen header={<StepHeader step={3} />} scroll={false} contentStyle={{ alignItems: 'center', justifyContent: 'center' }}>
          <Radar />
          <Text variant="h2" align="center" style={{ marginTop: space[6] }} accessibilityLiveRegion="polite">Finding your area…</Text>
          <Text variant="body" tone="ink2" align="center" style={{ marginTop: space[2] }}>This takes a second.</Text>
        </Screen>
      );
    }
    const { area, runners, coords } = detect;
    const here: Area = area ?? { id: `geo:${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`, name: 'Your current spot', subtitle: 'No campus name here yet', lat: coords.lat, lng: coords.lng };
    return (
      <Screen
        header={<StepHeader step={3} />}
        footer={
          <>
            <Button label={area ? "Yes, that's right" : 'Use my current spot'} onPress={() => save(here)} loading={saving} />
            <Button label="Choose a different area" variant="ghost" onPress={() => setMode('search')} />
          </>
        }
      >
        <Title lede="Waydrop works anywhere. We'll show runners and errands around here first.">{area ? 'Is this your area?' : 'Waydrop works here too'}</Title>
        <Landing delay={40}>
          <View style={[s.card, shadow[2]]}>
            <View style={{ height: 170, overflow: 'hidden' }}><MapScrap width={380} height={200} rotate={0} delay={200} /></View>
            <View style={{ padding: space[4], gap: 2 }}>
              <Text variant="caption" tone="ink3">You're near</Text>
              <Text variant="h2" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>{here.name}</Text>
              <Text variant="caption" tone="ink3">{here.subtitle}</Text>
              <View style={s.chip}>
                <PersonSimpleWalk size={16} weight="duotone" color={color.mintInk} />
                <Text variant="caption" tone="mintInk" style={{ fontFamily: 'DMSans_600SemiBold' }}>{runners} runners active nearby</Text>
              </View>
            </View>
          </View>
        </Landing>
      </Screen>
    );
  }

  return <AreaSearch note={note} openSettings={params.settings === '1'} onPick={save} saving={saving} />;
}

function AreaSearch({ note, openSettings, onPick, saving }: { note: 'denied' | 'failed' | null; openSettings: boolean; onPick(a: Area): Promise<void>; saving: boolean }) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<Area[]>([]);
  const [picked, setPicked] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => api.searchAreas(q).then(setList).catch(() => setList([])), 150);
    return () => clearTimeout(t);
  }, [q]);

  const go = async () => {
    if (!picked) return;
    try { await onPick(picked); } catch (e) { setError(e instanceof ApiError ? e.message : 'Couldn’t save your area. Try again.'); }
  };

  return (
    <Screen header={<StepHeader step={3} />} footer={<Button label="Continue" onPress={go} loading={saving} disabled={!picked} />}>
      {note && (
        <StickyNote tone="butter" width={300} rotate={-1.5} tape={false} style={{ marginBottom: space[6] }}>
          <Text variant="label" style={{ fontFamily: 'DMSans_700Bold' }}>
            {note === 'denied' ? "Location is off, and that's okay." : "We couldn't find your location."}
          </Text>
          <Text variant="label" tone="ink2" style={{ marginTop: 4 }}>
            {note === 'denied' ? 'Pick your area to get started. You’ll drop a pin for each errand instead.' : 'Pick your area below. You can turn on location later in Settings.'}
          </Text>
          {openSettings && (
            <Text variant="label" tone="tangerineInk" style={{ fontFamily: 'DMSans_700Bold', marginTop: 8 }} onPress={() => Linking.openSettings()} accessibilityRole="link">
              Open Settings
            </Text>
          )}
        </StickyNote>
      )}

      <Title>Where do you spend most days?</Title>
      <Field label="Search" value={q} onChangeText={setQ} placeholder="Your campus, area or town" autoCorrect={false} icon={<MagnifyingGlass size={18} color={color.ink2} />} error={error} />

      <View style={[s.results, shadow[1]]} accessibilityRole="radiogroup">
        {list.length ? list.map((a) => {
          const on = picked?.id === a.id;
          return (
            <PressableScale key={a.id} onPress={() => setPicked(a)} scaleTo={0.98} style={[s.row, on && { backgroundColor: color.tangerineSoft }]} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${a.name}, ${a.subtitle}`}>
              <View style={s.rowIcon}>
                {/university|college|polytechnic/i.test(a.name) ? <GraduationCap size={20} weight="duotone" color={color.tangerineInk} /> : <MapPinLine size={20} weight="duotone" color={color.tangerineInk} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="h3" numberOfLines={1}>{a.name}</Text>
                <Text variant="caption" tone="ink3">{a.subtitle}</Text>
              </View>
              {on && <CheckCircle size={24} weight="fill" color={color.mint} />}
            </PressableScale>
          );
        }) : (
          <Text variant="label" tone="ink2" align="center" style={{ padding: space[5] }}>
            No match for "{q}". Waydrop still works there. Try a nearby landmark or town.
          </Text>
        )}
      </View>
    </Screen>
  );
}

/** Three tangerine rings from the radar token: 1.8s loop, 0.2 to 2.5 scale. */
function Radar() {
  const reduce = useReducedMotion();
  return (
    <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }} accessible={false}>
      {[0, 600, 1200].map((d) => <Ring key={d} delay={d} still={reduce} />)}
      <Pin size={88} />
    </View>
  );
}
function Ring({ delay, still }: { delay: number; still: boolean }) {
  const p = useSharedValue(still ? 0.5 : 0);
  useEffect(() => { if (!still) p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) }), -1)); }, []);
  const a = useAnimatedStyle(() => ({ opacity: 0.8 * (1 - p.value), transform: [{ scale: 0.2 + p.value * 2.3 }] }));
  return <Animated.View style={[s.ring, a]} />;
}

const s = StyleSheet.create({
  card: { backgroundColor: color.card, borderRadius: radius.xl, overflow: 'hidden' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: color.mintSoft, borderRadius: radius.pill, paddingHorizontal: 10, height: 30, marginTop: space[3] },
  results: { marginTop: space[4], backgroundColor: color.card, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], minHeight: 64, borderBottomWidth: 1, borderBottomColor: color.lineSoft },
  rowIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: color.tangerineSoft, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, borderColor: color.tangerine, backgroundColor: 'rgba(255,85,0,0.07)' },
});

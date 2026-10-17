import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { CheckCircle, GraduationCap, MagnifyingGlass, MapPinLine, NavigationArrow, PersonSimpleWalk } from 'phosphor-react-native';
import { Pin } from '@/components/art/Brand';
import { Landing, MapScrap, StickyNote } from '@/components/art/Props';
import { Button } from '@/components/ui/Button';
import { Field, Screen, StepHeader, Title } from '@/components/ui/Layout';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { api, ApiError, type Area } from '@/api';
import { nextOnboardingRoute, useSession } from '@/store/session';
import { color, radius, shadow, space } from '@/theme/tokens';

type Detect =
  | { phase: 'finding' }
  | { phase: 'found'; area: Area | null; runners: number; coords: { lat: number; lng: number }; nearby: Area[] };

export default function AreaScreen() {
  const params = useLocalSearchParams<{ mode?: string; denied?: string; settings?: string }>();
  const [mode, setMode] = useState<'detect' | 'search'>(params.mode === 'detect' ? 'detect' : 'search');
  const [detect, setDetect] = useState<Detect>({ phase: 'finding' });
  const [picked, setPicked] = useState<Area | null>(null);
  const [note, setNote] = useState<'denied' | 'failed' | null>(params.denied ? 'denied' : null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const setSession = useSession((s) => s.set);

  useEffect(() => {
    if (mode !== 'detect') return;
    let alive = true;
    (async () => {
      try {
        let pos = await Location.getLastKnownPositionAsync().catch(() => null);
        if (!pos) {
          pos = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000)),
          ]);
        }
        const { latitude: lat, longitude: lng } = pos.coords;
        const res = await api.nearbyArea(lat, lng);
        if (alive) {
          const list = res.nearby_areas ?? (res.area ? [res.area] : []);
          const primary = res.area ?? list[0] ?? null;
          setDetect({ phase: 'found', area: primary, runners: res.runners_active, coords: { lat, lng }, nearby: list });
          if (primary) setPicked(primary);
        }
      } catch {
        if (alive) {
          setNote('failed');
          setMode('search');
        }
      }
    })();
    return () => { alive = false; };
  }, [mode]);

  const save = async (area: Area) => {
    setSaving(true);
    setSaveError(null);
    try {
      const me = await api.updateMe({ area_id: area.id });
      setSession({ me, area });
      router.push(nextOnboardingRoute(useSession.getState()) as never);
    } catch (e) {
      setSaving(false);
      setSaveError(e instanceof ApiError ? e.message : 'Couldn’t save campus. Please try again.');
    }
  };

  if (mode === 'detect') {
    if (detect.phase === 'finding') {
      return (
        <Screen header={<StepHeader step={3} />} scroll={false} contentStyle={{ alignItems: 'center', justifyContent: 'center' }}>
          <Radar />
          <Text variant="h2" align="center" style={{ marginTop: space[6] }} accessibilityLiveRegion="polite">Finding campuses near you…</Text>
          <Text variant="body" tone="ink2" align="center" style={{ marginTop: space[2] }}>Checking active campus areas created by admin.</Text>
        </Screen>
      );
    }

    const { runners, nearby } = detect;
    const current = picked ?? detect.area ?? nearby[0] ?? null;

    return (
      <Screen
        header={<StepHeader step={3} />}
        footer={
          <>
            <Button
              label={current ? `Continue with ${current.name}` : 'Continue'}
              onPress={() => current && save(current)}
              loading={saving}
              disabled={!current}
            />
            <Button
              label="Choose a different area instead"
              variant="ghost"
              onPress={() => setMode('search')}
            />
          </>
        }
      >
        <Title lede="Select your campus from nearby active areas. Errands and runners around here will be prioritized.">
          Campuses near your location
        </Title>

        {saveError && (
          <StickyNote tone="butter" width={320} rotate={-1} tape={false} style={{ marginBottom: space[4] }}>
            <Text variant="label" tone="tangerineInk">{saveError}</Text>
          </StickyNote>
        )}

        {current && (
          <Landing delay={40}>
            <View style={[s.card, shadow[2]]}>
              <View style={{ height: 140, overflow: 'hidden' }}>
                <MapScrap width={380} height={180} rotate={0} delay={200} />
              </View>
              <View style={{ padding: space[4], gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="caption" tone="ink3">Selected campus</Text>
                  {current.distance_km != null && (
                    <View style={s.distChip}>
                      <NavigationArrow size={12} weight="bold" color={color.midnight} />
                      <Text variant="caption" tone="midnight" style={{ fontFamily: 'DMSans_700Bold' }}>
                        {current.distance_km < 1 ? `${Math.round(current.distance_km * 1000)} m away` : `${current.distance_km.toFixed(1)} km away`}
                      </Text>
                    </View>
                  )}
                </View>
                <Text variant="h2" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>{current.name}</Text>
                <Text variant="caption" tone="ink3">{current.subtitle}</Text>
                <View style={s.chip}>
                  <PersonSimpleWalk size={16} weight="duotone" color={color.mintInk} />
                  <Text variant="caption" tone="mintInk" style={{ fontFamily: 'DMSans_600SemiBold' }}>
                    {current.runners_active ?? runners} runners active nearby
                  </Text>
                </View>
              </View>
            </View>
          </Landing>
        )}

        {nearby.length > 0 && (
          <View style={{ marginTop: space[6] }}>
            <Text variant="h3" style={{ marginBottom: space[3], fontFamily: 'BricolageGrotesque_700Bold' }}>
              All nearby campuses
            </Text>
            <View style={[s.results, shadow[1]]} accessibilityRole="radiogroup">
              {nearby.map((a) => {
                const on = current?.id === a.id;
                return (
                  <PressableScale
                    key={a.id}
                    onPress={() => setPicked(a)}
                    scaleTo={0.98}
                    style={[s.row, on && { backgroundColor: color.tangerineSoft }]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${a.name}, ${a.subtitle}`}
                  >
                    <View style={s.rowIcon}>
                      {/university|college|polytechnic|buk|akth|unilag|oau|ui|abu|unn|cu/i.test(a.name) ? (
                        <GraduationCap size={20} weight="duotone" color={color.tangerineInk} />
                      ) : (
                        <MapPinLine size={20} weight="duotone" color={color.tangerineInk} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="h3" numberOfLines={1}>{a.name}</Text>
                      <Text variant="caption" tone="ink3">{a.subtitle}</Text>
                    </View>
                    {a.distance_km != null && (
                      <Text variant="caption" tone="ink2" style={{ fontFamily: 'DMSans_600SemiBold', marginRight: space[1] }}>
                        {a.distance_km < 1 ? `${Math.round(a.distance_km * 1000)}m` : `${a.distance_km.toFixed(1)}km`}
                      </Text>
                    )}
                    {on && <CheckCircle size={22} weight="fill" color={color.mint} />}
                  </PressableScale>
                );
              })}
            </View>
          </View>
        )}
      </Screen>
    );
  }

  return (
    <AreaSearch
      note={note}
      openSettings={params.settings === '1'}
      onPick={save}
      saving={saving}
      onSwitchToDetect={() => setMode('detect')}
    />
  );
}

function AreaSearch({
  note,
  openSettings,
  onPick,
  saving,
  onSwitchToDetect,
}: {
  note: 'denied' | 'failed' | null;
  openSettings: boolean;
  onPick(a: Area): Promise<void>;
  saving: boolean;
  onSwitchToDetect(): void;
}) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      api.searchAreas(q)
        .then((res) => {
          if (alive) {
            setList(res);
            setLoading(false);
          }
        })
        .catch(() => {
          if (alive) {
            setList([]);
            setLoading(false);
          }
        });
    }, 120);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const go = async () => {
    if (!picked) return;
    try {
      await onPick(picked);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t save your area. Try again.');
    }
  };

  return (
    <Screen
      header={<StepHeader step={3} />}
      footer={
        <>
          <Button
            label={picked ? `Continue with ${picked.name}` : 'Continue'}
            onPress={go}
            loading={saving}
            disabled={!picked}
          />
          <Button
            label="Use my current GPS location"
            variant="ghost"
            onPress={onSwitchToDetect}
          />
        </>
      }
    >
      {note && (
        <StickyNote tone="butter" width={300} rotate={-1.5} tape={false} style={{ marginBottom: space[6] }}>
          <Text variant="label" style={{ fontFamily: 'DMSans_700Bold' }}>
            {note === 'denied' ? "Location is off, and that's okay." : "We couldn't detect your location."}
          </Text>
          <Text variant="label" tone="ink2" style={{ marginTop: 4 }}>
            {note === 'denied'
              ? 'Pick your registered campus below to get started.'
              : 'Pick your registered campus from the system below.'}
          </Text>
          {openSettings && (
            <Text
              variant="label"
              tone="tangerineInk"
              style={{ fontFamily: 'DMSans_700Bold', marginTop: 8 }}
              onPress={() => Linking.openSettings()}
              accessibilityRole="link"
            >
              Open Settings
            </Text>
          )}
        </StickyNote>
      )}

      <Title lede="All registered campuses created by admin in the system. Search or pick yours.">
        Where do you spend most days?
      </Title>

      <Field
        label="Search campuses"
        value={q}
        onChangeText={setQ}
        placeholder="Type campus name, city or state…"
        autoCorrect={false}
        icon={<MagnifyingGlass size={18} color={color.ink2} />}
        error={error}
      />

      <View style={[s.results, shadow[1]]} accessibilityRole="radiogroup">
        {loading && list.length === 0 ? (
          <Text variant="label" tone="ink2" align="center" style={{ padding: space[5] }}>
            Loading registered campuses…
          </Text>
        ) : list.length > 0 ? (
          list.map((a) => {
            const on = picked?.id === a.id;
            return (
              <PressableScale
                key={a.id}
                onPress={() => setPicked(a)}
                scaleTo={0.98}
                style={[s.row, on && { backgroundColor: color.tangerineSoft }]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${a.name}, ${a.subtitle}`}
              >
                <View style={s.rowIcon}>
                  {/university|college|polytechnic|buk|akth|unilag|oau|ui|abu|unn|cu/i.test(a.name) ? (
                    <GraduationCap size={20} weight="duotone" color={color.tangerineInk} />
                  ) : (
                    <MapPinLine size={20} weight="duotone" color={color.tangerineInk} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="h3" numberOfLines={1}>{a.name}</Text>
                  <Text variant="caption" tone="ink3">{a.subtitle}</Text>
                </View>
                {on && <CheckCircle size={24} weight="fill" color={color.mint} />}
              </PressableScale>
            );
          })
        ) : (
          <Text variant="label" tone="ink2" align="center" style={{ padding: space[5] }}>
            No registered campus matches "{q}". Try a different campus name or city.
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
  useEffect(() => {
    if (!still) p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) }), -1));
  }, []);
  const a = useAnimatedStyle(() => ({ opacity: 0.8 * (1 - p.value), transform: [{ scale: 0.2 + p.value * 2.3 }] }));
  return <Animated.View style={[s.ring, a]} />;
}

const s = StyleSheet.create({
  card: { backgroundColor: color.card, borderRadius: radius.xl, overflow: 'hidden' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: color.mintSoft, borderRadius: radius.pill, paddingHorizontal: 10, height: 30, marginTop: space[3] },
  distChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color.sunken, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  results: { marginTop: space[4], backgroundColor: color.card, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], minHeight: 64, borderBottomWidth: 1, borderBottomColor: color.lineSoft },
  rowIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: color.tangerineSoft, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, borderColor: color.tangerine, backgroundColor: 'rgba(255,85,0,0.07)' },
});

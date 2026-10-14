import { useEffect, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, LockSimple, MagnifyingGlass, Minus, NotePencil, PersonSimpleWalk, Plus, ShieldCheck, UsersThree, Wallet, X } from 'phosphor-react-native';
import { Button } from '@/components/ui/Button';
import { Field, Screen, StepHeader } from '@/components/ui/Layout';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { api, ApiError, type Quote } from '@/api';
import { HERE, searchPlaces, type PickedPlace } from '@/lib/places';
import { useSite } from '@/lib/sites';
import { error as hapticError } from '@/lib/haptics';
import { useDraft } from '@/store/errand';
import { color, radius, shadow, space } from '@/theme/tokens';

const naira = (kobo: number) => '₦' + Math.round(kobo / 100).toLocaleString('en-NG');
const STEP = 5000, MIN = 10000;

export default function Review() {
  const d = useDraft();
  const { site } = useSite();
  const [q, setQ] = useState<Quote | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [picking, setPicking] = useState<null | 'pickup' | 'dropoff'>(null);
  const [noteOpen, setNoteOpen] = useState(!!d.note);
  const [locking, setLocking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { api.home(site.id, 'request').then((h) => setBalance(h.balance)).catch(() => {}); }, [site.id]);
  useEffect(() => {
    if (!d.pickup || !d.dropoff) { setQ(null); return; }
    api.quote(site.id, d.pickup.id, d.dropoff.id).then((res) => {
      setQ(res);
      if (d.offer == null) d.set({ offer: Math.round((res.suggested_min + res.suggested_max) / 2 / STEP) * STEP });
    }).catch(() => {});
  }, [d.pickup?.id, d.dropoff?.id]);

  const offer = d.offer ?? 0;
  const ready = !!(d.item && d.pickup && d.dropoff && offer >= MIN);
  const short = balance != null && offer > balance;
  const low = q && offer < q.suggested_min;
  const pos = q ? Math.max(3, Math.min(97, ((offer - q.suggested_min * 0.5) / (q.suggested_max * 1.25 - q.suggested_min * 0.5)) * 100)) : 50;

  const lock = async () => {
    if (!ready || !d.pickup || !d.dropoff) return;
    setLocking(true); setErr(null);
    try {
      const t = await api.createTask({ site_id: site.id, item: d.item, note: d.note, pickup: { id: d.pickup.id, name: d.pickup.name }, dropoff: { id: d.dropoff.id, name: d.dropoff.name }, bounty: offer });
      router.replace(`/finding?id=${t.id}`);
    } catch (e) {
      hapticError();
      setErr(e instanceof ApiError ? e.message : 'Something went wrong. Your money was not taken. Try again.');
    } finally { setLocking(false); }
  };

  const placeRow = (key: 'pickup' | 'dropoff') => {
    const pl = d[key], query = key === 'pickup' ? d.pickupQuery : d.dropoffQuery;
    return (
      <View style={s.prow}>
        <View style={key === 'pickup' ? s.gPick : s.gDrop} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="caption" tone="ink3">{key === 'pickup' ? 'Pickup' : 'Drop-off'}</Text>
          <Text variant="h3" numberOfLines={1} tone={pl ? 'midnight' : 'ink4'}>{pl?.name ?? (query || (key === 'pickup' ? 'Where is it now?' : 'Where should it go?'))}</Text>
          {!pl && !!query && <Text variant="caption" style={{ color: '#A16207' }}>We couldn't find this here</Text>}
        </View>
        <PressableScale onPress={() => setPicking(key)} style={[s.pbtn, !pl && s.pbtnNeed]} accessibilityLabel={`${pl ? 'Change' : 'Choose'} ${key === 'pickup' ? 'pickup' : 'drop-off'}`}>
          <Text variant="caption" tone={pl ? 'ink2' : 'white'} style={{ fontFamily: 'DMSans_600SemiBold' }}>{pl ? 'Change' : 'Choose'}</Text>
        </PressableScale>
      </View>
    );
  };

  return (
    <Screen
      bg="paper"
      header={<StepHeader />}
      footer={
        <>
          {err && <Text variant="caption" tone="roseInk" align="center" accessibilityLiveRegion="polite">{err}</Text>}
          <Button label={short ? 'Top up to continue' : `Lock ${naira(offer)} and find runner`} icon={<LockSimple size={20} weight="duotone" color={color.white} />} onPress={short ? () => setErr('Top-up is built with the wallet section. Lower the offer for now.') : lock} loading={locking} disabled={!ready} />
          <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
            <ShieldCheck size={16} weight="duotone" color={color.ink3} />
            <Text variant="caption" tone="ink3">{ready ? 'Held safely. Paid only when you give the runner your PIN.' : 'Add both places to continue.'}</Text>
          </View>
        </>
      }
    >
      <Text variant="caption" tone="ink3">Moving</Text>
      <Text variant="h1">{d.item || 'Something'}</Text>

      <View style={[s.card, shadow[1]]}>
        {placeRow('pickup')}
        <View style={s.conn}>{[0, 1, 2].map((i) => <View key={i} style={s.connDot} />)}</View>
        {placeRow('dropoff')}
        {q && (
          <View style={s.trip}>
            <PersonSimpleWalk size={16} weight="duotone" color={color.ink3} />
            <Text variant="caption" tone="ink2" style={{ flex: 1 }}>{q.distance_m < 1000 ? `${Math.round(q.distance_m / 10) * 10}m` : `${(q.distance_m / 1000).toFixed(1)}km`}, about {Math.max(2, Math.round(q.duration_s / 60))} min walk</Text>
            <UsersThree size={16} weight="duotone" color={color.ink3} />
            <Text variant="caption" tone="ink2">{q.runners_nearby} runners nearby</Text>
          </View>
        )}
      </View>

      <View style={{ marginTop: space[6] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] }}>
          <View style={{ flex: 1 }}>
            <Text variant="h3">Your offer</Text>
            <Text variant="caption" tone="ink3">Runner gets {naira(offer * 0.9)} after the {naira(offer * 0.1)} service fee</Text>
          </View>
          <View style={s.stepper}>
            <PressableScale style={s.stepBtn} onPress={() => d.set({ offer: Math.max(MIN, offer - STEP) })} disabled={offer <= MIN} accessibilityLabel="Lower offer"><Minus size={18} weight="bold" color={color.midnight} /></PressableScale>
            <Text variant="number" style={{ minWidth: 92, textAlign: 'center' }} accessibilityLiveRegion="polite">{naira(offer)}</Text>
            <PressableScale style={s.stepBtn} onPress={() => d.set({ offer: offer + STEP })} accessibilityLabel="Raise offer"><Plus size={18} weight="bold" color={color.midnight} /></PressableScale>
          </View>
        </View>
        {q && (
          <View style={{ marginTop: space[3] }}>
            <View style={s.bar}><View style={s.barMid} /><View style={[s.mark, { left: `${pos}%` }]} /></View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text variant="caption" tone="ink3">Slower</Text>
              <Text variant="caption" tone="ink3">Usual: {naira(q.suggested_min)} to {naira(q.suggested_max)}</Text>
              <Text variant="caption" tone="ink3">Faster</Text>
            </View>
            <Text variant="caption" style={{ marginTop: 6, color: low ? '#A16207' : color.ink2 }}>{low ? 'Offers below the usual range take longer to get picked up.' : offer > q.suggested_max ? 'Generous. Expect a quick match.' : 'Right in the usual range for this distance.'}</Text>
          </View>
        )}
      </View>

      {noteOpen ? (
        <View style={{ marginTop: space[5] }}>
          <Field label="Note for the runner" optional value={d.note} onChangeText={(t) => d.set({ note: t })} placeholder="e.g. Ask for Bilkisu at the porter's desk" />
        </View>
      ) : (
        <PressableScale style={s.addNote} onPress={() => setNoteOpen(true)} accessibilityLabel="Add a note for the runner, optional">
          <NotePencil size={18} weight="duotone" color={color.ink2} />
          <Text variant="label" tone="ink2" style={{ fontFamily: 'DMSans_600SemiBold' }}>Add a note for the runner</Text>
          <Text variant="label" tone="ink3">(optional)</Text>
        </PressableScale>
      )}

      <View style={[s.pay, short && { backgroundColor: color.roseSoft }]}>
        <View style={[s.payIc, short && { backgroundColor: color.card }]}><Wallet size={20} weight="duotone" color={short ? color.roseInk : color.mintInk} /></View>
        <View style={{ flex: 1 }}>
          <Text variant="label" style={{ fontFamily: 'DMSans_600SemiBold' }}>{short ? `You need ${naira(offer - (balance ?? 0))} more` : 'Pay from wallet'}</Text>
          <Text variant="caption" tone="ink3">Balance {balance != null ? naira(balance) : '…'}</Text>
        </View>
        {!short && balance != null && <View style={{ alignItems: 'flex-end' }}><Text variant="caption" tone="ink3">Left after</Text><Text variant="label" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>{naira(balance - offer)}</Text></View>}
      </View>

      <PlacePicker visible={!!picking} which={picking} siteId={site.id} onClose={() => setPicking(null)} onPick={(pl) => { if (picking) d.set({ [picking]: pl } as never); setPicking(null); }} />
    </Screen>
  );
}

function PlacePicker({ visible, which, siteId, onClose, onPick }: { visible: boolean; which: 'pickup' | 'dropoff' | null; siteId: Parameters<typeof searchPlaces>[0]; onClose(): void; onPick(p: PickedPlace): void }) {
  const [q, setQ] = useState('');
  const insets = useSafeAreaInsets();
  const list = searchPlaces(siteId, q);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: color.paper, paddingTop: Platform.OS === 'android' ? insets.top + space[3] : space[5] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[5], gap: space[3] }}>
          <Text variant="h2" style={{ flex: 1, fontFamily: 'BricolageGrotesque_800ExtraBold' }}>{which === 'pickup' ? 'Where is it now?' : 'Where should it go?'}</Text>
          <PressableScale onPress={onClose} style={s.close} accessibilityLabel="Close"><X size={20} weight="bold" color={color.midnight} /></PressableScale>
        </View>
        <View style={s.search}>
          <MagnifyingGlass size={18} color={color.ink3} />
          <TextInput value={q} onChangeText={setQ} autoFocus placeholder="Hostel, faculty, gate or market" placeholderTextColor={color.ink4} style={[{ flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 16, color: color.midnight, paddingVertical: 12 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]} accessibilityLabel="Search places" />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: insets.bottom + space[8] }} keyboardShouldPersistTaps="handled">
          <PressableScale style={s.item} onPress={() => onPick(HERE)}><View style={s.itemIc}><CheckCircle size={20} weight="duotone" color={color.tangerine} /></View><View style={{ flex: 1 }}><Text variant="h3">Use my current location</Text><Text variant="caption" tone="ink3">Where you are right now</Text></View></PressableScale>
          {list.map((p) => (
            <PressableScale key={p.id} style={s.item} onPress={() => onPick({ id: p.id, name: p.name, kind: p.kind })} accessibilityLabel={p.name}>
              <View style={s.itemIc}><Text variant="caption" tone="tangerineInk" style={{ fontFamily: 'DMSans_700Bold' }}>{p.kind.slice(0, 2).toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}><Text variant="h3">{p.name}</Text><Text variant="caption" tone="ink3">{p.site === 'town' ? 'Town market' : p.note ?? (p.aka?.[0] ? `Also called ${p.aka[0]}` : 'On campus')}</Text></View>
            </PressableScale>
          ))}
          {!list.length && <Text variant="label" tone="ink2" align="center" style={{ padding: space[6] }}>No place called "{q}" yet. Dropping a pin on the map is coming next; for now pick the closest place.</Text>}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: color.card, borderRadius: radius.xl, padding: space[4], marginTop: space[4] },
  prow: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 52 },
  gPick: { width: 16, height: 16, borderRadius: 8, borderWidth: 4, borderColor: color.tangerine, backgroundColor: color.white },
  gDrop: { width: 16, height: 16, borderRadius: 8, backgroundColor: color.tangerine },
  conn: { width: 16, alignItems: 'center', gap: 3, marginVertical: 2 },
  connDot: { width: 2, height: 3, borderRadius: 1, backgroundColor: color.line },
  pbtn: { height: 36, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1.5, borderColor: color.line, backgroundColor: color.card, justifyContent: 'center' },
  pbtnNeed: { backgroundColor: color.tangerine, borderColor: color.tangerine },
  trip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space[3], paddingTop: space[3], borderTopWidth: 1, borderStyle: 'dashed', borderColor: color.line },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.sunken, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 8, borderRadius: 4, backgroundColor: '#FDE7D8', overflow: 'visible', justifyContent: 'center' },
  barMid: { position: 'absolute', left: '20%', right: '20%', top: 0, bottom: 0, backgroundColor: '#BFEFD9' },
  mark: { position: 'absolute', width: 18, height: 18, marginLeft: -9, borderRadius: 9, backgroundColor: color.midnight, borderWidth: 3, borderColor: color.white },
  addNote: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 48, marginTop: space[4] },
  pay: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[4], padding: space[3], borderRadius: radius.lg, backgroundColor: color.sunken },
  payIc: { width: 40, height: 40, borderRadius: 13, backgroundColor: color.mintSoft, alignItems: 'center', justifyContent: 'center' },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.sunken, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: space[2], margin: space[5], marginBottom: space[3], paddingHorizontal: space[4], borderRadius: radius.md, borderWidth: 1.5, borderColor: color.line, backgroundColor: color.card },
  item: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 64, borderBottomWidth: 1, borderBottomColor: color.lineSoft },
  itemIc: { width: 40, height: 40, borderRadius: 13, backgroundColor: color.tangerineSoft, alignItems: 'center', justifyContent: 'center' },
});

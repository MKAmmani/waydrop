import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bank,
  Check,
  CheckCircle,
  Copy,
  CreditCard,
  Hash,
  LockSimple,
  Minus,
  NotePencil,
  PersonSimpleWalk,
  Plus,
  Question,
  ShieldCheck,
  UsersThree,
  Wallet,
  X,
} from 'phosphor-react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { MapPinIcon } from '@/components/art/Brand';
import { api, ApiError, type Quote } from '@/api';
import { CampusMap } from '@/components/map/CampusMap';
import { BUK_SITES } from '@/data/campuses/buk';
import { HERE, placesFor, type PickedPlace } from '@/lib/places';
import { useSite } from '@/lib/sites';
import { error as hapticError, success as hapticSuccess, tap } from '@/lib/haptics';
import { useDraft } from '@/store/errand';
import { useSession } from '@/store/session';
import { color, radius, shadow, space } from '@/theme/tokens';

const naira = (kobo: number) => '₦' + Math.round(kobo / 100).toLocaleString('en-NG');
const STEP_KOBO = 5000; // ₦50
const MIN_KOBO = 5000; // ₦50

export default function ReviewScreen() {
  const params = useLocalSearchParams<{ pinFor?: 'pickup' | 'dropoff' }>();
  const insets = useSafeAreaInsets();
  const { site } = useSite();
  const draft = useDraft();
  const toast = useToast();
  const sessionMe = useSession((s) => s.me);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [balance, setBalance] = useState<number>(sessionMe?.wallet?.balance_kobo ?? 0);
  const [virtualAccount, setVirtualAccount] = useState<string>(
    sessionMe?.wallet?.virtual_account_nuban ?? '8010000000'
  );
  const [noteOpen, setNoteOpen] = useState(!!draft.note);
  const [lockingState, setLockingState] = useState<'idle' | 'locking' | 'locked'>('idle');
  const [err, setErr] = useState<string | null>(null);

  // Pin Drop state
  const [pinMode, setPinMode] = useState<null | 'pickup' | 'dropoff'>(
    params.pinFor ?? null
  );
  const [pinNearText, setPinNearText] = useState(
    draft.pickup?.name ? `Near ${draft.pickup.name}` : 'Pinned location'
  );

  // Top Up modal state
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmt, setTopupAmt] = useState(1000); // in Naira
  const [topupMethod, setTopupMethod] = useState<'transfer' | 'card' | 'ussd'>('transfer');
  const [topupProcessing, setTopupProcessing] = useState<'idle' | 'busy' | 'done'>('idle');

  // Load home wallet balance & virtual account
  useEffect(() => {
    api
      .home(site.id, 'request')
      .then((h) => {
        if (h.balance != null) setBalance(h.balance);
        if (h.wallet?.virtual_account_nuban) {
          setVirtualAccount(h.wallet.virtual_account_nuban);
        }
      })
      .catch(() => {});
  }, [site.id]);

  // Load quote
  useEffect(() => {
    const fromId = draft.pickup?.id ?? 'here';
    const toId = draft.dropoff?.id ?? 'lt3';
    api
      .quote(site.id, fromId, toId)
      .then((res) => {
        setQuote(res);
        if (draft.offer == null) {
          const mid = Math.round((res.suggested_min + res.suggested_max) / 2 / STEP_KOBO) * STEP_KOBO;
          draft.set({ offer: mid });
        }
      })
      .catch(() => {});
  }, [draft.pickup?.id, draft.dropoff?.id]);

  const offer = draft.offer ?? 30000;
  const isShort = offer > balance;
  const deficitNaira = Math.max(0, Math.ceil((offer - balance) / 100));

  const isReady = !!(draft.item && draft.pickup && draft.dropoff && offer >= MIN_KOBO);
  const isLow = quote ? offer < quote.suggested_min : false;
  const isGenerous = quote ? offer > quote.suggested_max : false;

  // Usual range indicator position
  const rangePos = useMemo(() => {
    if (!quote) return 50;
    const minBound = quote.suggested_min * 0.5;
    const maxBound = quote.suggested_max * 1.25;
    const pct = ((offer - minBound) / (maxBound - minBound)) * 100;
    return Math.max(4, Math.min(96, pct));
  }, [quote, offer]);

  // Lock and find runner
  const handleLock = async () => {
    if (!isReady || !draft.pickup || !draft.dropoff || isShort) return;
    tap();
    setLockingState('locking');
    setErr(null);

    setTimeout(async () => {
      try {
        const task = await api.createTask({
          site_id: site.id,
          item: draft.item,
          note: draft.note,
          pickup: { id: draft.pickup!.id, name: draft.pickup!.name },
          dropoff: { id: draft.dropoff!.id, name: draft.dropoff!.name },
          bounty: offer,
        });
        setLockingState('locked');
        hapticSuccess();
        setBalance((prev) => Math.max(0, prev - offer));

        setTimeout(() => {
          router.replace(`/finding?id=${task.id}`);
        }, 600);
      } catch (e) {
        hapticError();
        setLockingState('idle');
        setErr(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
      }
    }, 1100);
  };

  /* ─────────────────────────────────────────────────────────────
     PIN DROP LOGIC
  ───────────────────────────────────────────────────────────── */
  const openPin = (target: 'pickup' | 'dropoff') => {
    tap();
    const cur = target === 'pickup' ? draft.pickup : draft.dropoff;
    setPinNearText(cur ? `Near ${cur.name}` : `Selected ${target === 'pickup' ? 'pickup' : 'drop-off'} spot`);
    setPinMode(target);
  };

  const confirmPin = () => {
    if (!pinMode) return;
    tap();
    const targetName = pinMode === 'pickup' ? 'Pickup spot' : 'Drop-off spot';
    const pinnedPlace: PickedPlace = {
      id: `pin-${Date.now()}`,
      name: pinNearText || `Pinned ${targetName.toLowerCase()}`,
      kind: 'landmark',
    };
    if (pinMode === 'pickup') {
      draft.set({ pickup: pinnedPlace, pickupQuery: pinnedPlace.name });
    } else {
      draft.set({ dropoff: pinnedPlace, dropoffQuery: pinnedPlace.name });
    }
    toast.show(`${pinMode === 'pickup' ? 'Pickup' : 'Drop-off'} spot set`);
    setPinMode(null);
  };

  /* ─────────────────────────────────────────────────────────────
     TOP UP LOGIC
  ───────────────────────────────────────────────────────────── */
  const openTopUp = () => {
    tap();
    const needed = Math.max(500, Math.ceil(deficitNaira / 500) * 500);
    setTopupAmt(needed);
    setTopupProcessing('idle');
    setTopupOpen(true);
  };

  const copyAccount = () => {
    tap();
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(virtualAccount);
    }
    toast.show(`Account number ${virtualAccount} copied`);
  };

  const submitTopup = async () => {
    tap();
    setTopupProcessing('busy');
    try {
      await api.topup(topupAmt * 100, topupMethod);
      setTimeout(() => {
        setTopupProcessing('done');
        hapticSuccess();
        setBalance((prev) => prev + topupAmt * 100);

        setTimeout(() => {
          setTopupOpen(false);
          toast.show(`₦${topupAmt.toLocaleString('en-NG')} added to your wallet`);
        }, 1200);
      }, 1800);
    } catch {
      setTopupProcessing('idle');
      toast.show('Failed to process top-up. Try again.');
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {toast.node}

      {/* Top Header */}
      <View style={s.topNav}>
        <PressableScale
          style={s.backCircle}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/send'))}
          accessibilityLabel="Back to edit"
        >
          <ArrowLeft size={20} weight="bold" color={color.midnight} />
        </PressableScale>
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Edit row */}
        <View style={s.rvTopRow}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" tone="ink3" style={{ fontWeight: '500' }}>
              Moving
            </Text>
            <Text variant="h1" style={{ marginTop: 2, fontSize: 26 }}>
              {draft.item || 'Something'}
            </Text>
          </View>
          <PressableScale
            onPress={() => router.push('/send')}
            accessibilityLabel="Edit errand description"
            style={s.editBtn}
          >
            <Text variant="label" tone="tangerineInk" style={{ fontFamily: 'DMSans_700Bold' }}>
              Edit
            </Text>
          </PressableScale>
        </View>

        {/* Places Card (Pickup -> Connector -> Dropoff) */}
        <View style={[s.placesCard, shadow[1]]}>
          {/* Pickup row */}
          <PlaceRow
            type="pickup"
            place={draft.pickup}
            query={draft.pickupQuery}
            onAdjust={() => openPin('pickup')}
          />

          {/* Connector dots */}
          <View style={s.conn}>
            <View style={s.connDot} />
            <View style={s.connDot} />
            <View style={s.connDot} />
          </View>

          {/* Dropoff row */}
          <PlaceRow
            type="dropoff"
            place={draft.dropoff}
            query={draft.dropoffQuery}
            onAdjust={() => openPin('dropoff')}
          />

          {/* Trip stats: Distance, walk time, runners nearby */}
          {quote && (
            <View style={s.tripRow}>
              <PersonSimpleWalk size={16} weight="duotone" color={color.ink3} />
              <Text variant="caption" tone="ink2" style={{ flex: 1 }}>
                {quote.distance_m < 1000
                  ? `${Math.round(quote.distance_m / 10) * 10}m`
                  : `${(quote.distance_m / 1000).toFixed(1)}km`}
                , about {Math.max(2, Math.round(quote.duration_s / 60))} min walk
              </Text>
              <UsersThree size={16} weight="duotone" color={color.ink3} />
              <Text variant="caption" tone="ink2">
                {quote.runners_nearby} runners nearby
              </Text>
            </View>
          )}
        </View>

        {/* Offer Stepper & Usual Range Section */}
        <View style={{ marginTop: space[5] }}>
          <View style={s.offerRow}>
            <View style={{ flex: 1 }}>
              <Text variant="label" style={{ fontSize: 16, fontFamily: 'DMSans_700Bold' }}>
                Your offer
              </Text>
              <Text variant="caption" tone="ink3" style={{ marginTop: 2 }}>
                Runner gets {naira(offer * 0.9)} after the {naira(offer * 0.1)} service fee
              </Text>
            </View>

            <View style={s.stepper}>
              <PressableScale
                style={s.stepBtn}
                onPress={() => {
                  tap();
                  draft.set({ offer: Math.max(MIN_KOBO, offer - STEP_KOBO) });
                }}
                disabled={offer <= MIN_KOBO}
                accessibilityLabel="Lower offer"
              >
                <Minus size={18} weight="bold" color={color.midnight} />
              </PressableScale>

              <Text variant="number" style={s.stepperAmt} accessibilityLiveRegion="polite">
                {naira(offer)}
              </Text>

              <PressableScale
                style={s.stepBtn}
                onPress={() => {
                  tap();
                  draft.set({ offer: offer + STEP_KOBO });
                }}
                accessibilityLabel="Raise offer"
              >
                <Plus size={18} weight="bold" color={color.midnight} />
              </PressableScale>
            </View>
          </View>

          {/* Usual Range Bar */}
          {quote && (
            <View style={{ marginTop: space[3] }}>
              <View style={s.rangeBar}>
                <View style={[s.rangeMarker, { left: `${rangePos}%` }]} />
              </View>
              <View style={s.rangeLabels}>
                <Text variant="caption" tone="ink3">
                  Slower
                </Text>
                <Text variant="caption" tone="ink3" style={{ fontWeight: '500' }}>
                  Usual: {naira(quote.suggested_min)} to {naira(quote.suggested_max)}
                </Text>
                <Text variant="caption" tone="ink3">
                  Faster
                </Text>
              </View>
              <Text
                variant="caption"
                style={[
                  s.rangeMessage,
                  isLow && { color: '#A16207' },
                ]}
              >
                {isLow
                  ? 'Offers below the usual range take longer to get picked up.'
                  : isGenerous
                  ? 'Generous. Expect a quick match.'
                  : 'Right in the usual range for this distance.'}
              </Text>
            </View>
          )}
        </View>

        {/* Note for runner */}
        <View style={{ marginTop: space[4] }}>
          {noteOpen ? (
            <View style={s.noteWrap}>
              <Text variant="label" style={{ fontFamily: 'DMSans_600SemiBold', marginBottom: 6 }}>
                Note for the runner{' '}
                <Text variant="caption" tone="ink3" style={{ fontWeight: '400' }}>
                  (optional)
                </Text>
              </Text>
              <TextInput
                value={draft.note}
                onChangeText={(t) => draft.set({ note: t })}
                placeholder="e.g. Ask for Bola at the porter's desk"
                placeholderTextColor={color.ink4}
                style={s.noteInput}
                multiline
              />
            </View>
          ) : (
            <PressableScale
              style={s.addNoteBtn}
              onPress={() => {
                tap();
                setNoteOpen(true);
              }}
              accessibilityLabel="Add note for runner"
            >
              <NotePencil size={18} weight="duotone" color={color.ink2} />
              <Text variant="label" style={{ fontFamily: 'DMSans_600SemiBold', color: color.ink2 }}>
                Add a note for the runner
              </Text>
              <Text variant="label" tone="ink3">
                (optional)
              </Text>
            </PressableScale>
          )}
        </View>

        {/* Wallet / Low Balance Section */}
        {isShort ? (
          <View style={s.shortCard}>
            <Wallet size={22} weight="duotone" color={color.roseInk} />
            <View style={{ flex: 1 }}>
              <Text variant="label" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                You need {naira(offer - balance)} more
              </Text>
              <Text variant="caption" tone="ink2">
                Your balance is {naira(balance)}.
              </Text>
            </View>
            <Button
              label="Top up"
              onPress={openTopUp}
              style={{ width: 'auto', minWidth: 84, height: 42, paddingHorizontal: 16 }}
            />
          </View>
        ) : (
          <View style={s.payCard}>
            <View style={s.payIconBox}>
              <Wallet size={20} weight="duotone" color={color.mintInk} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label" style={{ fontFamily: 'DMSans_600SemiBold' }}>
                Pay from wallet
              </Text>
              <Text variant="caption" tone="ink3">
                Balance {naira(balance)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="caption" tone="ink3">
                Left after
              </Text>
              <Text variant="label" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>
                {naira(balance - offer)}
              </Text>
            </View>
          </View>
        )}

        {/* Error notice if any */}
        {err && (
          <Text variant="caption" tone="roseInk" align="center" style={{ marginTop: space[3] }}>
            {err}
          </Text>
        )}

        {/* Primary Lock Button */}
        <View style={{ marginTop: space[5] }}>
          <Button
            label={
              lockingState === 'locking'
                ? `Locking ${naira(offer)}…`
                : lockingState === 'locked'
                ? `${naira(offer)} locked`
                : `Lock ${naira(offer)} & find runner`
            }
            icon={
              lockingState === 'locked' ? (
                <Check size={20} weight="bold" color={color.midnight} />
              ) : (
                <LockSimple size={20} weight="duotone" color={color.white} />
              )
            }
            onPress={handleLock}
            disabled={!isReady || isShort || lockingState !== 'idle'}
            loading={lockingState === 'locking'}
          />

          <View style={s.shieldRow}>
            <ShieldCheck size={16} weight="duotone" color={color.ink3} />
            <Text variant="caption" tone="ink3" align="center" style={{ flex: 1 }}>
              {!isReady
                ? 'Add both places to continue.'
                : 'Held safely. It only goes to the runner when you read them your PIN.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ─────────────────────────────────────────────────────────────
         INTERACTIVE PIN DROP MODAL (pinmode)
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={pinMode != null} animationType="fade" transparent onRequestClose={() => setPinMode(null)}>
        <View style={s.pinOverlay}>
          {/* Active Campus Map Backdrop */}
          <CampusMap
            center={BUK_SITES.new}
            you={BUK_SITES.new}
            runners={[]}
            busy={[]}
            mode="request"
          />

          {/* Top Floating Proximity Card */}
          <View style={[s.pinTopCard, shadow[2], { top: insets.top + 20 }]}>
            <View style={s.pinTopIconBox}>
              <MapPinIcon size={22} color={color.tangerine} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="caption" tone="ink3">
                {pinMode === 'pickup' ? 'Pickup spot' : 'Drop-off spot'}
              </Text>
              <Text variant="h3" numberOfLines={1}>
                {pinNearText}
              </Text>
            </View>
          </View>

          {/* Center Pin Indicator */}
          <View pointerEvents="none" style={s.pinCenter}>
            <View style={s.pinHead} />
            <View style={s.pinStick} />
            <View style={s.pinShadow} />
          </View>

          {/* Bottom Actions */}
          <View style={[s.pinActions, { bottom: insets.bottom + 20 }]}>
            <Button
              label="Cancel"
              variant="secondary"
              onPress={() => setPinMode(null)}
              style={{ flex: 1 }}
            />
            <Button
              label={pinMode === 'pickup' ? 'Set pickup here' : 'Set drop-off here'}
              onPress={confirmPin}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
         INTERACTIVE TOP UP MODAL (topup)
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={topupOpen} animationType="slide" transparent onRequestClose={() => setTopupOpen(false)}>
        <View style={s.topupBackdrop}>
          <View style={[s.topupSheet, { paddingBottom: insets.bottom + 20 }]}>
            {/* Header */}
            <View style={s.topupHeader}>
              <Text variant="h2" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 24 }}>
                Add money
              </Text>
              <PressableScale style={s.closeCircle} onPress={() => setTopupOpen(false)}>
                <X size={20} weight="bold" color={color.midnight} />
              </PressableScale>
            </View>

            {topupProcessing === 'idle' ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text variant="body" tone="ink2" style={{ marginTop: 4 }}>
                  You need {naira(deficitNaira * 100)} more for this errand.
                </Text>

                {/* Amount input & Quick Chips */}
                <View style={[s.card, shadow[1], { marginTop: space[4] }]}>
                  <Text variant="caption" tone="ink3" style={{ fontWeight: '600' }}>
                    Amount
                  </Text>
                  <View style={s.topupInputWrap}>
                    <Text variant="h2" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.ink2 }}>
                      ₦
                    </Text>
                    <TextInput
                      value={topupAmt ? topupAmt.toLocaleString('en-NG') : ''}
                      onChangeText={(t) => setTopupAmt(Number(t.replace(/\D/g, '')) || 0)}
                      keyboardType="numeric"
                      style={s.topupTextInput}
                    />
                  </View>

                  <View style={s.quickChipsRow}>
                    {[deficitNaira, 1000, 2000, 5000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((amt) => (
                      <PressableScale
                        key={amt}
                        style={[s.qChip, topupAmt === amt && s.qChipOn]}
                        onPress={() => {
                          tap();
                          setTopupAmt(amt);
                        }}
                      >
                        <Text
                          variant="label"
                          style={[
                            { fontFamily: 'DMSans_600SemiBold' },
                            topupAmt === amt && { color: color.white },
                          ]}
                        >
                          ₦{amt.toLocaleString('en-NG')}
                        </Text>
                      </PressableScale>
                    ))}
                  </View>
                </View>

                {/* Payment Methods */}
                <Text variant="h3" style={{ marginTop: space[5], fontSize: 17 }}>
                  How do you want to pay?
                </Text>

                {/* Option 1: Bank Transfer with Dedicated Virtual Account */}
                <View style={[s.methodCard, topupMethod === 'transfer' && s.methodCardOn, { flexDirection: 'column' }]}>
                  <PressableScale
                    style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, width: '100%' }}
                    onPress={() => {
                      tap();
                      setTopupMethod('transfer');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Pay with Bank transfer"
                  >
                    <View style={s.methodIcon}>
                      <Bank size={20} weight="duotone" color={color.ink2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="label" style={{ fontFamily: 'DMSans_700Bold' }}>
                        Bank transfer
                      </Text>
                      <Text variant="caption" tone="ink3">
                        Arrives in seconds. No fee.
                      </Text>
                    </View>
                  </PressableScale>

                  {topupMethod === 'transfer' && (
                    <View style={[s.virtualAcctBox, { width: '100%' }]}>
                      <View style={s.vaNumRow}>
                        <Text variant="h2" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', letterSpacing: 1 }}>
                          {virtualAccount.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}
                        </Text>
                        <PressableScale style={s.copyPill} onPress={copyAccount} accessibilityLabel="Copy account number">
                          <Copy size={14} weight="bold" color={color.tangerineInk} />
                          <Text variant="caption" tone="tangerineInk" style={{ fontFamily: 'DMSans_700Bold' }}>
                            Copy
                          </Text>
                        </PressableScale>
                      </View>
                      <Text variant="caption" tone="ink3" style={{ marginTop: 4 }}>
                        Waydrop. This account is yours; any transfer lands in your wallet.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Option 2: Debit Card */}
                <PressableScale
                  style={[s.methodCard, topupMethod === 'card' && s.methodCardOn]}
                  onPress={() => {
                    tap();
                    setTopupMethod('card');
                  }}
                >
                  <View style={s.methodIcon}>
                    <CreditCard size={20} weight="duotone" color={color.ink2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="label" style={{ fontFamily: 'DMSans_700Bold' }}>
                      Debit card
                    </Text>
                    <Text variant="caption" tone="ink3">
                      Visa, Mastercard, Verve
                    </Text>
                  </View>
                </PressableScale>

                {/* Option 3: USSD */}
                <PressableScale
                  style={[s.methodCard, topupMethod === 'ussd' && s.methodCardOn]}
                  onPress={() => {
                    tap();
                    setTopupMethod('ussd');
                  }}
                >
                  <View style={s.methodIcon}>
                    <Hash size={20} weight="duotone" color={color.ink2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="label" style={{ fontFamily: 'DMSans_700Bold' }}>
                      USSD
                    </Text>
                    <Text variant="caption" tone="ink3">
                      Dial *945*7821# from any phone
                    </Text>
                  </View>
                </PressableScale>

                {/* Pay / I've sent button */}
                <View style={{ marginTop: space[5] }}>
                  <Button
                    label={topupMethod === 'card' ? `Pay ₦${topupAmt.toLocaleString('en-NG')}` : `I've sent ₦${topupAmt.toLocaleString('en-NG')}`}
                    onPress={submitTopup}
                    disabled={topupAmt < 100}
                  />
                </View>
              </ScrollView>
            ) : topupProcessing === 'busy' ? (
              /* Processing sweep loader */
              <View style={s.topupLoadingWrap}>
                <Text variant="h2" align="center" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>
                  {topupMethod === 'card' ? 'Charging your card…' : 'Waiting for your transfer…'}
                </Text>
                <Text variant="body" tone="ink2" align="center" style={{ marginTop: 6 }}>
                  This usually takes a few seconds.
                </Text>
                <View style={s.sweepBar}>
                  <ActivityIndicator size="small" color={color.mint} />
                </View>
              </View>
            ) : (
              /* Done checkmark */
              <View style={s.topupLoadingWrap}>
                <View style={s.doneCheckCircle}>
                  <Check size={40} weight="bold" color={color.white} />
                </View>
                <Text variant="h1" align="center" style={{ marginTop: space[4], fontSize: 26 }}>
                  ₦{topupAmt.toLocaleString('en-NG')} added
                </Text>
                <Text variant="body" tone="ink2" align="center" style={{ marginTop: 4 }}>
                  New balance: {naira(balance)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PlaceRow({
  type,
  place,
  query,
  onAdjust,
}: {
  type: 'pickup' | 'dropoff';
  place: PickedPlace | null;
  query?: string;
  onAdjust: () => void;
}) {
  const isMissing = !place;
  return (
    <View style={s.prow}>
      <View style={type === 'pickup' ? s.gPickup : s.gDrop} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="caption" tone="ink3">
          {type === 'pickup' ? 'Pickup' : 'Drop-off'}
        </Text>
        <Text
          variant="h3"
          numberOfLines={1}
          style={isMissing ? { color: color.ink4 } : undefined}
        >
          {place?.name ?? (query || (type === 'pickup' ? 'Where is it now?' : 'Where should it go?'))}
        </Text>
        {isMissing && !!query && (
          <View style={s.warnNotice}>
            <Question size={14} weight="bold" color="#A16207" />
            <Text variant="caption" style={{ color: '#A16207', fontWeight: '500' }}>
              We couldn't find this nearby
            </Text>
          </View>
        )}
      </View>
      <PressableScale
        style={[s.pbtn, isMissing && s.pbtnNeed]}
        onPress={onAdjust}
        accessibilityLabel={`${place ? 'Adjust' : 'Place on map'} ${type}`}
      >
        <Text
          variant="caption"
          style={[
            { fontFamily: 'DMSans_600SemiBold', color: color.ink2 },
            isMissing && { color: color.white },
          ]}
        >
          {place ? 'Adjust' : 'Place on map'}
        </Text>
      </PressableScale>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow[1],
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  rvTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: space[2],
  },
  editBtn: {
    height: 36,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  placesCard: {
    backgroundColor: color.card,
    borderRadius: 22,
    padding: 16,
    marginTop: space[4],
  },
  prow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 48,
  },
  gPickup: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 4,
    borderColor: color.tangerine,
    backgroundColor: color.white,
  },
  gDrop: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: color.tangerine,
    shadowColor: color.tangerine,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  warnNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  pbtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: color.card,
    borderWidth: 1.5,
    borderColor: color.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pbtnNeed: {
    backgroundColor: color.tangerine,
    borderColor: color.tangerine,
  },
  conn: {
    width: 16,
    alignItems: 'center',
    gap: 3,
    marginVertical: -2,
  },
  connDot: {
    width: 2.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: color.line,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: color.lineSoft,
    borderStyle: 'dashed',
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperAmt: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 26,
    minWidth: 94,
    textAlign: 'center',
  },
  rangeBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'visible',
    position: 'relative',
    marginTop: 6,
  },
  rangeMarker: {
    position: 'absolute',
    top: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: color.midnight,
    borderWidth: 3,
    borderColor: color.white,
    ...shadow[1],
    marginLeft: -9,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  rangeMessage: {
    marginTop: 6,
    fontSize: 13,
    color: color.ink2,
  },
  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
  },
  noteWrap: {
    backgroundColor: color.card,
    borderRadius: 16,
    padding: 14,
    ...shadow[1],
  },
  noteInput: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: color.midnight,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  payCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: space[4],
    padding: 14,
    borderRadius: 18,
    backgroundColor: color.card,
    ...shadow[1],
  },
  payIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: color.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: space[4],
    padding: 14,
    borderRadius: 18,
    backgroundColor: color.roseSoft,
  },
  shieldRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space[3],
    paddingHorizontal: 10,
  },

  /* Pin mode overlay */
  pinOverlay: { flex: 1, position: 'relative' },
  pinTopCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: color.card,
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 20,
  },
  pinTopIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: color.tangerineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCenter: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  pinHead: {
    position: 'absolute',
    top: -56,
    left: -17,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.tangerine,
    borderWidth: 5,
    borderColor: color.white,
    ...shadow[2],
  },
  pinStick: {
    position: 'absolute',
    top: -26,
    left: -2,
    width: 4,
    height: 26,
    borderRadius: 2,
    backgroundColor: color.midnight,
  },
  pinShadow: {
    position: 'absolute',
    top: -3,
    left: -8,
    width: 16,
    height: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(15,23,42,0.3)',
  },
  pinActions: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 10,
    zIndex: 20,
  },

  /* Top Up Modal */
  topupBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  topupSheet: {
    backgroundColor: color.card,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 18,
    maxHeight: '90%',
  },
  topupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topupInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: color.line,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  topupTextInput: {
    flex: 1,
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 24,
    color: color.midnight,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 12,
  },
  qChip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.card,
    borderWidth: 1.5,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qChipOn: {
    backgroundColor: color.midnight,
    borderColor: color.midnight,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: color.card,
    borderWidth: 1.5,
    borderColor: color.line,
    marginTop: 10,
  },
  methodCardOn: {
    borderColor: color.midnight,
    backgroundColor: color.paper,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: color.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  virtualAcctBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.lineSoft,
  },
  vaNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: color.tangerineSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  topupLoadingWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sweepBar: {
    marginTop: 24,
  },
  doneCheckCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: color.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: color.card,
    borderRadius: 22,
    padding: 16,
  },
});

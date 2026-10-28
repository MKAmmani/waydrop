import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
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
  ArrowRight,
  CheckCircle,
  Coins,
  Crosshair,
  FileText,
  Hamburger,
  HandCoins,
  Key,
  List,
  MagnifyingGlass,
  Minus,
  NotePencil,
  Package,
  Plus,
  Question,
  ShieldCheck,
  ShoppingCart,
  Sparkle,
  TShirt,
} from 'phosphor-react-native';
import Animated, {
  FadeIn,
  FadeInRight,
  FadeOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { MapPinIcon } from '@/components/art/Brand';
import { parseErrand, parseBuy } from '@/lib/parseErrand';
import { HERE, placesFor, resolvePlace, searchPlaces, type PickedPlace } from '@/lib/places';
import { useSite } from '@/lib/sites';
import { useSession } from '@/store/session';
import { useDraft } from '@/store/errand';
import { tap } from '@/lib/haptics';
import { color, radius, shadow, space } from '@/theme/tokens';

const naira = (kobo: number) => '₦' + Math.round(kobo / 100).toLocaleString('en-NG');

type CategoryKey = 'Parcel' | 'Food' | 'Forgotten item' | 'Documents' | 'Laundry';

const CATS: { label: CategoryKey; hint: string; icon: any }[] = [
  { label: 'Parcel', hint: 'Bring my parcel from ', icon: Package },
  { label: 'Food', hint: 'Get my food from ', icon: Hamburger },
  { label: 'Forgotten item', hint: 'Bring my ', icon: Key },
  { label: 'Documents', hint: 'Take these documents from ', icon: FileText },
  { label: 'Laundry', hint: 'Pick up my laundry from ', icon: TShirt },
];

export default function SendScreen() {
  const params = useLocalSearchParams<{ text?: string; guided?: string }>();
  const insets = useSafeAreaInsets();
  const { site } = useSite();
  const me = useSession((s) => s.me);
  const draft = useDraft();
  const toast = useToast();

  const [mode, setMode] = useState<'compose' | 'guided'>(params.guided === 'true' ? 'guided' : 'compose');
  const [text, setText] = useState(params.text ?? draft.text);
  const [debounced, setDebounced] = useState(text);
  const [selectedCat, setSelectedCat] = useState<CategoryKey | null>(null);
  const [errandKind, setErrandKind] = useState<'move' | 'buy'>(draft.kind || 'move');

  // Guided wizard step (0: item, 1: pickup, 2: dropoff, 3: offer)
  const [step, setStep] = useState(0);
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), 160);
    return () => clearTimeout(t);
  }, [text]);

  const p = useMemo(() => parseErrand(debounced), [debounced]);
  const buyP = useMemo(() => parseBuy(debounced), [debounced]);
  const fromPlace = p.from ? resolvePlace(site.id, p.from) : null;
  const toPlace = p.to ? resolvePlace(site.id, p.to) : null;

  // Auto-switch to Buy mode when buy pattern is detected
  useEffect(() => {
    if (buyP.buy && buyP.items.length > 0) {
      setErrandKind('buy');
    }
  }, [buyP.buy, buyP.items.length]);

  // Sync natural language parsing into draft on submit
  const submitCompose = () => {
    tap();
    const resolvedFrom = p.from ? resolvePlace(site.id, p.from) : draft.pickup;
    const resolvedTo = (buyP.to ? resolvePlace(site.id, buyP.to) : null) ?? (p.to ? resolvePlace(site.id, p.to) : draft.dropoff);
    const buyToQuery = buyP.to || p.to;
    const resolvedBuyTo = buyToQuery
      ? resolvePlace(site.id, buyToQuery) ?? { id: 'custom-destination', name: buyToQuery, kind: 'landmark' as const }
      : draft.dropoff;
    const offerKobo = p.amount ? Math.round(p.amount * 100) : draft.offer;

    if (errandKind === 'buy' || (buyP.buy && buyP.items.length > 0)) {
      draft.set({
        kind: 'buy',
        text,
        item: buyP.items.length > 0 ? buyP.items.map((i) => `${i.qty > 1 ? `${i.qty}x ` : ''}${i.name}`).join(', ') : draft.item,
        items: buyP.items.length > 0 ? buyP.items : draft.items,
        fromMode: buyP.any ? 'any' : 'shop',
        shopName: buyP.shop || draft.shopName,
        dropoff: resolvedBuyTo,
        dropoffQuery: buyToQuery || draft.dropoffQuery,
      });
      router.push('/buy-review');
      return;
    }

    draft.set({
      kind: 'move',
      text,
      item: p.item || draft.item,
      category: selectedCat ?? draft.category ?? 'Parcel',
      pickup: resolvedFrom,
      dropoff: resolvedTo,
      pickupQuery: p.from,
      dropoffQuery: p.to,
      offer: offerKobo,
    });
    router.push('/review');
  };

  const handleChipPress = (c: (typeof CATS)[number]) => {
    tap();
    setSelectedCat(c.label);
    setText(c.hint);
    draft.set({ category: c.label });
  };

  const greeting = me?.first_name ? `Good evening, ${me.first_name}` : 'Good evening';

  /* ─────────────────────────────────────────────────────────────
     GUIDED MODE HELPERS
  ───────────────────────────────────────────────────────────── */
  const openGuided = (initialStep = 0) => {
    tap();
    if (p.item && !draft.item) {
      draft.set({ item: p.item });
    }
    setStep(initialStep);
    setSearchQ('');
    setMode('guided');
  };

  const currentPlaceKey = step === 1 ? 'pickup' : 'dropoff';
  const filteredPlaces = useMemo(() => {
    if (mode !== 'guided' || (step !== 1 && step !== 2)) return [];
    return searchPlaces(site.id, searchQ);
  }, [site.id, searchQ, mode, step]);

  const selectPlace = (place: PickedPlace) => {
    tap();
    if (step === 1) {
      draft.set({ pickup: place, pickupQuery: place.name });
    } else {
      draft.set({ dropoff: place, dropoffQuery: place.name });
    }
  };

  const nextGuidedStep = () => {
    tap();
    if (step < 3) {
      setStep(step + 1);
      setSearchQ('');
    } else {
      router.push('/review');
    }
  };

  const backGuidedStep = () => {
    tap();
    if (step > 0) {
      setStep(step - 1);
      setSearchQ('');
    } else {
      setMode('compose');
    }
  };

  // Step 4 offer stepper values (in kobo: steps of ₦50 / 5,000 kobo)
  const currentOffer = draft.offer ?? 30000;
  const runnerGets = Math.round(currentOffer * 0.9);
  const serviceFee = Math.round(currentOffer * 0.1);

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {toast.node}

      {mode === 'compose' ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Top navigation header */}
          <View style={s.topNav}>
            <PressableScale
              style={s.backCircle}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
              accessibilityLabel="Back to map"
            >
              <ArrowLeft size={20} weight="bold" color={color.midnight} />
            </PressableScale>
            <View style={{ flex: 1 }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.composeScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text variant="caption" tone="ink3" style={{ fontWeight: '500' }}>
              {greeting}
            </Text>
            <Text variant="h1" style={{ marginTop: 2, fontSize: 26, lineHeight: 32 }}>
              {errandKind === 'buy' ? 'What do you need bought?' : 'What do you need moved?'}
            </Text>

            {/* Natural language request field */}
            <View style={s.askCard}>
              <Sparkle size={22} weight="duotone" color={color.tangerine} style={{ marginTop: 2 }} />
              <TextInput
                value={text}
                onChangeText={setText}
                multiline
                autoFocus
                placeholder={
                  errandKind === 'buy'
                    ? "Buy 6 bottles of water, anywhere is fine. I'm at the stadium, Block B"
                    : "Bring my calculator from Moremi Hall to LT3 for 500"
                }
                placeholderTextColor={color.ink4}
                style={[s.askInput, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
                accessibilityLabel="Describe your errand"
              />
            </View>

            {/* Auto-detected buy errand pill */}
            {buyP.buy && buyP.items.length > 0 && (
              <View style={s.detectPill}>
                <ShoppingCart size={15} weight="duotone" color={color.tangerine} />
                <Text variant="caption" style={s.detectPillText}>
                  Buying for you: {buyP.items.map((i) => `${i.qty > 1 ? `${i.qty}× ` : ''}${i.name.split(',')[0].toLowerCase()}`).join(', ')}
                  {buyP.any ? ', from anywhere' : `, from ${buyP.shop}`}
                </Text>
              </View>
            )}

            {/* Errand Type Segmented Switcher */}
            <View style={s.kindSwitch}>
              <PressableScale
                style={[s.kindBtn, errandKind === 'move' && s.kindBtnActive]}
                onPress={() => {
                  tap();
                  setErrandKind('move');
                  draft.set({ kind: 'move' });
                }}
              >
                <Package size={17} weight="duotone" color={errandKind === 'move' ? color.midnight : color.ink3} />
                <Text variant="label" style={[s.kindBtnText, errandKind === 'move' && s.kindBtnTextActive]}>
                  Pick up and drop
                </Text>
              </PressableScale>

              <PressableScale
                style={[s.kindBtn, errandKind === 'buy' && s.kindBtnActive]}
                onPress={() => {
                  tap();
                  setErrandKind('buy');
                  draft.set({ kind: 'buy' });
                }}
              >
                <ShoppingCart size={17} weight="duotone" color={errandKind === 'buy' ? color.midnight : color.ink3} />
                <Text variant="label" style={[s.kindBtnText, errandKind === 'buy' && s.kindBtnTextActive]}>
                  Buy for me
                </Text>
              </PressableScale>
            </View>
            <Text variant="caption" tone="ink3" style={s.kindHelper}>
              {errandKind === 'buy'
                ? "The runner buys it with a budget you set. You get every naira back that they don't spend."
                : "The item is already yours or already paid for. The runner just carries it."}
            </Text>

            {/* Tokens grid: What, Offer, From, To */}
            <View style={s.tokensGrid} accessibilityLiveRegion="polite">
              <Token
                icon={<Package size={18} weight="duotone" color={p.item ? color.tangerine : color.ink4} />}
                label="What"
                value={p.item}
                state={p.item ? 'ok' : 'idle'}
              />
              <Token
                icon={<Coins size={18} weight="duotone" color={p.amount ? color.mintInk : color.ink4} />}
                label="Offer"
                value={p.amount ? `₦${p.amount.toLocaleString('en-NG')}` : ''}
                state={p.amount ? 'money' : 'idle'}
              />
              <Token
                icon={
                  p.from && !fromPlace ? (
                    <Question size={18} weight="duotone" color="#A16207" />
                  ) : (
                    <View style={s.pickupBullet} />
                  )
                }
                label={p.from && !fromPlace ? 'From, not found' : 'From'}
                value={fromPlace?.name ?? p.from}
                state={!p.from ? 'idle' : fromPlace ? 'ok' : 'warn'}
              />
              <Token
                icon={
                  p.to && !toPlace ? (
                    <Question size={18} weight="duotone" color="#A16207" />
                  ) : (
                    <View style={s.dropBullet} />
                  )
                }
                label={p.to && !toPlace ? 'To, not found' : 'To'}
                value={toPlace?.name ?? p.to}
                state={!p.to ? 'idle' : toPlace ? 'ok' : 'warn'}
              />
            </View>

            {/* Category horizontal chips with icons */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -20, marginTop: space[4] }}
              contentContainerStyle={{ paddingHorizontal: 20, gap: space[2] }}
              keyboardShouldPersistTaps="handled"
            >
              {CATS.map((c) => {
                const IconComponent = c.icon;
                const isSelected = selectedCat === c.label;
                return (
                  <PressableScale
                    key={c.label}
                    style={[s.chip, isSelected && s.chipSelected]}
                    scaleTo={0.94}
                    onPress={() => handleChipPress(c)}
                    accessibilityLabel={`Choose ${c.label}`}
                  >
                    <View style={[s.chipIconBox, isSelected && s.chipIconBoxSelected]}>
                      <IconComponent
                        size={17}
                        weight="duotone"
                        color={isSelected ? color.white : color.ink2}
                      />
                    </View>
                    <Text
                      variant="label"
                      style={[
                        { fontFamily: 'DMSans_600SemiBold' },
                        isSelected && { color: color.tangerineInk },
                      ]}
                    >
                      {c.label}
                    </Text>
                  </PressableScale>
                );
              })}
            </ScrollView>

            {/* Find a runner / Continue button */}
            <View style={{ marginTop: space[5] }}>
              <Button
                label={errandKind === 'buy' ? 'Continue' : 'Find a runner'}
                onPress={submitCompose}
                disabled={!p.item && !buyP.buy && text.trim().length < 3}
              />
            </View>

            {/* Prefer filling it in? Go step by step */}
            <PressableScale
              style={s.guidedButton}
              scaleTo={0.97}
              onPress={() => openGuided(0)}
              accessibilityLabel="Switch to step by step form"
            >
              <List size={20} weight="duotone" color={color.ink2} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="label" tone="ink2">
                  Prefer filling it in?{' '}
                  <Text variant="label" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                    Go step by step
                  </Text>
                </Text>
              </View>
              <ArrowRight size={16} weight="bold" color={color.ink3} />
            </PressableScale>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        /* ─────────────────────────────────────────────────────────────
           GUIDED 4-STEP FORM WIZARD
        ───────────────────────────────────────────────────────────── */
        <View style={{ flex: 1 }}>
          {/* Progress Header */}
          <View style={s.ptop}>
            <PressableScale
              style={s.backCircle}
              onPress={backGuidedStep}
              accessibilityLabel="Back"
            >
              <ArrowLeft size={18} weight="bold" color={color.midnight} />
            </PressableScale>
            <View style={s.prog}>
              <Text variant="caption" tone="ink3" style={{ fontWeight: '500', marginBottom: 6 }}>
                Step {step + 1} of 4
              </Text>
              <View style={s.segRow}>
                {[0, 1, 2, 3].map((idx) => (
                  <View key={idx} style={s.segTrack}>
                    <View style={[s.segFill, idx <= step && s.segFillOn]} />
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Guided Body */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.guidedScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Assist Banner */}
            <PressableScale
              style={s.assistBanner}
              scaleTo={0.98}
              onPress={() => {
                tap();
                setMode('compose');
              }}
              accessibilityLabel="Return to one sentence describe view"
            >
              <Sparkle size={22} weight="duotone" color={color.tangerine} />
              <View style={{ flex: 1 }}>
                <Text variant="label" tone="ink2" style={{ fontSize: 13, lineHeight: 18 }}>
                  <Text variant="label" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                    Rather just describe it?
                  </Text>{' '}
                  Type one sentence and Waydrop fills this in for you.
                </Text>
              </View>
            </PressableScale>

            {/* Step 1: Item */}
            {step === 0 && (
              <Animated.View entering={FadeIn.duration(200)}>
                <Text variant="h1" style={s.guidedTitle}>
                  What needs moving?
                </Text>
                <Text variant="body" tone="ink2" style={s.guidedLede}>
                  Keep it short. Runners see this before they accept.
                </Text>

                <View style={[s.card, shadow[1]]}>
                  {/* Item input */}
                  <View style={s.field}>
                    <View style={s.fieldLabelRow}>
                      <Package size={18} weight="duotone" color={color.ink2} />
                      <Text variant="label" style={{ fontFamily: 'DMSans_600SemiBold' }}>
                        Item
                      </Text>
                    </View>
                    <View style={s.inputWrap}>
                      <TextInput
                        value={draft.item}
                        onChangeText={(t) => draft.set({ item: t })}
                        placeholder="e.g. Calculator"
                        placeholderTextColor={color.ink4}
                        style={s.textInput}
                      />
                    </View>
                  </View>

                  {/* Category chips */}
                  <View style={[s.field, { marginTop: space[4] }]}>
                    <Text variant="label" style={{ fontFamily: 'DMSans_600SemiBold' }}>
                      Type{' '}
                      <Text variant="caption" tone="ink3" style={{ fontWeight: '400' }}>
                        (optional)
                      </Text>
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginHorizontal: -18, marginTop: 4 }}
                      contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}
                      keyboardShouldPersistTaps="handled"
                    >
                      {CATS.map((c) => {
                        const IconComponent = c.icon;
                        const isSelected = draft.category === c.label;
                        return (
                          <PressableScale
                            key={c.label}
                            style={[s.chip, isSelected && s.chipSelected]}
                            scaleTo={0.94}
                            onPress={() => {
                              tap();
                              draft.set({ category: c.label });
                            }}
                          >
                            <View style={[s.chipIconBox, isSelected && s.chipIconBoxSelected]}>
                              <IconComponent
                                size={17}
                                weight="duotone"
                                color={isSelected ? color.white : color.ink2}
                              />
                            </View>
                            <Text
                              variant="label"
                              style={[
                                { fontFamily: 'DMSans_600SemiBold' },
                                isSelected && { color: color.tangerineInk },
                              ]}
                            >
                              {c.label}
                            </Text>
                          </PressableScale>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Note for runner */}
                  <View style={[s.field, { marginTop: space[4] }]}>
                    <View style={s.fieldLabelRow}>
                      <NotePencil size={18} weight="duotone" color={color.ink2} />
                      <Text variant="label" style={{ fontFamily: 'DMSans_600SemiBold' }}>
                        Note for runner{' '}
                        <Text variant="caption" tone="ink3" style={{ fontWeight: '400' }}>
                          (optional)
                        </Text>
                      </Text>
                    </View>
                    <View style={s.inputWrap}>
                      <TextInput
                        value={draft.note}
                        onChangeText={(t) => draft.set({ note: t })}
                        placeholder="Ask for Bola at the porter's desk"
                        placeholderTextColor={color.ink4}
                        style={s.textInput}
                      />
                    </View>
                    <Text variant="caption" tone="ink3" style={{ marginTop: 4 }}>
                      Shared after a runner accepts.
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Step 2 & 3: Pickup & Dropoff Location */}
            {(step === 1 || step === 2) && (
              <Animated.View entering={FadeIn.duration(200)}>
                <Text variant="h1" style={s.guidedTitle}>
                  {step === 1 ? 'Where is it now?' : 'Where should it go?'}
                </Text>
                <Text variant="body" tone="ink2" style={s.guidedLede}>
                  {step === 1
                    ? 'The runner picks it up here.'
                    : 'The runner hands it over here and asks for your PIN.'}
                </Text>

                {/* Search building input */}
                <View style={[s.inputWrap, { marginTop: space[4] }]}>
                  <MagnifyingGlass size={20} weight="bold" color={color.ink3} />
                  <TextInput
                    value={searchQ}
                    onChangeText={setSearchQ}
                    placeholder="Search a building, hostel or street"
                    placeholderTextColor={color.ink4}
                    style={s.textInput}
                  />
                </View>

                {/* Place List with Special Actions */}
                <View style={[s.plistCard, shadow[1]]}>
                  {/* Option 1: Current location */}
                  <PressableScale
                    style={[
                      s.pitem,
                      (step === 1 ? draft.pickup?.id : draft.dropoff?.id) === 'here' && s.pitemActive,
                    ]}
                    onPress={() => selectPlace(HERE)}
                    accessibilityLabel="Use my current location"
                  >
                    <View style={[s.piBox, { backgroundColor: color.tangerineSoft }]}>
                      <Crosshair size={20} weight="bold" color={color.tangerine} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="label" style={{ fontFamily: 'DMSans_600SemiBold' }}>
                        Use my current location
                      </Text>
                      <Text variant="caption" tone="ink3">
                        Near Musa's Kitchen
                      </Text>
                    </View>
                    {(step === 1 ? draft.pickup?.id : draft.dropoff?.id) === 'here' && (
                      <CheckCircle size={22} weight="fill" color={color.mint} />
                    )}
                  </PressableScale>

                  {/* Option 2: Drop a pin on the map */}
                  <PressableScale
                    style={s.pitem}
                    onPress={() => {
                      tap();
                      router.push({
                        pathname: '/review',
                        params: { pinFor: currentPlaceKey },
                      });
                    }}
                    accessibilityLabel="Drop a pin on the map"
                  >
                    <View style={s.piBox}>
                      <MapPinIcon size={20} color={color.ink2} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="label" style={{ fontFamily: 'DMSans_600SemiBold' }}>
                        Drop a pin on the map
                      </Text>
                      <Text variant="caption" tone="ink3">
                        For places without a name
                      </Text>
                    </View>
                  </PressableScale>

                  {/* Campus place suggestions */}
                  {filteredPlaces.slice(0, 8).map((pItem) => {
                    const isSelected =
                      (step === 1 ? draft.pickup?.id : draft.dropoff?.id) === pItem.id;
                    return (
                      <PressableScale
                        key={pItem.id}
                        style={[s.pitem, isSelected && s.pitemActive]}
                        onPress={() => selectPlace({ id: pItem.id, name: pItem.name, kind: pItem.kind })}
                        accessibilityLabel={pItem.name}
                      >
                        <View style={s.piBox}>
                          <MapPinIcon size={20} color={color.ink3} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text variant="label" style={{ fontFamily: 'DMSans_600SemiBold' }}>
                            {pItem.name}
                          </Text>
                          <Text variant="caption" tone="ink3">
                            {pItem.note ?? (pItem.kind.charAt(0).toUpperCase() + pItem.kind.slice(1))}
                          </Text>
                        </View>
                        {isSelected && <CheckCircle size={22} weight="fill" color={color.mint} />}
                      </PressableScale>
                    );
                  })}
                </View>
              </Animated.View>
            )}

            {/* Step 4: Offer and Pricing */}
            {step === 3 && (
              <Animated.View entering={FadeIn.duration(200)}>
                <Text variant="h1" style={s.guidedTitle}>
                  What will you pay?
                </Text>
                <Text variant="body" tone="ink2" style={s.guidedLede}>
                  {draft.pickup && draft.dropoff
                    ? `From ${draft.pickup.name} to ${draft.dropoff.name}. `
                    : ''}
                  Most errands like this go for ₦300 to ₦600.
                </Text>

                <View style={[s.card, shadow[1]]}>
                  {/* Stepper */}
                  <View style={s.bigAmtRow}>
                    <PressableScale
                      style={s.stepCircle}
                      onPress={() => {
                        tap();
                        draft.set({ offer: Math.max(10000, currentOffer - 5000) });
                      }}
                      disabled={currentOffer <= 10000}
                      accessibilityLabel="Lower offer"
                    >
                      <Minus size={20} weight="bold" color={color.midnight} />
                    </PressableScale>

                    <Text variant="number" style={s.bigAmtText} accessibilityLiveRegion="polite">
                      {naira(currentOffer)}
                    </Text>

                    <PressableScale
                      style={s.stepCircle}
                      onPress={() => {
                        tap();
                        draft.set({ offer: currentOffer + 5000 });
                      }}
                      accessibilityLabel="Raise offer"
                    >
                      <Plus size={20} weight="bold" color={color.midnight} />
                    </PressableScale>
                  </View>

                  {/* Financial breakdown */}
                  <View style={s.breakdown}>
                    <View style={s.bdRow}>
                      <Text variant="caption" tone="ink2">
                        Runner gets
                      </Text>
                      <Text variant="label" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>
                        {naira(runnerGets)}
                      </Text>
                    </View>
                    <View style={s.bdRow}>
                      <Text variant="caption" tone="ink2">
                        Service fee (10%)
                      </Text>
                      <Text variant="label" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>
                        {naira(serviceFee)}
                      </Text>
                    </View>
                    <View style={[s.bdRow, { borderBottomWidth: 0, paddingTop: 10 }]}>
                      <Text variant="label" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                        You pay
                      </Text>
                      <Text variant="h3" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.midnight }}>
                        {naira(currentOffer)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Helper notice */}
                <View style={s.shieldHelper}>
                  <ShieldCheck size={18} weight="duotone" color={color.ink3} />
                  <Text variant="caption" tone="ink3" style={{ flex: 1 }}>
                    Your money is held until you read the runner your PIN.
                  </Text>
                </View>
              </Animated.View>
            )}
          </ScrollView>

          {/* Guided footer */}
          <View style={s.pfoot}>
            <Button
              label="Save draft"
              variant="secondary"
              onPress={() => {
                tap();
                toast.show('Draft saved. Find it on the home sheet.');
              }}
              style={{ flex: 1 }}
            />
            <Button
              label={step === 3 ? 'Review errand' : 'Continue'}
              onPress={nextGuidedStep}
              disabled={
                step === 0
                  ? !draft.item.trim()
                  : step === 1
                  ? !draft.pickup
                  : step === 2
                  ? !draft.dropoff
                  : false
              }
              style={{ flex: 1.6 }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

function Token({
  icon,
  label,
  value,
  state,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  state: 'idle' | 'ok' | 'warn' | 'money';
}) {
  return (
    <View
      style={[
        s.tok,
        state === 'ok' && s.tokOk,
        state === 'money' && s.tokMoney,
        state === 'warn' && s.tokWarn,
      ]}
    >
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="caption" tone="ink3" style={{ fontSize: 11, lineHeight: 14 }}>
          {label}
        </Text>
        <Text
          variant="label"
          numberOfLines={1}
          style={[
            { fontFamily: 'DMSans_600SemiBold' },
            state === 'warn' && { color: '#A16207' },
            state === 'money' && { color: color.mintInk },
          ]}
        >
          {value || '…'}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
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
  composeScroll: { paddingHorizontal: 20, paddingBottom: 40 },
  askCard: {
    flexDirection: 'row',
    gap: space[3],
    marginTop: space[4],
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: color.tangerine,
    backgroundColor: color.card,
    padding: space[4],
    shadowColor: color.tangerine,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  askInput: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 17,
    lineHeight: 24,
    color: color.midnight,
    minHeight: 70,
    maxHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  detectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.tangerineSoft,
    borderWidth: 1,
    borderColor: color.tangerineEdge,
    borderRadius: radius.pill,
    paddingHorizontal: space[3],
    paddingVertical: 6,
    marginTop: space[3],
    alignSelf: 'flex-start',
  },
  detectPillText: {
    color: color.tangerineInk,
    fontFamily: 'DMSans_600SemiBold',
    marginLeft: 6,
  },
  kindSwitch: {
    flexDirection: 'row',
    backgroundColor: color.sunken,
    borderRadius: radius.pill,
    padding: 3,
    marginTop: space[4],
  },
  kindBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.pill,
    gap: 6,
  },
  kindBtnActive: {
    backgroundColor: color.card,
    ...shadow[1],
  },
  kindBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    color: color.ink3,
    fontSize: 14,
  },
  kindBtnTextActive: {
    color: color.midnight,
    fontFamily: 'DMSans_700Bold',
  },
  kindHelper: {
    marginTop: space[2],
    lineHeight: 18,
    paddingHorizontal: space[1],
  },
  tokensGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
    marginTop: space[3],
  },
  tok: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: color.line,
    backgroundColor: color.paper,
  },
  tokOk: {
    borderStyle: 'solid',
    borderColor: color.line,
    backgroundColor: color.card,
  },
  tokMoney: {
    borderStyle: 'solid',
    borderColor: color.line,
    backgroundColor: color.card,
  },
  tokWarn: {
    borderStyle: 'solid',
    borderColor: '#FBE3A0',
    backgroundColor: color.butterSoft,
  },
  pickupBullet: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3.5,
    borderColor: color.tangerine,
    backgroundColor: color.white,
  },
  dropBullet: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: color.tangerine,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: radius.pill,
    backgroundColor: color.card,
    borderWidth: 1.5,
    borderColor: color.line,
  },
  chipSelected: {
    backgroundColor: color.tangerineSoft,
    borderColor: color.tangerine,
  },
  chipIconBox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: color.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipIconBoxSelected: {
    backgroundColor: color.tangerine,
  },
  guidedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    marginTop: space[4],
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: color.paper,
    borderWidth: 1.5,
    borderColor: color.lineSoft,
  },

  /* Guided Form Styles */
  ptop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  prog: { flex: 1 },
  segRow: { flexDirection: 'row', gap: 6 },
  segTrack: {
    flex: 1,
    height: 5,
    borderRadius: 4,
    backgroundColor: color.line,
    overflow: 'hidden',
  },
  segFill: {
    flex: 1,
    backgroundColor: color.line,
  },
  segFillOn: {
    backgroundColor: color.tangerine,
  },
  guidedScroll: { paddingHorizontal: 20, paddingBottom: 40 },
  assistBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: color.tangerineSoft,
    borderWidth: 1,
    borderColor: color.tangerineEdge,
    borderRadius: 16,
    padding: 12,
    marginBottom: space[4],
  },
  guidedTitle: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  guidedLede: { marginTop: 6, fontSize: 15 },
  card: {
    backgroundColor: color.card,
    borderRadius: 22,
    padding: 18,
    marginTop: space[4],
  },
  field: { gap: 8 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputWrap: {
    height: 56,
    borderRadius: radius.md,
    backgroundColor: color.card,
    borderWidth: 1.5,
    borderColor: color.line,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: color.midnight,
  },
  plistCard: {
    marginTop: space[3],
    backgroundColor: color.card,
    borderRadius: 20,
    overflow: 'hidden',
  },
  pitem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
  },
  pitemActive: {
    backgroundColor: color.paper,
  },
  piBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: color.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigAmtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 18,
  },
  stepCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: color.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigAmtText: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 44,
    letterSpacing: -1,
    minWidth: 150,
    textAlign: 'center',
  },
  breakdown: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: color.lineSoft,
    paddingTop: 10,
  },
  bdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
  },
  shieldHelper: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginTop: space[4],
  },
  pfoot: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: color.lineSoft,
    backgroundColor: color.paper,
  },
});

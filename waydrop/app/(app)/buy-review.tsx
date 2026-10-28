import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Camera,
  CurrencyNgn,
  Info,
  LockSimple,
  Minus,
  Plus,
  ShieldCheck,
  Storefront,
  Trash,
  WarningCircle,
} from 'phosphor-react-native';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/api';
import {
  ITEM_GUESS,
  calcBudget,
  calcFee,
  calcItemsEst,
  calcUnknownItems,
  naira,
  roundUp,
  type BuyItem,
  type PriceRule,
  type StockRule,
} from '@/lib/buyCatalog';
import { preparePhotoForUpload } from '@/lib/preparePhoto';
import { useSite } from '@/lib/sites';
import { useDraft } from '@/store/errand';
import { tap, success as hapticSuccess, error as hapticError } from '@/lib/haptics';
import { color, radius, shadow, space } from '@/theme/tokens';

const FEE_STEP = 50;
const MIN_FEE = 50;

export default function BuyReviewScreen() {
  const insets = useSafeAreaInsets();
  const { site } = useSite();
  const draft = useDraft();
  const toast = useToast();

  const [items, setItems] = useState<BuyItem[]>(draft.items || []);
  const [fromMode, setFromMode] = useState<'any' | 'shop'>(draft.fromMode || 'any');
  const [shopName, setShopName] = useState(draft.shopName || '');
  const [priceRule, setPriceRule] = useState<PriceRule>(draft.priceRule || 'ask');
  const [stockRule, setStockRule] = useState<StockRule>(draft.stockRule || 'similar');
  const [note, setNote] = useState(draft.note || '');
  const [seatPhotoUrl, setSeatPhotoUrl] = useState<string | null>(draft.seatPhotoUri ?? null);
  const [liveShare, setLiveShare] = useState(draft.liveShare ?? true);
  const [maxBudget, setMaxBudget] = useState<number | null>(draft.maxBudget);
  const [runnerFee, setRunnerFee] = useState<number | null>(draft.runnerFee ?? null);
  const [newItemText, setNewItemText] = useState('');
  const [locking, setLocking] = useState(false);
  const [itemPhotoBusy, setItemPhotoBusy] = useState<number | null>(null);
  const [seatPhotoBusy, setSeatPhotoBusy] = useState(false);

  const seatPhoto = Boolean(seatPhotoUrl);

  // Sync to global draft
  useEffect(() => {
    draft.set({
      items,
      fromMode,
      shopName,
      priceRule,
      stockRule,
      note,
      seatPhoto,
      seatPhotoUri: seatPhotoUrl,
      liveShare,
      maxBudget,
      runnerFee,
    });
  }, [items, fromMode, shopName, priceRule, stockRule, note, seatPhoto, seatPhotoUrl, liveShare, maxBudget, runnerFee]);

  const unknown = useMemo(() => calcUnknownItems(items), [items]);
  const estTotal = useMemo(() => calcItemsEst(items), [items]);
  const budget = useMemo(() => calcBudget(items, maxBudget), [items, maxBudget]);
  const suggestedFee = useMemo(() => calcFee(items, fromMode), [items, fromMode]);
  const fee = runnerFee ?? suggestedFee;
  const feeIsCustom = runnerFee !== null && runnerFee !== suggestedFee;
  const totalHold = budget + fee;

  const adjustRunnerFee = (delta: number) => {
    tap();
    setRunnerFee(Math.max(MIN_FEE, fee + delta));
  };

  const needsShopName = fromMode === 'shop' && !shopName.trim();
  const needsBudget = unknown.length > 0 && !maxBudget;
  const ctaDisabled = items.length === 0 || needsShopName || needsBudget;
  const ctaLabel =
    items.length === 0
      ? 'Add an item to continue'
      : needsShopName
        ? 'Enter the shop name'
        : needsBudget
          ? 'Set your max budget first'
          : `Hold ${naira(totalHold)} and find runner`;

  const handleQtyChange = (index: number, delta: number) => {
    tap();
    const updated = [...items];
    updated[index] = { ...updated[index], qty: Math.max(1, updated[index].qty + delta) };
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    tap();
    setItems(items.filter((_, i) => i !== index));
  };

  const handleDetailChange = (index: number, val: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], det: val };
    setItems(updated);
  };

  const captureItemPhoto = async (index: number) => {
    if (itemPhotoBusy !== null) return;
    tap();

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toast.show('Camera access is off. Enable it in Settings to add a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5,
    });

    if (result.canceled || !result.assets[0]) return;

    setItemPhotoBusy(index);
    try {
      const preparedUri = await preparePhotoForUpload(result.assets[0].uri);
      const uploaded = await api.uploadErrandPhoto(preparedUri);
      setItems((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, photo: true, photo_url: uploaded.url } : item
        )
      );
      hapticSuccess();
      toast.show('Photo added. The runner will see it at the shop.');
    } catch (e) {
      hapticError();
      toast.show(e instanceof ApiError ? e.message : 'Could not upload photo. Try again.');
    } finally {
      setItemPhotoBusy(null);
    }
  };

  const captureSeatPhoto = async () => {
    if (seatPhotoBusy) return;
    tap();

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toast.show('Camera access is off. Enable it in Settings to add a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5,
    });

    if (result.canceled || !result.assets[0]) return;

    setSeatPhotoBusy(true);
    try {
      const preparedUri = await preparePhotoForUpload(result.assets[0].uri);
      const uploaded = await api.uploadErrandPhoto(preparedUri);
      setSeatPhotoUrl(uploaded.url);
      hapticSuccess();
      toast.show('Photo of your view added. The runner will see it on arrival.');
    } catch (e) {
      hapticError();
      toast.show(e instanceof ApiError ? e.message : 'Could not upload photo. Try again.');
    } finally {
      setSeatPhotoBusy(false);
    }
  };

  const removeSeatPhoto = () => {
    tap();
    setSeatPhotoUrl(null);
    toast.show('Photo removed');
  };

  const handleAddItem = () => {
    const val = newItemText.trim();
    if (!val) return;
    tap();
    const key = Object.keys(ITEM_GUESS).find((k) => val.toLowerCase().includes(k));
    const g = key ? ITEM_GUESS[key] : null;

    const newItem: BuyItem = {
      name: g ? g[0] : val[0].toUpperCase() + val.slice(1),
      qty: 1,
      est: g ? g[1] : null,
      ic: g ? g[2] : 'bag',
      det: '',
      photo: false,
      photo_url: null,
    };

    setItems([...items, newItem]);
    setNewItemText('');
    if (g) {
      toast.show(`Added. About ${naira(g[1])} each nearby.`);
    } else {
      toast.show('Added. Set your max budget below so the runner knows your limit.');
    }
  };

  const handleLockBuy = async () => {
    if (items.length === 0) {
      hapticError();
      toast.show('Please add at least one item to buy.');
      return;
    }

    if (fromMode === 'shop' && !shopName.trim()) {
      hapticError();
      toast.show('Enter the shop name so the runner knows where to buy.');
      return;
    }

    if (unknown.length > 0 && !maxBudget) {
      hapticError();
      toast.show('Set your max budget first so the runner knows your limit.');
      return;
    }

    setLocking(true);
    tap();

    try {
      const task = await api.createTask({
        type: 'buy',
        site_id: site.id,
        item: items.map((i) => `${i.qty}× ${i.name}`).join(', '),
        note,
        pickup: {
          id: fromMode === 'shop' ? 'shop' : 'any',
          name: fromMode === 'shop' ? shopName.trim() : 'Anywhere nearby',
        },
        dropoff: {
          id: draft.dropoff?.id ?? 'current',
          name: draft.dropoff?.name || draft.dropoffQuery.trim() || 'My current location',
        },
        bounty: fee * 100, // fee in kobo
        budget_kobo: budget * 100, // budget in kobo
        items,
        source: { mode: fromMode, name: fromMode === 'shop' ? shopName.trim() : undefined },
        rules: { price: priceRule, stock: stockRule },
        seat_photo: seatPhoto,
        seat_photo_url: seatPhotoUrl,
        live_share: liveShare,
      });

      hapticSuccess();
      toast.show(`${naira(totalHold)} held. Finding a runner near you.`);
      router.replace({ pathname: '/finding', params: { id: task.id } });
    } catch (e) {
      hapticError();
      toast.show(e instanceof ApiError ? e.message : 'Could not create errand. Try again.');
      setLocking(false);
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {toast.node}

      {/* Top navigation header */}
      <View style={s.topNav}>
        <PressableScale
          style={s.backCircle}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          accessibilityLabel="Back to errand compose"
        >
          <ArrowLeft size={20} weight="bold" color={color.midnight} />
        </PressableScale>
        <Text variant="h2" style={{ flex: 1, marginLeft: space[3], fontSize: 22 }}>
          Buy for me
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* SECTION: SHOPPING LIST */}
          <View style={s.sectionHeaderRow}>
            <Text variant="label" style={s.sectionTitle}>
              Shopping list
            </Text>
            <Text variant="caption" tone="ink3">
              Estimated prices near you
            </Text>
          </View>

          <View style={s.card}>
            {items.length === 0 ? (
              <View style={{ paddingVertical: space[4], alignItems: 'center' }}>
                <WarningCircle size={24} weight="duotone" color={color.ink4} />
                <Text variant="body" tone="ink3" style={{ marginTop: space[2] }}>
                  No items yet. Add something below.
                </Text>
              </View>
            ) : (
              items.map((it, idx) => (
                <View key={`${it.name}-${idx}`} style={[s.itemRow, idx > 0 && s.itemBorder]}>
                <View style={s.itemMain}>
                  <View style={s.itemInfo}>
                    <Text variant="body" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                      {it.name}
                    </Text>
                    <Text variant="caption" style={it.est == null ? { color: '#A16207' } : { color: color.ink3 }}>
                      {it.est == null ? 'Price unknown, runner confirms it' : `About ${naira(it.est)} each`}
                    </Text>
                  </View>

                  <View style={s.qtyCluster}>
                    <View style={s.qtyBox}>
                      <PressableScale
                        style={s.qtyBtn}
                        onPress={() => handleQtyChange(idx, -1)}
                        accessibilityLabel="Decrease quantity"
                      >
                        <Minus size={14} weight="bold" color={color.midnight} />
                      </PressableScale>
                      <Text variant="label" style={s.qtyText}>
                        {it.qty}
                      </Text>
                      <PressableScale
                        style={s.qtyBtn}
                        onPress={() => handleQtyChange(idx, 1)}
                        accessibilityLabel="Increase quantity"
                      >
                        <Plus size={14} weight="bold" color={color.midnight} />
                      </PressableScale>
                    </View>
                    <PressableScale
                      style={s.removeBtn}
                      onPress={() => handleRemoveItem(idx)}
                      accessibilityLabel={`Remove ${it.name}`}
                    >
                      <Trash size={15} weight="bold" color={color.roseInk} />
                    </PressableScale>
                  </View>
                </View>

                {/* Specification and reference photo row */}
                <View style={s.itemDetRow}>
                  <TextInput
                    value={it.det}
                    onChangeText={(val) => handleDetailChange(idx, val)}
                    placeholder="Brand, size, colour (optional)"
                    placeholderTextColor={color.ink4}
                    style={[s.itemDetInput, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
                    accessibilityLabel={`Details for ${it.name}`}
                  />
                  <PressableScale
                    style={[s.photoBtn, it.photo_url && s.photoBtnActive]}
                    onPress={() => captureItemPhoto(idx)}
                    disabled={itemPhotoBusy === idx}
                    accessibilityLabel={`Take reference photo for ${it.name}`}
                  >
                    {itemPhotoBusy === idx ? (
                      <ActivityIndicator size="small" color={color.tangerine} />
                    ) : it.photo_url ? (
                      <Image source={{ uri: it.photo_url }} style={s.photoThumb} contentFit="cover" />
                    ) : (
                      <Camera size={18} weight="bold" color={color.ink3} />
                    )}
                  </PressableScale>
                </View>
              </View>
            )))}

            {/* Add item input row */}
            <View style={s.addItemRow}>
              <TextInput
                value={newItemText}
                onChangeText={setNewItemText}
                onSubmitEditing={handleAddItem}
                placeholder="Add something else, e.g. Gala"
                placeholderTextColor={color.ink4}
                style={[s.addInput, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
              />
              <Button
                label="Add"
                variant="secondary"
                onPress={handleAddItem}
                disabled={!newItemText.trim()}
              />
            </View>
          </View>

          {/* SECTION: BUY FROM */}
          <Text variant="label" style={[s.sectionTitle, { marginTop: space[5] }]}>
            Buy from
          </Text>
          <View style={s.fromGrid}>
            <PressableScale
              style={[s.fromOption, fromMode === 'any' && s.fromOptionActive]}
              onPress={() => {
                tap();
                setFromMode('any');
              }}
            >
              <Text variant="label" style={[s.fromLabel, fromMode === 'any' && s.fromTextActive]}>
                Anywhere nearby
              </Text>
              <Text variant="caption" tone="ink3" style={{ marginTop: 2 }}>
                Runner picks the closest shop
              </Text>
            </PressableScale>

            <PressableScale
              style={[s.fromOption, fromMode === 'shop' && s.fromOptionActive]}
              onPress={() => {
                tap();
                setFromMode('shop');
              }}
            >
              <Text variant="label" style={[s.fromLabel, fromMode === 'shop' && s.fromTextActive]}>
                A specific shop
              </Text>
              <Text variant="caption" tone="ink3" style={{ marginTop: 2 }}>
                {fromMode === 'shop' ? (shopName.trim() || 'Enter the shop name below') : 'Choose on the map'}
              </Text>
            </PressableScale>
          </View>

          {fromMode === 'shop' && (
            <View style={s.shopInputWrap}>
              <Storefront size={18} weight="duotone" color={color.tangerine} />
              <TextInput
                value={shopName}
                onChangeText={setShopName}
                placeholder="Shop name, e.g. City Mart"
                placeholderTextColor={color.ink4}
                style={[s.shopInput, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
                accessibilityLabel="Shop name"
              />
            </View>
          )}

          {/* SECTION: IF SOMETHING CHANGES */}
          <View style={s.sectionHeaderRow}>
            <Text variant="label" style={s.sectionTitle}>
              If something changes
            </Text>
            <Text variant="caption" tone="ink3">
              Saves back-and-forth
            </Text>
          </View>

          <View style={s.card}>
            {/* Policy 1: Price changes */}
            <Text variant="caption" tone="ink2" style={{ fontWeight: '600' }}>
              Costs more than expected?
            </Text>
            <View style={s.pchipsRow}>
              {[
                { key: 'ask', label: 'Ask me first' },
                { key: '300', label: 'Fine up to +₦300' },
                { key: 'fit', label: 'Buy what budget covers' },
              ].map((opt) => (
                <PressableScale
                  key={opt.key}
                  style={[s.pchip, priceRule === opt.key && s.pchipActive]}
                  onPress={() => {
                    tap();
                    setPriceRule(opt.key as PriceRule);
                  }}
                >
                  <Text
                    variant="caption"
                    style={[
                      { fontFamily: 'DMSans_600SemiBold', color: color.ink2 },
                      priceRule === opt.key && { color: color.tangerineInk },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </PressableScale>
              ))}
            </View>

            {/* Policy 2: Out of stock */}
            <Text variant="caption" tone="ink2" style={{ fontWeight: '600', marginTop: space[4] }}>
              Not available?
            </Text>
            <View style={s.pchipsRow}>
              {[
                { key: 'ask', label: 'Ask me' },
                { key: 'similar', label: 'Similar brand is fine' },
                { key: 'skip', label: 'Skip it' },
              ].map((opt) => (
                <PressableScale
                  key={opt.key}
                  style={[s.pchip, stockRule === opt.key && s.pchipActive]}
                  onPress={() => {
                    tap();
                    setStockRule(opt.key as StockRule);
                  }}
                >
                  <Text
                    variant="caption"
                    style={[
                      { fontFamily: 'DMSans_600SemiBold', color: color.ink2 },
                      stockRule === opt.key && { color: color.tangerineInk },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </PressableScale>
              ))}
            </View>
          </View>

          {/* SECTION: WHERE TO FIND YOU */}
          <Text variant="label" style={[s.sectionTitle, { marginTop: space[5] }]}>
            Where to find you
          </Text>
          <View style={s.card}>
            <View style={s.deliveryRow}>
              <View style={s.dropBullet} />
              <View style={{ flex: 1, marginLeft: space[3] }}>
                <Text variant="caption" tone="ink3">
                  Deliver to
                </Text>
                <Text variant="body" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                  {draft.dropoff?.name || draft.dropoffQuery.trim() || 'My current location'}
                </Text>
              </View>
            </View>

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Row, seat, what you're wearing"
              placeholderTextColor={color.ink4}
              multiline
              style={[s.noteInput, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
              accessibilityLabel="Help runner find you"
            />

            <View style={s.seatRow}>
              <PressableScale
                style={[s.seatBtn, seatPhoto && s.seatBtnActive]}
                onPress={captureSeatPhoto}
                disabled={seatPhotoBusy}
                accessibilityLabel={seatPhoto ? 'Retake photo of your view' : 'Add a photo of your view'}
              >
                {seatPhotoBusy ? (
                  <ActivityIndicator size="small" color={color.tangerine} />
                ) : seatPhotoUrl ? (
                  <Image source={{ uri: seatPhotoUrl }} style={s.seatThumb} contentFit="cover" />
                ) : (
                  <Camera size={18} weight="bold" color={color.ink2} />
                )}
                <Text variant="label" style={{ fontFamily: 'DMSans_600SemiBold', marginLeft: space[2], color: color.midnight }}>
                  {seatPhotoBusy
                    ? 'Uploading photo…'
                    : seatPhoto
                      ? 'Photo of your view added'
                      : 'Add a photo of your view'}
                </Text>
                {!seatPhoto && !seatPhotoBusy && (
                  <Text variant="caption" tone="ink3" style={{ marginLeft: 4 }}>
                    (optional)
                  </Text>
                )}
              </PressableScale>
              {seatPhoto && (
                <PressableScale
                  style={s.seatRemoveBtn}
                  onPress={removeSeatPhoto}
                  disabled={seatPhotoBusy}
                  accessibilityLabel="Remove photo of your view"
                >
                  <Trash size={16} weight="bold" color={color.roseInk} />
                </PressableScale>
              )}
            </View>

            <View style={s.liveShareRow}>
              <View style={{ flex: 1, paddingRight: space[3] }}>
                <Text variant="label" style={{ fontFamily: 'DMSans_600SemiBold', color: color.midnight }}>
                  Share live location when they're close
                </Text>
                <Text variant="caption" tone="ink3" style={{ marginTop: 2 }}>
                  Only the last 300m, only with your runner
                </Text>
              </View>
              <PressableScale
                style={[s.switchTrack, liveShare && s.switchTrackOn]}
                onPress={() => {
                  tap();
                  setLiveShare(!liveShare);
                }}
                accessibilityRole="switch"
                accessibilityState={{ checked: liveShare }}
              >
                <View style={[s.switchThumb, liveShare && s.switchThumbOn]} />
              </PressableScale>
            </View>
          </View>

          {/* SECTION: MAX BUDGET (MANDATORY IF UNKNOWN PRICES) */}
          {unknown.length > 0 && (
            <View style={{ marginTop: space[5] }}>
              <View style={s.sectionHeaderRow}>
                <Text variant="label" style={s.sectionTitle}>
                  Your max budget
                </Text>
                <Text variant="caption" style={{ color: color.roseInk, fontWeight: '700' }}>
                  Required
                </Text>
              </View>

              <View style={s.warnCard}>
                <Info size={20} weight="fill" color="#A16207" style={{ marginTop: 2 }} />
                <Text variant="caption" style={{ color: '#713F12', flex: 1, marginLeft: space[2], lineHeight: 18 }}>
                  We don't have a price for{' '}
                  <Text variant="caption" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                    {unknown.map((u) => u.name).join(', ')}
                  </Text>
                  . Set the most you'd spend on everything. The runner asks you before going over.
                </Text>
              </View>

              <View style={[s.card, { marginTop: space[2] }]}>
                <View style={s.budgetInputWrap}>
                  <Text variant="h2" style={{ color: color.ink3, marginRight: space[1] }}>
                    ₦
                  </Text>
                  <TextInput
                    value={maxBudget ? maxBudget.toLocaleString('en-NG') : ''}
                    onChangeText={(val) => {
                      const num = parseInt(val.replace(/\D/g, ''), 10);
                      setMaxBudget(isNaN(num) ? null : num);
                    }}
                    placeholder="e.g. 6,000"
                    placeholderTextColor={color.ink4}
                    keyboardType="numeric"
                    style={[s.budgetInput, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
                  />
                </View>

                {/* Quick chip increments */}
                <View style={[s.pchipsRow, { marginTop: space[3] }]}>
                  {[
                    roundUp(estTotal + 3000, 500),
                    roundUp(estTotal + 5000, 500),
                    roundUp(estTotal + 8000, 500),
                  ].map((chipVal) => (
                    <PressableScale
                      key={chipVal}
                      style={[s.pchip, maxBudget === chipVal && s.pchipActive]}
                      onPress={() => {
                        tap();
                        setMaxBudget(chipVal);
                      }}
                    >
                      <Text
                        variant="caption"
                        style={[
                          { fontFamily: 'DMSans_700Bold', color: color.ink2 },
                          maxBudget === chipVal && { color: color.tangerineInk },
                        ]}
                      >
                        {naira(chipVal)}
                      </Text>
                    </PressableScale>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* SECTION: FINANCIAL ESCROW BREAKDOWN */}
          <View style={[s.card, s.moneyCard]}>
            <View style={s.moneyRow}>
              <View style={{ flex: 1 }}>
                <Text variant="label" style={{ fontFamily: 'DMSans_600SemiBold', color: color.midnight }}>
                  Item budget
                </Text>
                <Text variant="caption" tone="ink3">
                  {unknown.length > 0
                    ? maxBudget
                      ? "Your max, you get back what isn't spent"
                      : 'Set your max above'
                    : `Estimate ${naira(estTotal)} plus 10% wiggle room`}
                </Text>
              </View>
              <Text variant="h3" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.midnight }}>
                {unknown.length > 0 && !maxBudget ? '₦…' : naira(budget)}
              </Text>
            </View>

            <View style={[s.moneyRow, { marginTop: space[3], alignItems: 'center' }]}>
              <View style={{ flex: 1, paddingRight: space[2] }}>
                <Text variant="label" style={{ fontFamily: 'DMSans_600SemiBold', color: color.midnight }}>
                  Runner's fee
                </Text>
                <Text variant="caption" tone="ink3">
                  Runner gets {naira(fee * 0.9)} after the {naira(fee * 0.1)} service fee
                </Text>
                <Text
                  variant="caption"
                  style={{
                    marginTop: 2,
                    color: fee < suggestedFee ? '#A16207' : fee > suggestedFee ? color.mintInk : color.ink3,
                  }}
                >
                  {fee < suggestedFee
                    ? 'Lower than suggested. May take longer to get picked up.'
                    : fee > suggestedFee
                      ? 'Higher than suggested. Expect a quicker match.'
                      : `Suggested fee for this errand`}
                </Text>
                {feeIsCustom && (
                  <PressableScale
                    onPress={() => {
                      tap();
                      setRunnerFee(null);
                    }}
                    accessibilityLabel="Use suggested runner fee"
                  >
                    <Text variant="caption" style={{ marginTop: 3, color: color.tangerine, fontWeight: '600' }}>
                      Use suggested {naira(suggestedFee)}
                    </Text>
                  </PressableScale>
                )}
              </View>

              <View style={s.feeStepper}>
                <PressableScale
                  style={[s.feeStepBtn, fee <= MIN_FEE && s.feeStepBtnDisabled]}
                  onPress={() => adjustRunnerFee(-FEE_STEP)}
                  disabled={fee <= MIN_FEE}
                  accessibilityLabel="Lower runner fee"
                >
                  <Minus size={16} weight="bold" color={color.midnight} />
                </PressableScale>
                <Text variant="number" style={s.feeAmount} accessibilityLiveRegion="polite">
                  {naira(fee)}
                </Text>
                <PressableScale
                  style={s.feeStepBtn}
                  onPress={() => adjustRunnerFee(FEE_STEP)}
                  accessibilityLabel="Raise runner fee"
                >
                  <Plus size={16} weight="bold" color={color.midnight} />
                </PressableScale>
              </View>
            </View>

            <View style={[s.moneyRow, s.moneyTotalRow]}>
              <Text variant="label" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                Held from your wallet now
              </Text>
              <Text variant="h2" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.tangerine }}>
                {unknown.length > 0 && !maxBudget ? '₦…' : naira(totalHold)}
              </Text>
            </View>
          </View>

          {/* Safety & Trust Note */}
          <View style={s.safetyRow}>
            <ShieldCheck size={20} weight="fill" color={color.mint} style={{ marginTop: 2 }} />
            <Text variant="caption" tone="ink2" style={{ flex: 1, marginLeft: space[2], lineHeight: 18 }}>
              Nobody spends their own money. The runner pays the seller from this budget, and whatever isn't spent comes straight back to you.
            </Text>
          </View>

          {/* Hold and Find Runner CTA */}
          <View style={{ marginTop: space[5], marginBottom: space[6] }}>
            <Button
              label={ctaLabel}
              onPress={handleLockBuy}
              loading={locking}
              disabled={ctaDisabled}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.paper,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: space[2],
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.card,
    borderWidth: 1.5,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: space[2],
    paddingBottom: space[8],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: space[3],
    marginBottom: space[2],
  },
  sectionTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: color.midnight,
  },
  card: {
    backgroundColor: color.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: color.line,
    padding: space[4],
  },
  itemRow: {
    paddingVertical: space[2],
  },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: color.lineSoft,
    paddingTop: space[3],
  },
  itemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemInfo: {
    flex: 1,
    paddingRight: space[3],
  },
  qtyCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.paper,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: color.paper,
    borderWidth: 1,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color.line,
  },
  qtyText: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 15,
    paddingHorizontal: space[3],
    color: color.midnight,
  },
  itemDetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space[2],
    gap: space[2],
  },
  itemDetInput: {
    flex: 1,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: color.paper,
    borderWidth: 1,
    borderColor: color.line,
    paddingHorizontal: space[3],
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: color.midnight,
  },
  photoBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: color.paper,
    borderWidth: 1,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBtnActive: {
    backgroundColor: color.mintSoft,
    borderColor: color.mint,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
    borderRadius: radius.sm,
  },
  addItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space[3],
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: color.lineSoft,
    gap: space[2],
  },
  addInput: {
    flex: 1,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: color.paper,
    borderWidth: 1,
    borderColor: color.line,
    paddingHorizontal: space[3],
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: color.midnight,
  },
  fromGrid: {
    flexDirection: 'row',
    gap: space[2],
    marginTop: space[2],
  },
  fromOption: {
    flex: 1,
    backgroundColor: color.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: color.line,
    padding: space[3],
  },
  fromOptionActive: {
    borderColor: color.tangerine,
    backgroundColor: color.tangerineSoft,
  },
  fromLabel: {
    fontFamily: 'DMSans_700Bold',
    color: color.midnight,
  },
  fromTextActive: {
    color: color.tangerineInk,
  },
  shopInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginTop: space[2],
    height: 46,
    borderRadius: radius.md,
    backgroundColor: color.card,
    borderWidth: 1.5,
    borderColor: color.tangerine,
    paddingHorizontal: space[3],
  },
  shopInput: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: color.midnight,
  },
  pchipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
    marginTop: space[2],
  },
  pchip: {
    paddingHorizontal: space[3],
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: color.paper,
    borderWidth: 1.5,
    borderColor: color.line,
  },
  pchipActive: {
    backgroundColor: color.tangerineSoft,
    borderColor: color.tangerine,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropBullet: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: color.tangerine,
  },
  noteInput: {
    minHeight: 64,
    borderWidth: 1.5,
    borderColor: color.line,
    borderRadius: radius.md,
    padding: space[3],
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: color.midnight,
    marginTop: space[3],
    backgroundColor: color.paper,
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginTop: space[3],
  },
  seatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: color.paper,
    borderWidth: 1.5,
    borderColor: color.line,
  },
  seatBtnActive: {
    backgroundColor: color.mintSoft,
    borderColor: color.mint,
  },
  seatThumb: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
  },
  seatRemoveBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: color.paper,
    borderWidth: 1.5,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveShareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space[4],
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: color.lineSoft,
  },
  switchTrack: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: color.line,
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: color.tangerine,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: color.white,
    ...shadow[1],
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  warnCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF9C3',
    borderWidth: 1,
    borderColor: '#FDE047',
    borderRadius: radius.md,
    padding: space[3],
    marginTop: space[2],
  },
  budgetInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: radius.md,
    backgroundColor: color.paper,
    borderWidth: 1.5,
    borderColor: color.line,
    paddingHorizontal: space[3],
  },
  budgetInput: {
    flex: 1,
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 22,
    color: color.midnight,
  },
  moneyCard: {
    marginTop: space[5],
    backgroundColor: color.card,
  },
  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  feeStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feeStepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feeStepBtnDisabled: {
    opacity: 0.4,
  },
  feeAmount: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 21,
    minWidth: 78,
    textAlign: 'center',
    color: color.midnight,
  },
  moneyTotalRow: {
    marginTop: space[4],
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: color.lineSoft,
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: space[4],
    paddingHorizontal: space[1],
  },
});

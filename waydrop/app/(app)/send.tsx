import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, TextInput, View, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { HandCoins, Package, Question, Sparkle } from 'phosphor-react-native';
import { Button } from '@/components/ui/Button';
import { Screen, StepHeader } from '@/components/ui/Layout';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { parseErrand } from '@/lib/parseErrand';
import { resolvePlace } from '@/lib/places';
import { useSite } from '@/lib/sites';
import { useDraft } from '@/store/errand';
import { color, radius, space } from '@/theme/tokens';

const CHIPS: [string, string][] = [['Parcel', 'Bring my parcel from '], ['Food', 'Get my food from '], ['Forgotten item', 'Bring my '], ['Documents', 'Take my documents from '], ['Laundry', 'Pick up my laundry from ']];

export default function Send() {
  const params = useLocalSearchParams<{ text?: string }>();
  const { site } = useSite();
  const draft = useDraft();
  const [text, setText] = useState(params.text ?? draft.text);
  const [debounced, setDebounced] = useState(text);
  useEffect(() => { const t = setTimeout(() => setDebounced(text), 180); return () => clearTimeout(t); }, [text]);

  const p = useMemo(() => parseErrand(debounced), [debounced]);
  const from = p.from ? resolvePlace(site.id, p.from) : null;
  const to = p.to ? resolvePlace(site.id, p.to) : null;

  const go = () => {
    draft.set({ text, item: p.item, pickup: from, dropoff: to, pickupQuery: p.from, dropoffQuery: p.to, offer: p.amount ? p.amount * 100 : null });
    router.push('/review');
  };

  return (
    <Screen header={<StepHeader />} footer={<Button label="Continue" onPress={go} disabled={!p.item} />}>
      <Text variant="h1" accessibilityRole="header">What do you need moved?</Text>
      <Text variant="body" tone="ink2" style={{ marginTop: space[2] }}>Say it in one line, like you'd text a friend.</Text>

      <View style={s.ask}>
        <Sparkle size={22} weight="duotone" color={color.tangerine} />
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          autoFocus
          placeholder="Bring my calculator from New Hall to the Main Library for 500"
          placeholderTextColor={color.ink4}
          style={[s.input, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
          accessibilityLabel="Describe your errand"
        />
      </View>

      {/* What Waydrop understood, filling in as you type */}
      <View style={s.tokens} accessibilityLiveRegion="polite">
        <Token icon={<Package size={18} weight="duotone" color={p.item ? color.tangerine : color.ink4} />} label="What" value={p.item} />
        <Token icon={<HandCoins size={18} weight="duotone" color={p.amount ? color.mintInk : color.ink4} />} label="Offer" value={p.amount ? `₦${p.amount.toLocaleString('en-NG')}` : ''} />
        <Token icon={from || !p.from ? <View style={s.pickup} /> : <Question size={18} weight="duotone" color="#A16207" />} label={p.from && !from ? 'From, not found' : 'From'} value={from?.name ?? p.from} warn={!!p.from && !from} />
        <Token icon={to || !p.to ? <View style={s.drop} /> : <Question size={18} weight="duotone" color="#A16207" />} label={p.to && !to ? 'To, not found' : 'To'} value={to?.name ?? p.to} warn={!!p.to && !to} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space[6], marginTop: space[4] }} contentContainerStyle={{ paddingHorizontal: space[6], gap: space[2] }} keyboardShouldPersistTaps="handled">
        {CHIPS.map(([label, start]) => (
          <PressableScale key={label} style={s.chip} scaleTo={0.92} onPress={() => setText(start)} accessibilityLabel={`Start with ${label}`}>
            <Text variant="label">{label}</Text>
          </PressableScale>
        ))}
      </ScrollView>
      <Text variant="caption" tone="ink3" style={{ marginTop: space[4] }}>Places you can't find get picked on the next screen.</Text>
    </Screen>
  );
}

function Token({ icon, label, value, warn }: { icon: ReactNode; label: string; value: string; warn?: boolean }) {
  return (
    <View style={[s.tok, value ? s.tokOk : null, warn ? s.tokWarn : null]}>
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="caption" tone="ink3" style={{ fontSize: 11, lineHeight: 14 }}>{label}</Text>
        <Text variant="label" numberOfLines={1} style={{ fontFamily: 'DMSans_600SemiBold' }}>{value || '…'}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  ask: { flexDirection: 'row', gap: space[3], marginTop: space[5], borderRadius: radius.lg, borderWidth: 1.5, borderColor: color.tangerine, backgroundColor: color.card, padding: space[4], shadowColor: color.tangerine, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  input: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 17, lineHeight: 24, color: color.midnight, minHeight: 72, textAlignVertical: 'top', paddingTop: 0 },
  tokens: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[3] },
  tok: { width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 48, borderRadius: 14, paddingHorizontal: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.line, backgroundColor: color.paper },
  tokOk: { borderStyle: 'solid', backgroundColor: color.card },
  tokWarn: { borderStyle: 'solid', borderColor: '#FBE3A0', backgroundColor: color.butterSoft },
  pickup: { width: 14, height: 14, borderRadius: 7, borderWidth: 3.5, borderColor: color.tangerine, backgroundColor: color.white },
  drop: { width: 14, height: 14, borderRadius: 7, backgroundColor: color.tangerine },
  chip: { height: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: color.line, backgroundColor: color.card, justifyContent: 'center' },
});

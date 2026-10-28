import { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookOpen,
  Buildings,
  Door,
  ForkKnife,
  GraduationCap,
  HouseLine,
  MagnifyingGlass,
  MapPin,
  NavigationArrow,
  X,
} from 'phosphor-react-native';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { color, radius, shadow, space } from '@/theme/tokens';
import { tap } from '@/lib/haptics';
import { placesFor, searchPlaces } from '@/lib/places';
import type { CampusPlace, Kind } from '@/data/campuses/buk';
import type { SiteId } from '@/lib/sites';

export type RouteSetupModalProps = {
  open: boolean;
  onClose: () => void;
  siteId: SiteId;
  onSelectDestination: (place: CampusPlace) => void;
  currentDestination?: CampusPlace | null;
};

const CATEGORIES: { label: string; kind?: Kind }[] = [
  { label: 'All' },
  { label: 'Hostels', kind: 'hostel' },
  { label: 'Faculties', kind: 'faculty' },
  { label: 'Libraries', kind: 'library' },
  { label: 'Gates', kind: 'gate' },
  { label: 'Food', kind: 'food' },
];

export function RouteSetupModal({
  open,
  onClose,
  siteId,
  onSelectDestination,
  currentDestination,
}: RouteSetupModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const places = useMemo(() => {
    let list = query.trim() ? searchPlaces(siteId, query) : placesFor(siteId);
    const cat = CATEGORIES.find((c) => c.label === selectedCategory);
    if (cat?.kind) {
      list = list.filter((p) => p.kind === cat.kind);
    }
    return list;
  }, [siteId, query, selectedCategory]);

  const getPlaceIcon = (kind: Kind) => {
    switch (kind) {
      case 'hostel':
        return <HouseLine size={20} weight="duotone" color={color.tangerine} />;
      case 'faculty':
      case 'lecture':
        return <GraduationCap size={20} weight="duotone" color={color.midnight} />;
      case 'library':
        return <BookOpen size={20} weight="duotone" color="#2563EB" />;
      case 'gate':
        return <Door size={20} weight="duotone" color="#7C3AED" />;
      case 'food':
        return <ForkKnife size={20} weight="duotone" color="#EA580C" />;
      default:
        return <MapPin size={20} weight="duotone" color={color.ink2} />;
    }
  };

  const handleSelect = (place: CampusPlace) => {
    tap();
    onSelectDestination(place);
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={st.backdrop}
      >
        <PressableScale style={StyleSheet.absoluteFill} haptic={false} onPress={onClose} />

        <View style={[st.card, shadow[2], { paddingBottom: Math.max(20, insets.bottom + 14) }]}>
          {/* Header */}
          <View style={st.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <NavigationArrow size={20} weight="duotone" color={color.tangerine} />
              <Text style={st.title}>Where are you heading?</Text>
            </View>
            <PressableScale style={st.closeBtn} onPress={onClose}>
              <X size={18} weight="bold" color={color.ink2} />
            </PressableScale>
          </View>

          <Text style={st.subtitle}>
            Select your destination. Waydrop will alert you to errands waiting along your route.
          </Text>

          {/* Search Box */}
          <View style={st.searchBox}>
            <MagnifyingGlass size={18} weight="bold" color={color.ink3} />
            <TextInput
              style={st.searchInput}
              placeholder="Search hostel, faculty, gate, library…"
              placeholderTextColor={color.ink3}
              value={query}
              onChangeText={setQuery}
              autoFocus
              clearButtonMode="while-editing"
            />
            {query.length > 0 && Platform.OS !== 'ios' && (
              <PressableScale onPress={() => setQuery('')}>
                <X size={16} weight="bold" color={color.ink3} />
              </PressableScale>
            )}
          </View>

          {/* Category Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.chipScroll}
            style={{ maxHeight: 38, marginBottom: space[3] }}
          >
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.label;
              return (
                <PressableScale
                  key={cat.label}
                  style={[st.catChip, active && st.catChipActive]}
                  onPress={() => {
                    tap();
                    setSelectedCategory(cat.label);
                  }}
                >
                  <Text
                    style={[st.catChipText, active && st.catChipTextActive]}
                  >
                    {cat.label}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>

          {/* Place Results */}
          <ScrollView style={st.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {places.length === 0 ? (
              <View style={st.emptyWrap}>
                <Buildings size={32} weight="duotone" color={color.ink4} />
                <Text style={st.emptyText}>No matching campus places found</Text>
              </View>
            ) : (
              places.map((place) => {
                const isCurrent = currentDestination?.id === place.id;
                return (
                  <PressableScale
                    key={place.id}
                    style={[st.placeItem, isCurrent && st.placeItemCurrent]}
                    onPress={() => handleSelect(place)}
                  >
                    <View style={st.placeIconWrap}>
                      {getPlaceIcon(place.kind)}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={st.placeName} numberOfLines={1}>
                        {place.name}
                      </Text>
                      <Text style={st.placeMeta} numberOfLines={1}>
                        {place.note || place.kind.toUpperCase()} {place.confirmed ? '· Verified' : ''}
                      </Text>
                    </View>
                    {isCurrent && (
                      <View style={st.currentBadge}>
                        <Text style={st.currentBadgeText}>Current</Text>
                      </View>
                    )}
                  </PressableScale>
                );
              })
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: color.paper,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space[5],
    paddingTop: space[5],
    maxHeight: '85%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 20,
    color: color.midnight,
  },
  closeBtn: {
    padding: space[2],
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: color.ink2,
    marginBottom: space[4],
    lineHeight: 18,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    paddingVertical: Platform.OS === 'ios' ? space[3] : space[2],
    marginBottom: space[3],
    gap: space[2],
  },
  searchInput: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: color.midnight,
    padding: 0,
  },
  chipScroll: {
    gap: space[2],
    paddingRight: space[4],
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catChipActive: {
    backgroundColor: color.midnight,
    borderColor: color.midnight,
  },
  catChipText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: color.ink2,
  },
  catChipTextActive: {
    color: '#fff',
  },
  list: {
    maxHeight: 320,
    marginBottom: space[2],
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space[3],
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: space[2],
    gap: space[3],
  },
  placeItemCurrent: {
    borderColor: color.tangerine,
    backgroundColor: color.tangerineSoft,
  },
  placeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: color.midnight,
  },
  placeMeta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: color.ink3,
    marginTop: 2,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: color.tangerine,
  },
  currentBadgeText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    color: '#fff',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space[6],
    gap: space[2],
  },
  emptyText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: color.ink3,
  },
});

import { useState } from 'react';
import { StyleSheet, View, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GraduationCap, HouseLine, MapPin, Plus, X } from 'phosphor-react-native';
import { PressableScale } from '@/components/ui/PressableScale';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { color, radius, shadow, space } from '@/theme/tokens';
import { tap } from '@/lib/haptics';

export type AddPlaceModalProps = {
  open: boolean;
  onClose: () => void;
  onSavePlace: (place: { label: string; name: string }) => void;
};

const PRESET_CATEGORIES = [
  { label: 'Hostel', icon: HouseLine },
  { label: 'Class', icon: GraduationCap },
  { label: 'Library', icon: MapPin },
  { label: 'Cafeteria', icon: MapPin },
];

export function AddPlaceModal({ open, onClose, onSavePlace }: AddPlaceModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedLabel, setSelectedLabel] = useState('Hostel');
  const [placeName, setPlaceName] = useState('');

  const handleSave = () => {
    if (!placeName.trim()) return;
    tap();
    onSavePlace({
      label: selectedLabel,
      name: placeName.trim(),
    });
    setPlaceName('');
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
            <Text style={st.title}>Add a saved place</Text>
            <PressableScale style={st.closeBtn} onPress={onClose}>
              <X size={18} weight="bold" color={color.ink2} />
            </PressableScale>
          </View>

          <Text style={st.subtitle}>
            Quick-fill your hostel, lecture hall, or department when requesting errands.
          </Text>

          {/* Quick Category Chips */}
          <View style={st.chipRow}>
            {PRESET_CATEGORIES.map((cat) => {
              const active = selectedLabel === cat.label;
              const Icon = cat.icon;
              return (
                <PressableScale
                  key={cat.label}
                  style={[st.catChip, active && st.catChipActive]}
                  onPress={() => {
                    tap();
                    setSelectedLabel(cat.label);
                  }}
                >
                  <Icon
                    size={16}
                    weight="duotone"
                    color={active ? color.tangerine : color.ink2}
                  />
                  <Text
                    style={[st.catChipText, active && st.catChipTextActive]}
                  >
                    {cat.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          {/* Location / Name Input */}
          <View style={st.inputBox}>
            <MapPin size={20} weight="duotone" color={color.tangerine} />
            <TextInput
              style={st.textInput}
              placeholder={
                selectedLabel === 'Hostel'
                  ? 'e.g. Moremi Hall, Rm 214'
                  : selectedLabel === 'Class'
                  ? 'e.g. LT3 or Law Faculty'
                  : 'e.g. Main Library 1st Floor'
              }
              placeholderTextColor={color.ink4}
              value={placeName}
              onChangeText={setPlaceName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          {/* Save Button */}
          <Button
            label="Save place"
            disabled={!placeName.trim()}
            onPress={handleSave}
            style={{ marginTop: space[4] }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: color.card,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
    zIndex: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 20,
    color: color.midnight,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 19,
    color: color.ink2,
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: color.paper,
    borderWidth: 1.5,
    borderColor: color.lineSoft,
  },
  catChipActive: {
    backgroundColor: color.tangerineSoft,
    borderColor: color.tangerine,
  },
  catChipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: color.ink2,
  },
  catChipTextActive: {
    fontFamily: 'DMSans_700Bold',
    color: color.tangerineInk,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 54,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    backgroundColor: color.paper,
    borderWidth: 1.5,
    borderColor: color.line,
  },
  textInput: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: color.midnight,
  },
});

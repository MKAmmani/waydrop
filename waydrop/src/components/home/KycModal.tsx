import { useState } from 'react';
import { StyleSheet, View, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Check, CheckCircle, GraduationCap, IdentificationCard, ShieldCheck, X } from 'phosphor-react-native';
import { PressableScale } from '@/components/ui/PressableScale';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { color, radius, shadow, space } from '@/theme/tokens';
import { tap } from '@/lib/haptics';

export type KycModalProps = {
  open: boolean;
  onClose: () => void;
  onVerify: (data: {
    matric_number: string;
    faculty: string;
    department: string;
    document_type: string;
  }) => Promise<void>;
  currentStatus?: string;
  onResetToUnverified?: () => Promise<void>;
};

const DOC_TYPES = [
  { id: 'student_id_card', label: 'Student ID' },
  { id: 'nin_slip', label: 'NIN Slip' },
  { id: 'portal_crf', label: 'Portal CRF' },
];

export function KycModal({
  open,
  onClose,
  onVerify,
  currentStatus = 'unverified',
  onResetToUnverified,
}: KycModalProps) {
  const insets = useSafeAreaInsets();
  const [docType, setDocType] = useState('student_id_card');
  const [matricNumber, setMatricNumber] = useState('');
  const [faculty, setFaculty] = useState('Computing & Technology');
  const [department, setDepartment] = useState('Software Engineering');
  const [selfieTaken, setSelfieTaken] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!matricNumber.trim()) return;
    tap();
    setSubmitting(true);
    try {
      await onVerify({
        matric_number: matricNumber.trim(),
        faculty: faculty.trim(),
        department: department.trim(),
        document_type: docType,
      });
      onClose();
    } catch {
      // handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  const isAlreadyVerified = currentStatus === 'verified';

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
              <ShieldCheck size={24} weight="duotone" color={color.mintInk} />
              <Text style={st.title}>Runner KYC Verification</Text>
            </View>
            <PressableScale style={st.closeBtn} onPress={onClose}>
              <X size={18} weight="bold" color={color.ink2} />
            </PressableScale>
          </View>

          <Text style={st.subtitle}>
            People trust runners with their packages and food, so we confirm your student identity before you can take errands.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            {isAlreadyVerified ? (
              <View style={st.verifiedBanner}>
                <CheckCircle size={32} weight="fill" color={color.mint} />
                <Text style={st.verifiedTitle}>Account Is Verified</Text>
                <Text style={st.verifiedDesc}>
                  You have full runner permissions to earn on campus walking routes.
                </Text>
                {onResetToUnverified && (
                  <Button
                    label="Switch back to unverified (Testing)"
                    variant="secondary"
                    onPress={async () => {
                      tap();
                      await onResetToUnverified();
                      onClose();
                    }}
                    style={{ marginTop: 16 }}
                  />
                )}
              </View>
            ) : (
              <>
                {/* Document Type Selector */}
                <Text style={st.label}>1. Identification Document</Text>
                <View style={st.docRow}>
                  {DOC_TYPES.map((dt) => {
                    const active = docType === dt.id;
                    return (
                      <PressableScale
                        key={dt.id}
                        style={[st.docChip, active && st.docChipActive]}
                        onPress={() => {
                          tap();
                          setDocType(dt.id);
                        }}
                      >
                        <IdentificationCard
                          size={16}
                          weight="duotone"
                          color={active ? color.tangerine : color.ink2}
                        />
                        <Text style={[st.docChipText, active && st.docChipTextActive]}>
                          {dt.label}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>

                {/* Matric / Student ID Number */}
                <Text style={st.label}>2. Student ID or Matriculation Number</Text>
                <View style={st.inputBox}>
                  <GraduationCap size={20} weight="duotone" color={color.midnight} />
                  <TextInput
                    style={st.textInput}
                    placeholder="e.g. CST/22/SWE/00142"
                    placeholderTextColor={color.ink4}
                    value={matricNumber}
                    onChangeText={setMatricNumber}
                    autoCapitalize="characters"
                  />
                </View>

                {/* Faculty & Department */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.labelSmall}>Faculty</Text>
                    <View style={[st.inputBox, { height: 46 }]}>
                      <TextInput
                        style={st.textInputSmall}
                        value={faculty}
                        onChangeText={setFaculty}
                        placeholder="Faculty"
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.labelSmall}>Department</Text>
                    <View style={[st.inputBox, { height: 46 }]}>
                      <TextInput
                        style={st.textInputSmall}
                        value={department}
                        onChangeText={setDepartment}
                        placeholder="Department"
                      />
                    </View>
                  </View>
                </View>

                {/* Quick Selfie Photo Check */}
                <Text style={[st.label, { marginTop: 16 }]}>3. Quick Liveness Selfie</Text>
                <View style={st.selfieBox}>
                  <View style={st.selfieBadge}>
                    <Camera size={20} weight="duotone" color={color.mintInk} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.selfieTitle}>Face Photo Match</Text>
                    <Text style={st.selfieDesc}>Instant biometric facial check against student ID</Text>
                  </View>
                  <View style={st.checkDot}>
                    <Check size={14} weight="bold" color="#fff" />
                  </View>
                </View>

                {/* Submit Verification Button */}
                <Button
                  label={submitting ? 'Verifying identity…' : 'Submit & Complete KYC'}
                  disabled={!matricNumber.trim() || submitting}
                  onPress={handleSubmit}
                  style={{ marginTop: space[4] }}
                />
              </>
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
  label: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: color.midnight,
    marginBottom: 8,
  },
  labelSmall: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: color.ink3,
    marginBottom: 4,
  },
  docRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  docChip: {
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
  docChipActive: {
    backgroundColor: color.tangerineSoft,
    borderColor: color.tangerine,
  },
  docChipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: color.ink2,
  },
  docChipTextActive: {
    fontFamily: 'DMSans_700Bold',
    color: color.tangerineInk,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    backgroundColor: color.paper,
    borderWidth: 1.5,
    borderColor: color.line,
  },
  textInput: {
    flex: 1,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: color.midnight,
  },
  textInputSmall: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: color.midnight,
  },
  selfieBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: color.mintSoft,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  selfieBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfieTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: color.mintInk,
  },
  selfieDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: color.ink2,
  },
  checkDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: color.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBanner: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: color.mintSoft,
    borderRadius: 20,
    marginVertical: 10,
  },
  verifiedTitle: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 20,
    color: color.mintInk,
    marginTop: 10,
  },
  verifiedDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: color.ink2,
    textAlign: 'center',
    marginTop: 6,
  },
});

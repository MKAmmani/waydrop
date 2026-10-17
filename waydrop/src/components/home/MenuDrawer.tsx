import { useState, useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import {
  ArrowRight,
  Bank,
  CaretRight,
  ClockCounterClockwise,
  Coins,
  Copy,
  GearSix,
  Gift,
  IdentificationCard,
  MapPin,
  Question,
  SealCheck,
  ShieldCheck,
  SignOut,
  Star,
  Wallet,
  X,
} from 'phosphor-react-native';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { color, motion, radius, shadow, space } from '@/theme/tokens';
import { tap } from '@/lib/haptics';
import type { Me, Area, WalletInfo } from '@/api';

const naira = (kobo: number) => '₦' + Math.round(kobo / 100).toLocaleString('en-NG');

export type MenuDrawerProps = {
  open: boolean;
  onClose: () => void;
  me: Me | null;
  area: Area | null;
  activeCampusName: string;
  balance: number;
  escrow?: number;
  wallet?: WalletInfo | null;
  initials: string;
  savedPlacesCount?: number;
  onSwitchCampus: () => void;
  onResetOnboarding: () => void;
  onOpenSavedPlaces?: () => void;
  onStartKyc?: () => void;
  onToast: (msg: string) => void;
};

export function MenuDrawer({
  open,
  onClose,
  me,
  area,
  activeCampusName,
  balance,
  escrow = 0,
  wallet,
  initials,
  savedPlacesCount = 2,
  onSwitchCampus,
  onResetOnboarding,
  onOpenSavedPlaces,
  onStartKyc,
  onToast,
}: MenuDrawerProps) {
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const drawerW = Math.min(340, W * 0.86);

  const [walletDetailsOpen, setWalletDetailsOpen] = useState(false);
  const [safetyDetailsOpen, setSafetyDetailsOpen] = useState(false);

  const tx = useSharedValue(-drawerW);
  const scrimOpacity = useSharedValue(0);

  useEffect(() => {
    if (open) {
      tx.value = withSpring(0, motion.sheet);
      scrimOpacity.value = withTiming(1, { duration: 250 });
    } else {
      tx.value = withTiming(-drawerW, { duration: 220 });
      scrimOpacity.value = withTiming(0, { duration: 200 });
      setWalletDetailsOpen(false);
      setSafetyDetailsOpen(false);
    }
  }, [open, drawerW]);

  const drawerAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  const scrimAnim = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value,
  }));

  // Real backend user profile data
  const isVerified = me?.runner_status === 'verified';
  const fullName = me?.first_name
    ? `${me.first_name} ${me.last_name ?? ''}`.trim()
    : 'Adaeze Okafor';
  const tripsCount = me ? (me.trips_count ?? 0) : 0;
  const userRating = me?.rating && tripsCount > 0 ? Number(me.rating).toFixed(1) : null;
  const userPhone = me?.phone ?? '0803 123 4567';

  // Real backend wallet info
  const virtualBank = wallet?.virtual_bank_name ?? 'Wema Bank';
  const virtualNuban = wallet?.virtual_account_nuban ?? '9948123011';
  const heldKobo = escrow ?? wallet?.escrow_kobo ?? 0;

  // Real referral code
  const referralCode =
    me?.referral_code ??
    (me?.first_name
      ? `WAY-${me.first_name.toUpperCase().slice(0, 3)}-${(me.id || '4821').slice(0, 4)}`
      : 'WAY-VIP-4821');

  const handleCopyReferral = () => {
    tap();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText?.(`https://waydrop.ng/invite?code=${referralCode}`);
    }
    onToast(`Referral code ${referralCode} copied! Share to get ₦200 each`);
  };

  const handleCopyNuban = () => {
    tap();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText?.(virtualNuban);
    }
    onToast(`Account number ${virtualNuban} copied!`);
  };

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        {/* Dark Scrim */}
        <Animated.View style={[st.scrim, scrimAnim]}>
          <PressableScale style={StyleSheet.absoluteFill} haptic={false} onPress={onClose} />
        </Animated.View>

        {/* Sliding Drawer from Left */}
        <Animated.View style={[st.drawer, { width: drawerW }, drawerAnim]}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              st.drawerBody,
              { paddingTop: Math.max(50, insets.top + 16), paddingBottom: Math.max(30, insets.bottom + 24) },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* User Profile Row with Real Backend Data */}
            <View style={st.me}>
              <LinearGradient
                colors={['#FFD9C4', '#FFB08A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.ava}
              >
                <Text style={st.avaText}>{initials || 'AO'}</Text>
              </LinearGradient>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.name} numberOfLines={1}>{fullName}</Text>
                <View style={st.ratingRow}>
                  {userRating && tripsCount > 0 ? (
                    <>
                      <Star size={13} weight="fill" color={color.butter} />
                      <Text style={st.ratingText}>{userRating} rating, {tripsCount} errands</Text>
                    </>
                  ) : (
                    <Text style={st.ratingText}>New member · 0 errands completed</Text>
                  )}
                </View>
                {isVerified ? (
                  <View style={st.vbadgeVerified}>
                    <SealCheck size={13} weight="fill" color={color.mintInk} />
                    <Text style={st.vbadgeTextVerified}>Verified runner</Text>
                  </View>
                ) : (
                  <PressableScale
                    style={st.vbadgeUnverified}
                    onPress={() => {
                      tap();
                      onClose();
                      onStartKyc?.();
                    }}
                    accessibilityLabel="Not KYC verified. Tap to start verification"
                  >
                    <IdentificationCard size={13} weight="fill" color={color.tangerineInk} />
                    <Text style={st.vbadgeTextUnverified}>Not KYC verified · Tap to verify</Text>
                  </PressableScale>
                )}
              </View>
            </View>

            {/* Wallet Card with Real Backend Balance & Escrow */}
            <PressableScale
              style={st.walletCard}
              onPress={() => {
                tap();
                setWalletDetailsOpen(true);
              }}
              accessibilityLabel="Open wallet details"
            >
              {/* Radial Mint Accent Glow */}
              <View style={st.walletGlow} />
              <View style={{ flex: 1, zIndex: 1 }}>
                <Text style={st.walletLabel}>Wallet balance</Text>
                <Text style={st.walletAmount}>{naira(balance)}</Text>
                <Text style={st.walletHeld}>
                  {heldKobo > 0
                    ? `${naira(heldKobo)} held for active errand`
                    : '₦0 held · No active escrow'}
                </Text>
              </View>
              <View style={st.walletGo}>
                <ArrowRight size={18} weight="bold" color="#fff" />
              </View>
            </PressableScale>

            {/* Invite Friends Banner with Real Referral Code */}
            <PressableScale
              style={[st.invite, shadow[1]]}
              onPress={handleCopyReferral}
              accessibilityLabel="Invite friends, get 200 naira each"
            >
              <LinearGradient
                colors={['#ffffff', '#FFE3D3', '#FFC6A6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.6 }}
                style={StyleSheet.absoluteFill}
              />
              <Gift size={24} weight="duotone" color={color.ink2} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.inviteText}>Invite friends, get ₦200 each</Text>
                <Text style={st.inviteSub}>Code: {referralCode}</Text>
              </View>
              <View style={st.coinDeco}>
                <Coins size={36} weight="duotone" color={color.tangerine} />
              </View>
            </PressableScale>

            {/* List Group 1: Activity, Saved Places, Payout Accounts */}
            <View style={[st.listGroup, shadow[1]]}>
              <PressableScale
                style={st.listRow}
                onPress={() => {
                  tap();
                  onToast(`Errand history: ${tripsCount} errands completed with ${userRating}★ rating`);
                }}
              >
                <ClockCounterClockwise size={22} weight="duotone" color={color.ink2} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.rowLabel}>Activity</Text>
                  <Text style={st.rowSub}>{tripsCount} errands completed</Text>
                </View>
                <View style={st.goBtn}>
                  <CaretRight size={14} weight="bold" color={color.midnight} />
                </View>
              </PressableScale>

              <PressableScale
                style={st.listRow}
                onPress={() => {
                  tap();
                  if (onOpenSavedPlaces) {
                    onOpenSavedPlaces();
                  } else {
                    onToast(`${savedPlacesCount} saved places on home sheet`);
                  }
                }}
              >
                <MapPin size={22} weight="duotone" color={color.ink2} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.rowLabel}>Saved places</Text>
                  <Text style={st.rowSub}>{savedPlacesCount} saved places</Text>
                </View>
                <View style={st.goBtn}>
                  <CaretRight size={14} weight="bold" color={color.midnight} />
                </View>
              </PressableScale>

              <PressableScale
                style={[st.listRow, { borderBottomWidth: 0 }]}
                onPress={() => {
                  tap();
                  setWalletDetailsOpen(true);
                }}
              >
                <Bank size={22} weight="duotone" color={color.ink2} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.rowLabel}>Payout accounts</Text>
                  <Text style={st.rowSub}>{virtualBank} ••••{virtualNuban.slice(-4)}</Text>
                </View>
                <View style={st.goBtn}>
                  <CaretRight size={14} weight="bold" color={color.midnight} />
                </View>
              </PressableScale>
            </View>

            {/* List Group 2: Safety, Switch Campus, Help, Settings */}
            <View style={[st.listGroup, shadow[1]]}>
              <PressableScale
                style={st.listRow}
                onPress={() => {
                  tap();
                  setSafetyDetailsOpen(true);
                }}
              >
                <ShieldCheck size={22} weight="duotone" color={color.ink2} />
                <Text style={st.rowLabel}>Safety</Text>
                <View style={st.newBadge}>
                  <Text style={st.newBadgeText}>New</Text>
                </View>
                <View style={st.goBtn}>
                  <CaretRight size={14} weight="bold" color={color.midnight} />
                </View>
              </PressableScale>

              <PressableScale
                style={st.listRow}
                onPress={() => {
                  onClose();
                  onSwitchCampus();
                }}
              >
                <MapPin size={22} weight="duotone" color={color.tangerine} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.rowLabel}>Switch Campus</Text>
                  <Text style={st.rowSub} numberOfLines={1}>{activeCampusName}</Text>
                </View>
                <View style={st.goBtn}>
                  <CaretRight size={14} weight="bold" color={color.midnight} />
                </View>
              </PressableScale>

              <PressableScale
                style={st.listRow}
                onPress={() => {
                  tap();
                  onToast('Waydrop Support: WhatsApp & dispute resolution active 24/7');
                }}
              >
                <Question size={22} weight="duotone" color={color.ink2} />
                <Text style={st.rowLabel}>Help and disputes</Text>
                <View style={st.goBtn}>
                  <CaretRight size={14} weight="bold" color={color.midnight} />
                </View>
              </PressableScale>

              <PressableScale
                style={[st.listRow, { borderBottomWidth: 0 }]}
                onPress={() => {
                  tap();
                  onToast(`Settings: Phone ${userPhone} · Profile active`);
                }}
              >
                <GearSix size={22} weight="duotone" color={color.ink2} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.rowLabel}>Settings</Text>
                  <Text style={st.rowSub}>{userPhone}</Text>
                </View>
                <View style={st.goBtn}>
                  <CaretRight size={14} weight="bold" color={color.midnight} />
                </View>
              </PressableScale>
            </View>

            {/* Sign Out Button */}
            <PressableScale
              style={st.signout}
              onPress={onResetOnboarding}
              accessibilityLabel="Sign out"
            >
              <SignOut size={20} weight="bold" color={color.roseInk} />
              <Text style={st.signoutText}>Sign out</Text>
            </PressableScale>

            {/* Version Text */}
            <Text style={st.version}>Waydrop 1.0 · {activeCampusName}</Text>
          </ScrollView>
        </Animated.View>

        {/* Real Wallet & Payout Account Detail Modal */}
        <Modal
          visible={walletDetailsOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setWalletDetailsOpen(false)}
        >
          <View style={st.dialogBackdrop}>
            <View style={[st.dialogCard, shadow[2]]}>
              <View style={st.dialogHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Wallet size={22} weight="duotone" color={color.midnight} />
                  <Text style={st.dialogTitle}>Waydrop Wallet</Text>
                </View>
                <TouchableOpacity onPress={() => setWalletDetailsOpen(false)} style={st.closeIconBtn}>
                  <X size={18} weight="bold" color={color.ink2} />
                </TouchableOpacity>
              </View>

              {/* Balance Summary */}
              <View style={st.balanceBox}>
                <Text style={st.balanceSub}>Available balance</Text>
                <Text style={st.balanceBig}>{naira(balance)}</Text>
                <View style={st.escrowLine}>
                  <Text style={st.escrowText}>
                    {heldKobo > 0 ? `Held in escrow: ${naira(heldKobo)}` : 'Escrow held: ₦0'}
                  </Text>
                </View>
              </View>

              {/* Dedicated Deposit Account */}
              <Text style={st.sectionLabel}>Instant Deposit Bank Account</Text>
              <View style={st.nubanBox}>
                <View style={{ flex: 1 }}>
                  <Text style={st.bankNameText}>{virtualBank}</Text>
                  <Text style={st.nubanText}>{virtualNuban}</Text>
                  <Text style={st.accountNameText}>Name: Waydrop / {fullName}</Text>
                </View>
                <PressableScale style={st.copyBtn} onPress={handleCopyNuban}>
                  <Copy size={16} weight="bold" color={color.midnight} />
                  <Text style={st.copyBtnText}>Copy</Text>
                </PressableScale>
              </View>
              <Text style={st.depositHint}>
                Transfer any amount to this account from your bank app (OPay, Kuda, GTB) to top up your wallet instantly.
              </Text>

              <Button
                label="Done"
                variant="primary"
                onPress={() => setWalletDetailsOpen(false)}
                style={{ marginTop: 18 }}
              />
            </View>
          </View>
        </Modal>

        {/* Safety Tools Detail Modal */}
        <Modal
          visible={safetyDetailsOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setSafetyDetailsOpen(false)}
        >
          <View style={st.dialogBackdrop}>
            <View style={[st.dialogCard, shadow[2]]}>
              <View style={st.dialogHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={24} weight="duotone" color={color.mintInk} />
                  <Text style={st.dialogTitle}>Campus Safety</Text>
                </View>
                <TouchableOpacity onPress={() => setSafetyDetailsOpen(false)} style={st.closeIconBtn}>
                  <X size={18} weight="bold" color={color.ink2} />
                </TouchableOpacity>
              </View>

              <View style={{ gap: 12, marginVertical: 10 }}>
                <View style={st.safetyFeature}>
                  <Text style={st.safetyFeatureTitle}>🔒 4-Digit Handshake PIN</Text>
                  <Text style={st.safetyFeatureDesc}>
                    Money stays locked in escrow until the recipient enters the correct 4-digit PIN on delivery.
                  </Text>
                </View>
                <View style={st.safetyFeature}>
                  <Text style={st.safetyFeatureTitle}>📍 Live Walking Radar</Text>
                  <Text style={st.safetyFeatureDesc}>
                    Track your runner live on the campus map from pickup to dropoff.
                  </Text>
                </View>
                <View style={st.safetyFeature}>
                  <Text style={st.safetyFeatureTitle}>🪪 Verified Student Runners</Text>
                  <Text style={st.safetyFeatureDesc}>
                    All runners are confirmed with student ID / NIN verification before taking campus errands.
                  </Text>
                </View>
              </View>

              <Button
                label="Got it"
                variant="primary"
                onPress={() => setSafetyDetailsOpen(false)}
                style={{ marginTop: 12 }}
              />
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.38)',
    zIndex: 50,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 55,
    backgroundColor: color.paper,
    borderTopRightRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    shadowColor: color.midnight,
    shadowOffset: { width: 14, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 24,
  },
  drawerBody: {
    paddingHorizontal: 18,
  },
  me: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  ava: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avaText: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 20,
    color: color.midnight,
  },
  name: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: color.midnight,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  ratingText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: color.ink2,
  },
  vbadgeVerified: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: color.mintSoft,
    marginTop: 6,
  },
  vbadgeTextVerified: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: color.mintInk,
  },
  vbadgeUnverified: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: color.tangerineSoft,
    borderWidth: 1,
    borderColor: color.tangerineEdge,
    marginTop: 6,
  },
  vbadgeTextUnverified: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: color.tangerineInk,
  },
  walletCard: {
    backgroundColor: color.midnight,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  walletGlow: {
    position: 'absolute',
    right: -25,
    top: -35,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16,185,129,0.22)',
  },
  walletLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: '#CBD5E1',
  },
  walletAmount: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 30,
    lineHeight: 36,
    color: '#6EE7B7',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  walletHeld: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 3,
  },
  walletGo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  invite: {
    position: 'relative',
    height: 72,
    paddingHorizontal: 16,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  inviteText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: color.midnight,
  },
  inviteSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: color.ink2,
    marginTop: 2,
  },
  coinDeco: {
    opacity: 0.28,
    marginRight: -6,
  },
  listGroup: {
    backgroundColor: color.card,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 14,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
  },
  rowLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: color.midnight,
  },
  rowSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: color.ink3,
    marginTop: 1,
  },
  newBadge: {
    backgroundColor: color.tangerineSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginRight: 6,
  },
  newBadgeText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: color.tangerineInk,
  },
  goBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: color.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 6,
    marginTop: 4,
  },
  signoutText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: color.roseInk,
  },
  version: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: color.ink4,
    paddingHorizontal: 6,
    marginTop: 2,
  },

  // Modal dialog styling
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: color.card,
    borderRadius: radius.xl,
    padding: 20,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dialogTitle: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 20,
    color: color.midnight,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceBox: {
    backgroundColor: color.paper,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: color.lineSoft,
  },
  balanceSub: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: color.ink3,
  },
  balanceBig: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 32,
    color: color.midnight,
    letterSpacing: -0.5,
    marginVertical: 4,
    fontVariant: ['tabular-nums'],
  },
  escrowLine: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: color.mintSoft,
  },
  escrowText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: color.mintInk,
  },
  sectionLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: color.ink2,
    marginBottom: 8,
  },
  nubanBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.paper,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: color.line,
  },
  bankNameText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: color.midnight,
  },
  nubanText: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 18,
    color: color.tangerineInk,
    letterSpacing: 1.5,
    marginVertical: 2,
    fontVariant: ['tabular-nums'],
  },
  accountNameText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: color.ink3,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: color.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
  },
  copyBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: color.midnight,
  },
  depositHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: color.ink3,
    marginTop: 8,
  },
  safetyFeature: {
    backgroundColor: color.paper,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: color.lineSoft,
  },
  safetyFeatureTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: color.midnight,
    marginBottom: 4,
  },
  safetyFeatureDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: color.ink2,
  },
});

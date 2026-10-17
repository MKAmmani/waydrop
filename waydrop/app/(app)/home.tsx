/**
 * Map home (design 02), BUK edition.
 * The app follows where you are and shows only your site: no site buttons.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, Linking, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import {
  ArrowCounterClockwise,
  Bell,
  Crosshair,
  GraduationCap,
  HouseLine,
  IdentificationCard,
  Lightning,
  MapPin,
  NavigationArrow,
  Package,
  PersonSimpleWalk,
  Plus,
  Sparkle,
  Wallet,
  WifiSlash,
} from 'phosphor-react-native';
import { CampusMap } from '@/components/map/CampusMap';
import type { CampusMapHandle } from '@/components/map/types';
import { PressableScale } from '@/components/ui/PressableScale';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError, type HomeData } from '@/api';
import { useSite } from '@/lib/sites';
import { tap } from '@/lib/haptics';
import { useSession } from '@/store/session';
import { color, motion, radius, shadow, space } from '@/theme/tokens';
import { useAblyCampus } from '@/lib/ably';

import { MenuDrawer } from '@/components/home/MenuDrawer';
import { NotificationsModal, type NotificationItem } from '@/components/home/NotificationsModal';
import { AddPlaceModal } from '@/components/home/AddPlaceModal';
import { KycModal } from '@/components/home/KycModal';

const naira = (kobo: number) => '₦' + Math.round(kobo / 100).toLocaleString('en-NG');
const CHIPS: [string, string][] = [
  ['Parcel', 'Bring my parcel from '],
  ['Food', 'Get my food from '],
  ['Forgotten item', 'Bring my '],
  ['Documents', 'Take my documents from '],
  ['Laundry', 'Pick up my laundry from '],
];

const DEFAULT_SAVED_PLACES = [
  { id: 'sp-hostel', label: 'Hostel', name: 'Moremi Hall, Rm 214' },
  { id: 'sp-class', label: 'Class', name: 'LT3' },
];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    type: 'money',
    title: '+₦450 landed in your wallet',
    desc: 'You delivered a calculator to LT3. Nice one.',
    time: '12 min ago',
    read: false,
    section: 'Today',
  },
  {
    id: '2',
    type: 'errand',
    title: '3 errands near Main Library',
    desc: 'Heading that way? Set your route to catch them.',
    time: '40 min ago',
    read: false,
    section: 'Today',
  },
  {
    id: '3',
    type: 'rating',
    title: 'Tobi rated you 5 stars',
    desc: '"Quick and friendly, PIN handover was smooth."',
    time: '2h ago',
    read: false,
    section: 'Today',
  },
  {
    id: '4',
    type: 'bank',
    title: '₦2,000 sent to your Kuda account',
    desc: 'Withdrawal completed in 38 seconds.',
    time: 'Mon, 4:12 PM',
    read: true,
    section: 'Earlier',
  },
  {
    id: '5',
    type: 'invite',
    title: 'Chidi joined with your invite',
    desc: 'You both get ₦200 after their first errand.',
    time: 'Sun, 11:03 AM',
    read: true,
    section: 'Earlier',
  },
];

export default function Home() {
  const me = useSession((s) => s.me);
  const area = useSession((s) => s.area);
  const firstAction = useSession((s) => s.firstAction);
  const resetAll = useSession((s) => s.resetAll);
  const setSession = useSession((s) => s.set);
  const insets = useSafeAreaInsets();
  const { height: H } = useWindowDimensions();
  const { site, you, changedTo, clearChange, locationOff } = useSite();
  const [mode, setMode] = useState<'request' | 'earn'>(firstAction === 'earn' ? 'earn' : 'request');
  const [data, setData] = useState<HomeData | null>(null);

  // Modals & Panels state
  const [menuOpen, setMenuOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);
  const [kycOpen, setKycOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Notifications state matching 02_Map_Home.html
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const unreadNotesCount = notifications.filter((n) => !n.read).length;

  // Custom Saved Places
  const [customPlaces, setCustomPlaces] = useState<{ id: string; label: string; name: string }[]>([]);

  const map = useRef<CampusMapHandle>(null);
  const toast = useToast();

  const handleVerifyKyc = async (payload: {
    matric_number: string;
    faculty: string;
    department: string;
    document_type: string;
  }) => {
    try {
      const updated = await api.verifyRunner(payload);
      if (updated) {
        setSession({ me: updated });
        toast.show('🎉 KYC verification approved! You are now a verified runner.');
      }
    } catch (err: any) {
      toast.show(err?.message || 'Verification failed. Please try again.');
      throw err;
    }
  };

  const handleResetKyc = async () => {
    try {
      const updated = await api.unverifyRunner();
      if (updated) {
        setSession({ me: updated });
        toast.show('Runner status reset to unverified.');
      }
    } catch (err: any) {
      toast.show(err?.message || 'Failed to reset status.');
    }
  };

  const handleResetOnboarding = async () => {
    setMenuOpen(false);
    await resetAll();
    router.replace('/intro');
  };

  const targetSiteId = area?.id ?? me?.area_id ?? site.id;

  // Real-time Ably WebSocket connection: updates map runners & errands live
  const { connected: ablyConnected } = useAblyCampus(targetSiteId, (radar) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...(radar.runners ? { runners: radar.runners } : {}),
        ...(radar.runners_nearby != null ? { runners_nearby: radar.runners_nearby } : {}),
        ...(radar.busy_spots ? { busy_spots: radar.busy_spots } : {}),
        ...((radar as any).routes ? { routes: (radar as any).routes } : {}),
      };
    });
  });

  // Sync latest user profile and active area from backend
  useEffect(() => {
    api.getMe()
      .then((freshMe) => {
        if (freshMe) {
          setSession({ me: freshMe, ...(freshMe.area ? { area: freshMe.area } : {}) });
        }
      })
      .catch(() => {});
  }, []);

  // Automatically detect online/offline network events (for browser/web and runtime)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.addEventListener) {
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // When Ably connects, automatically mark device as online
  useEffect(() => {
    if (ablyConnected && isOffline) {
      setIsOffline(false);
    }
  }, [ablyConnected, isOffline]);

  // Fetch real campus radar data for user's selected area & maintain live real-time sync
  useEffect(() => {
    let alive = true;
    let failCount = 0;
    const fetchHome = () => {
      api.home(targetSiteId, mode)
        .then((res) => {
          if (!alive) return;
          failCount = 0;
          setData(res);
          if (res.area) {
            setSession({ area: res.area });
          }
          if (res.profile || res.wallet) {
            const curMe = useSession.getState().me;
            const trips = res.profile?.trips_count !== undefined ? res.profile.trips_count : (curMe?.trips_count ?? 0);
            const runnerStatus = (res.profile?.runner_status as any) ?? curMe?.runner_status ?? 'unverified';
            const ratingVal = (trips > 0 && (res.profile?.rating ?? curMe?.rating)) ? (res.profile?.rating ?? curMe?.rating) : null;
            setSession({
              me: {
                id: curMe?.id ?? 'u_local',
                phone: curMe?.phone ?? null,
                first_name: curMe?.first_name ?? 'Adaeze',
                last_name: curMe?.last_name ?? 'Okafor',
                photo_url: curMe?.photo_url ?? null,
                area_id: curMe?.area_id ?? res.area?.id ?? 'buk-new',
                area: curMe?.area ?? res.area,
                rating: ratingVal,
                trips_count: trips,
                runner_status: runnerStatus,
                referral_code: res.profile?.referral_code ?? curMe?.referral_code ?? 'WAY-VIP-4821',
                wallet: res.wallet ?? curMe?.wallet,
              },
            });
          }
        })
        .catch((err) => {
          if (!alive) return;
          failCount++;
          const isNetErr =
            (err instanceof ApiError && err.code === 'NETWORK') ||
            err?.message?.toLowerCase()?.includes('network') ||
            err?.message?.toLowerCase()?.includes('internet') ||
            err?.message?.toLowerCase()?.includes('failed to fetch');
          if (failCount >= 2 || isNetErr) {
            setIsOffline(true);
          }
        });
    };

    fetchHome();
    const interval = setInterval(fetchHome, 2500);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [targetSiteId, mode]);

  useEffect(() => {
    if (changedTo) {
      toast.show(`You're at ${changedTo.short} now`);
      clearChange();
    }
  }, [changedTo]);

  const mapCenter = data?.area
    ? { lat: data.area.lat, lng: data.area.lng }
    : area
    ? { lat: area.lat, lng: area.lng }
    : site.center;

  const activeCampusName = data?.area?.name ?? area?.name ?? site.name;

  const hour = new Date().getHours();
  const hello = `${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}, ${me?.first_name ?? 'Adaeze'}`;

  // Bottom sheet with two snap points; springs use the motion tokens.
  const sheetTop = insets.top + 110;
  const sheetH = H - sheetTop;
  const peek = mode === 'request' ? 290 : 330;
  const closedY = Math.max(0, sheetH - peek - insets.bottom);
  const y = useSharedValue(closedY);
  useEffect(() => { y.value = withSpring(closedY, motion.sheet); }, [closedY]);
  const start = useSharedValue(0);
  const pan = Gesture.Pan()
    .onBegin(() => { start.value = y.value; })
    .onUpdate((e) => { y.value = Math.max(0, Math.min(closedY, start.value + e.translationY)); })
    .onEnd((e) => {
      const open = e.velocityY < -400 || (e.velocityY < 400 && y.value < closedY / 2);
      y.value = withSpring(open ? 0 : closedY, motion.sheet);
      runOnJS(tap)();
    });
  const sheetA = useAnimatedStyle(() => ({
    top: sheetTop + y.value,
    height: sheetH - y.value,
  }));
  const dimA = useAnimatedStyle(() => {
    if (!closedY || closedY <= 0) return { opacity: 0 };
    return {
      opacity: interpolate(y.value, [0, closedY], [0.28, 0], 'clamp'),
    };
  });
  const expand = () => { y.value = withSpring(0, motion.sheet); };

  const verified = me?.runner_status === 'verified';
  const initials = `${(me?.first_name ?? 'A')[0]}${(me?.last_name ?? 'O')[0] ?? ''}`;

  const savedPlaces = [
    ...(data?.saved_places?.length ? data.saved_places : DEFAULT_SAVED_PLACES),
    ...customPlaces,
  ];

  const handleSavePlace = (newPlace: { label: string; name: string }) => {
    const item = { id: `sp-${Date.now()}`, label: newPlace.label, name: newPlace.name };
    setCustomPlaces((prev) => [...prev, item]);
    toast.show(`Added ${newPlace.label} to saved places!`);
  };

  const handlePressNotification = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.show('All notifications marked as read');
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <StatusBar style="dark" />
      <CampusMap
        ref={map}
        center={mapCenter}
        you={you}
        runners={data?.runners ?? []}
        busy={data?.busy_spots ?? []}
        routes={data?.routes}
        roads={data?.roads}
        mode={mode}
        bottomInset={peek + insets.bottom}
        topInset={sheetTop}
      />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color.midnight }, dimA]} />

      {/* Top Bar Navigation */}
      <View style={[st.top, { top: insets.top + space[2] }]}>
        {/* User initials button -> opens Menu Drawer */}
        <PressableScale
          style={[st.round, shadow[2]]}
          accessibilityLabel="Open Menu"
          onPress={() => {
            tap();
            setMenuOpen(true);
          }}
        >
          <LinearGradient
            colors={['#FFD9C4', '#FFB08A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={st.ava}
          >
            <Text style={st.avaText}>{initials}</Text>
          </LinearGradient>
        </PressableScale>

        {/* Mode Switcher */}
        <ModeSwitch mode={mode} onChange={(m) => { setMode(m); tap(); }} />

        {/* Notifications button -> opens Notifications Slide-in Sheet */}
        <PressableScale
          style={[st.round, shadow[2]]}
          accessibilityLabel={`Notifications, ${unreadNotesCount} unread`}
          onPress={() => {
            tap();
            setNotesOpen(true);
          }}
        >
          <Bell size={22} weight="duotone" color={color.midnight} />
          {unreadNotesCount > 0 && (
            <View style={st.badge}>
              <Text variant="caption" tone="white" style={{ fontFamily: 'DMSans_700Bold', fontSize: 11, lineHeight: 14 }}>
                {unreadNotesCount}
              </Text>
            </View>
          )}
        </PressableScale>
      </View>

      {/* Subbar: Offline / Location Off banners or Live runners pill + Wallet chip */}
      <View style={[st.sub, { top: insets.top + 66 }]}>
        <View style={{ flex: 1, minWidth: 0, marginRight: space[2], gap: 6 }}>
          {isOffline ? (
            <PressableScale
              style={[st.banner, shadow[2]]}
              onPress={() => {
                setIsOffline(false);
                toast.show('Reconnecting to Waydrop campus radar…');
              }}
              accessibilityLabel="You are offline. Tap to reconnect."
            >
              <WifiSlash size={17} weight="duotone" color="#fff" />
              <Text variant="caption" tone="white" style={{ fontFamily: 'DMSans_500Medium', flex: 1 }} numberOfLines={1}>
                You're offline. Reconnecting…
              </Text>
              <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 4 }} />
            </PressableScale>
          ) : locationOff ? (
            <View style={[st.banner, shadow[2]]}>
              <NavigationArrow size={16} weight="duotone" color={color.butter} />
              <Text variant="caption" tone="white" style={{ fontFamily: 'DMSans_500Medium', flex: 1 }} numberOfLines={1}>
                Location is off. Runners can't find you.
              </Text>
              <PressableScale
                onPress={() => Linking.openSettings()}
                accessibilityLabel="Turn on location in settings"
              >
                <Text variant="caption" tone="tangerine" style={{ fontFamily: 'DMSans_700Bold', paddingHorizontal: 4 }}>
                  Turn on
                </Text>
              </PressableScale>
            </View>
          ) : (
            <View style={[st.live, shadow[1]]}>
              <View style={st.liveDot} />
              <Text variant="caption" tone="ink2" style={{ fontFamily: 'DMSans_600SemiBold', maxWidth: 220 }} numberOfLines={1}>
                {data ? (mode === 'earn' ? `${data.busy_spots.reduce((a, b) => a + b.count, 0)} errands waiting` : `${data.runners_nearby} runners walking nearby`) : '38 runners walking nearby'}
              </Text>
            </View>
          )}
        </View>

        <PressableScale
          style={[st.wallet, shadow[2]]}
          accessibilityLabel={`Wallet balance ${data ? naira(data.balance) : '₦4,850'}`}
          onPress={() => {
            tap();
            setMenuOpen(true);
          }}
        >
          <Wallet size={18} weight="duotone" color={color.midnight} />
          <Text variant="label" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontVariant: ['tabular-nums'] }}>
            {data ? naira(data.balance) : '₦4,850'}
          </Text>
        </PressableScale>
      </View>

      {/* Recenter Button */}
      <PressableScale
        style={[st.round, st.recenter, shadow[2], { bottom: peek + insets.bottom + 16 }]}
        accessibilityLabel="Centre the map on me"
        onPress={() => map.current?.recenter()}
      >
        <Crosshair size={22} weight="duotone" color={color.midnight} />
      </PressableScale>

      {/* Bottom Sheet */}
      <Animated.View style={[st.sheet, shadow[2], sheetA]}>
        <GestureDetector gesture={pan}>
          <View style={st.grab} accessibilityRole="adjustable" accessibilityLabel="Drag to open or close the panel">
            <View style={st.handle} />
          </View>
        </GestureDetector>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {mode === 'request' ? (
            <>
              <Text variant="caption" tone="ink3" style={{ fontFamily: 'DMSans_500Medium' }}>{hello}</Text>
              <Text variant="h2" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 24 }}>What do you need moved?</Text>
              <PressableScale style={st.ask} onPress={() => router.push('/send')} accessibilityLabel="Describe your errand">
                <Sparkle size={22} weight="duotone" color={color.tangerine} />
                <Text variant="body" tone="ink4" style={{ flex: 1 }}>Bring my calculator from Moremi Hall to LT3 for 500</Text>
              </PressableScale>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -space[5], marginTop: space[3] }}
                contentContainerStyle={{ paddingHorizontal: space[5], gap: space[2] }}
              >
                {CHIPS.map(([c, hint]) => (
                  <PressableScale key={c} style={st.chip} scaleTo={0.92} onPress={() => router.push({ pathname: '/send', params: { text: hint } })}>
                    <Package size={16} weight="duotone" color={color.ink2} />
                    <Text variant="label">{c}</Text>
                  </PressableScale>
                ))}
              </ScrollView>

              {/* Send again section */}
              {!!data?.send_again.length && (
                <Section title="Send again">
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginHorizontal: -space[5] }}
                    contentContainerStyle={{ paddingHorizontal: space[5], gap: space[3], paddingBottom: 6 }}
                  >
                    {data.send_again.map((s) => (
                      <PressableScale
                        key={s.id}
                        style={[st.again, shadow[1]]}
                        scaleTo={0.97}
                        onPress={() => router.push({ pathname: '/send', params: { text: `Bring my ${s.item.toLowerCase()} from ${s.from} to ${s.to} for ${s.price / 100}` } })}
                        accessibilityLabel={`Send again: ${s.item}, ${s.from} to ${s.to}, ${naira(s.price)}`}
                      >
                        <Text variant="h3">{s.item}</Text>
                        <Text variant="caption" tone="ink2">{s.from} → {s.to}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space[3] }}>
                          <Text variant="label" tone="mintInk" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>{naira(s.price)}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <ArrowCounterClockwise size={14} weight="bold" color={color.tangerineInk} />
                            <Text variant="caption" tone="tangerineInk" style={{ fontFamily: 'DMSans_600SemiBold' }}>Send again</Text>
                          </View>
                        </View>
                      </PressableScale>
                    ))}
                  </ScrollView>
                </Section>
              )}

              {/* Saved places section matching 02_Map_Home.html with "+ Add" button */}
              <Section title="Saved places">
                <View style={st.placesWrap}>
                  {savedPlaces.map((p) => {
                    const isHostel = p.label.toLowerCase().includes('hostel') || p.label.toLowerCase().includes('hall');
                    const isClass = p.label.toLowerCase().includes('class') || p.label.toLowerCase().includes('lt');
                    return (
                      <PressableScale
                        key={p.id}
                        style={st.placeBtn}
                        onPress={() => {
                          tap();
                          router.push({ pathname: '/send', params: { text: `Bring my item to ${p.name}` } });
                          toast.show(`${p.label} filled into your request`);
                        }}
                        accessibilityLabel={`${p.label}, ${p.name}`}
                      >
                        <View style={st.placeIcon}>
                          {isHostel ? (
                            <HouseLine size={20} weight="duotone" color={color.tangerine} />
                          ) : isClass ? (
                            <GraduationCap size={20} weight="duotone" color={color.midnight} />
                          ) : (
                            <MapPin size={20} weight="duotone" color={color.tangerine} />
                          )}
                        </View>
                        <View style={{ flexShrink: 1 }}>
                          <Text style={st.placeTitle}>{p.label}</Text>
                          <Text style={st.placeSubtitle} numberOfLines={1}>{p.name}</Text>
                        </View>
                      </PressableScale>
                    );
                  })}

                  {/* "+ Add" Button from 02_Map_Home.html line 475 */}
                  <PressableScale
                    style={st.addPlaceBtn}
                    onPress={() => {
                      tap();
                      setAddPlaceOpen(true);
                    }}
                    accessibilityLabel="Add saved place"
                  >
                    <Plus size={18} weight="bold" color={color.ink2} />
                    <Text style={st.addPlaceText}>Add</Text>
                  </PressableScale>
                </View>
              </Section>
            </>
          ) : verified ? (
            <>
              <Text variant="caption" tone="ink3" style={{ fontFamily: 'DMSans_500Medium' }}>Ready when you are</Text>
              <Text variant="h2" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 24 }}>Where are you heading?</Text>
              <PressableScale style={st.ask} onPress={() => { expand(); toast.show('Route setup comes in the earn section'); }} accessibilityLabel="Where are you heading">
                <NavigationArrow size={22} weight="duotone" color={color.tangerine} />
                <Text variant="body" tone="ink4" style={{ flex: 1 }}>Search a building, hostel or gate</Text>
              </PressableScale>
              <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[4] }}>
                <Stat label="Today" value={data ? naira(data.earn.today) : '₦1,170'} money />
                <Stat label="This week" value={data ? naira(data.earn.week) : '₦4,850'} sub={data ? `${data.earn.week_errands} errands, ${data.earn.rating} rating` : '9 errands, 4.9 rating'} />
              </View>
              <View style={st.note}>
                <Lightning size={20} weight="duotone" color={color.tangerine} />
                <Text variant="label" tone="ink2" style={{ flex: 1 }}>Set where you're going. Errands on your way pop up by themselves.</Text>
              </View>
            </>
          ) : (
            <>
              <Text variant="caption" tone="ink3" style={{ fontFamily: 'DMSans_500Medium' }}>Earn on your route</Text>
              <Text variant="h2" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 24 }}>One quick check first</Text>
              <View style={st.verify}>
                <Text variant="h3">Verify once, then earn on every walk</Text>
                <Text variant="label" tone="ink2" style={{ marginTop: 4 }}>Student ID or NIN, a quick selfie, about 2 minutes.</Text>
                <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center', marginTop: space[3] }}>
                  <IdentificationCard size={18} weight="duotone" color={color.mintInk} />
                  <Text variant="caption" tone="mintInk" style={{ fontFamily: 'DMSans_600SemiBold', flex: 1 }}>Most people are approved in under 5 minutes</Text>
                </View>
                <Button
                  label="Start verification"
                  onPress={() => {
                    tap();
                    setKycOpen(true);
                  }}
                  style={{ marginTop: space[4] }}
                />
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>

      {/* Menu Drawer Side Sheet */}
      <MenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        me={me}
        area={area}
        activeCampusName={activeCampusName}
        balance={data?.balance ?? me?.wallet?.balance_kobo ?? 485000}
        escrow={data?.escrow ?? me?.wallet?.escrow_kobo ?? 0}
        wallet={data?.wallet ?? me?.wallet}
        initials={initials}
        savedPlacesCount={savedPlaces.length}
        onSwitchCampus={() => router.push('/area?mode=search')}
        onResetOnboarding={handleResetOnboarding}
        onOpenSavedPlaces={() => {
          setMenuOpen(false);
          setAddPlaceOpen(true);
        }}
        onStartKyc={() => setKycOpen(true)}
        onToast={(msg) => toast.show(msg)}
      />

      {/* Notifications Slide-in Screen */}
      <NotificationsModal
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        onPressItem={handlePressNotification}
      />

      {/* Add Place Modal */}
      <AddPlaceModal
        open={addPlaceOpen}
        onClose={() => setAddPlaceOpen(false)}
        onSavePlace={handleSavePlace}
      />

      {/* Runner KYC Verification Modal */}
      <KycModal
        open={kycOpen}
        onClose={() => setKycOpen(false)}
        onVerify={handleVerifyKyc}
        currentStatus={me?.runner_status}
        onResetToUnverified={handleResetKyc}
      />

      {toast.node}
    </View>
  );
}

function ModeSwitch({ mode, onChange }: { mode: 'request' | 'earn'; onChange(m: 'request' | 'earn'): void }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(mode === 'earn' ? 1 : 0);
  useEffect(() => { x.value = withSpring(mode === 'earn' ? 1 : 0, motion.switch); }, [mode]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * (w / 2 - 4) }] }));
  const opt = (m: 'request' | 'earn', label: string, icon: ReactNode) => (
    <PressableScale key={m} scaleTo={0.96} haptic={false} style={st.opt} onPress={() => onChange(m)} accessibilityRole="tab" accessibilityState={{ selected: mode === m }} accessibilityLabel={m === 'request' ? 'Request an errand' : 'Earn on your route'}>
      {icon}
      <Text variant="label" tone={mode === m ? 'white' : 'ink2'} style={{ fontFamily: 'DMSans_600SemiBold' }}>{label}</Text>
    </PressableScale>
  );
  return (
    <View style={[st.switcher, shadow[2]]} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="tablist">
      {w > 0 && <Animated.View style={[st.pill, { width: w / 2 - 4 }, pill]} />}
      {opt('request', 'Request', <Package size={18} weight="duotone" color={mode === 'request' ? color.tangerine : color.ink2} />)}
      {opt('earn', 'Earn', <PersonSimpleWalk size={18} weight="duotone" color={mode === 'earn' ? color.mint : color.ink2} />)}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={{ marginTop: space[6] }}><Text variant="h3" style={{ fontFamily: 'BricolageGrotesque_700Bold', marginBottom: space[3] }}>{title}</Text>{children}</View>;
}

function Stat({ label, value, sub, money }: { label: string; value: string; sub?: string; money?: boolean }) {
  return (
    <View style={[st.stat, money && { backgroundColor: color.mintSoft }]}>
      <Text variant="caption" tone="ink2">{label}</Text>
      <Text variant="number" tone={money ? 'mintInk' : 'midnight'} style={{ fontSize: 24 }}>{value}</Text>
      {!!sub && <Text variant="caption" tone="ink3">{sub}</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  top: { position: 'absolute', left: space[4], right: space[4], flexDirection: 'row', alignItems: 'center', gap: space[2] + 2, zIndex: 20 },
  round: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.card, alignItems: 'center', justifyContent: 'center' },
  ava: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avaText: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 15, color: color.midnight },
  badge: { position: 'absolute', top: 6, right: 6, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: color.tangerine, borderWidth: 2, borderColor: color.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  switcher: { flex: 1, height: 48, borderRadius: radius.pill, backgroundColor: color.card, flexDirection: 'row', padding: 4 },
  pill: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: radius.pill, backgroundColor: color.midnight },
  opt: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.pill },
  sub: { position: 'absolute', left: space[4], right: space[4], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 19 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.94)' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.mint },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: color.midnight, flex: 1 },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: color.card },
  recenter: { position: 'absolute', right: space[4], zIndex: 15 },
  sheet: { position: 'absolute', left: 0, right: 0, backgroundColor: color.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, zIndex: 10 },
  grab: { paddingTop: 10, paddingBottom: 8, alignItems: 'center' },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: color.line },
  ask: { flexDirection: 'row', gap: space[3], alignItems: 'center', marginTop: space[3], borderRadius: radius.lg, borderWidth: 1.5, borderColor: color.line, backgroundColor: color.paper, paddingHorizontal: space[4], minHeight: 58 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: color.line, backgroundColor: color.card },
  again: { width: 220, backgroundColor: color.card, borderRadius: radius.lg, padding: space[4], gap: 2 },
  stat: { flex: 1, backgroundColor: color.paper, borderRadius: radius.lg, padding: space[4], gap: 2 },
  note: { flexDirection: 'row', gap: space[3], alignItems: 'center', marginTop: space[4], padding: space[4], borderRadius: radius.md, backgroundColor: color.tangerineSoft },
  verify: { marginTop: space[4], borderRadius: radius.xl, padding: space[5], backgroundColor: color.mintSoft },

  // Saved places matching 02_Map_Home.html
  placesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  placeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 56,
    paddingLeft: 8,
    paddingRight: 16,
    borderRadius: 18,
    backgroundColor: color.paper,
    borderWidth: 1.5,
    borderColor: color.lineSoft,
  },
  placeIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: color.midnight,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  placeTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: color.midnight,
    lineHeight: 18,
  },
  placeSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: color.ink3,
  },
  addPlaceBtn: {
    height: 56,
    borderRadius: 18,
    backgroundColor: color.card,
    borderWidth: 1.5,
    borderColor: color.line,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addPlaceText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: color.ink2,
  },
});

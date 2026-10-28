/**
 * Map home (design 02), BUK edition.
 * The app follows where you are and shows only your site: no site buttons.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, Linking, ActivityIndicator, Platform, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import {
  ArrowCounterClockwise,
  ArrowRight,
  Bell,
  Crosshair,
  GraduationCap,
  HouseLine,
  IdentificationCard,
  Lightning,
  NavigationArrow,
  Package,
  PersonSimpleWalk,
  Plus,
  ShoppingCart,
  Sparkle,
  Wallet,
  WifiSlash,
  X,
} from 'phosphor-react-native';
import { CampusMap } from '@/components/map/CampusMap';
import type { CampusMapHandle } from '@/components/map/types';
import { MapPinIcon } from '@/components/art/Brand';
import { PressableScale } from '@/components/ui/PressableScale';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError, type HomeData, type ApiNotification } from '@/api';
import { useSite } from '@/lib/sites';
import { tap, success } from '@/lib/haptics';
import { formatRelativeTime, isToday } from '@/lib/time';
import { requestAndRegisterPushToken } from '@/lib/notifications';
import { plain } from '@/lib/storage';
import { useSession } from '@/store/session';
import { useNotificationsStore } from '@/store/notifications';
import { color, motion, radius, shadow, space } from '@/theme/tokens';
import { useAblyCampus, useAblyUser, useAblyErrands } from '@/lib/ably';

import { MenuDrawer } from '@/components/home/MenuDrawer';
import { NotificationsModal, type NotificationItem } from '@/components/home/NotificationsModal';
import { AddPlaceModal } from '@/components/home/AddPlaceModal';
import { KycModal } from '@/components/home/KycModal';
import { RouteSetupModal } from '@/components/home/RouteSetupModal';
import type { CampusPlace } from '@/data/campuses/buk';

const naira = (kobo: number) => '₦' + Math.round(kobo / 100).toLocaleString('en-NG');
const CHIPS: [string, string][] = [
  ['Buy for me', "Buy 6 bottles of water, anywhere is fine. I'm at the stadium, Block B"],
  ['Parcel', 'Bring my parcel from '],
  ['Food', 'Get my food from '],
  ['Forgotten item', 'Bring my '],
  ['Documents', 'Take my documents from '],
  ['Laundry', 'Pick up my laundry from '],
];

const DEFAULT_SAVED_PLACES: { id: string; label: string; name: string }[] = [];

const mapApiNotification = (n: ApiNotification): NotificationItem => ({
  id: n.id,
  type: n.type,
  title: n.title,
  desc: n.desc,
  time: formatRelativeTime(n.created_at),
  read: n.read,
  section: isToday(n.created_at) ? 'Today' : 'Earlier',
});

const placeMatchesHeading = (
  place: { id?: string | null; name?: string | null } | undefined,
  heading: CampusPlace | null
) => {
  if (!place || !heading) return false;

  const placeId = (place.id ?? '').trim().toLowerCase();
  const placeName = (place.name ?? '').trim().toLowerCase();
  const headingId = (heading.id ?? '').trim().toLowerCase();
  const headingName = (heading.name ?? '').trim().toLowerCase();

  if (headingId && placeId && (placeId === headingId || placeId.includes(headingId) || headingId.includes(placeId))) {
    return true;
  }
  if (!placeName || !headingName) return false;
  if (placeName === headingName || placeName.includes(headingName) || headingName.includes(placeName)) {
    return true;
  }

  return headingName.split(' ').filter((word) => word.length >= 3).some((word) => placeName.includes(word));
};

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
  const [routeSetupOpen, setRouteSetupOpen] = useState(false);
  const [runnerHeading, setRunnerHeading] = useState<CampusPlace | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Notifications: real data from the API; badge count follows the home poll's unread
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadNotesCount = unreadCount;

  // Drain any notifications that arrived (via Ably → _layout) while the user
  // was away from the home screen (e.g. on the runner-shopping / payout screen).
  const drainPendingNotifications = useNotificationsStore((s) => s.drain);
  useEffect(() => {
    const pending = drainPendingNotifications();
    if (pending.length === 0) return;
    const mapped = pending.map(mapApiNotification);
    setNotifications((prev) => {
      const existing = new Set(prev.map((n) => n.id));
      const fresh = mapped.filter((n) => !existing.has(n.id));
      if (fresh.length === 0) return prev;
      return [...fresh, ...prev];
    });
    setUnreadCount((prev) => prev + mapped.filter((n) => !n.read).length);
  }, []); // run once on mount to pick up anything queued while away

  // Custom Saved Places persisted per user
  const [customPlaces, setCustomPlaces] = useState<{ id: string; label: string; name: string }[]>([]);
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);
  const prevActiveTaskStatusRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `@waydrop_saved_places_${me?.id ?? 'guest'}`;
    plain.getItem(key).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setCustomPlaces(parsed);
          }
        } catch {}
      }
    }).catch(() => {});
  }, [me?.id]);

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

  const fetchHomeRef = useRef<() => void>(() => {});

  // Real-time user channel: instantly updates when runner accepts errand or status progresses
  useAblyUser(me?.id, (eventName, payload) => {
    if (eventName === 'task.accepted' || eventName === 'task.updated') {
      fetchHomeRef.current();
      if (eventName === 'task.accepted') {
        success();
        const runner = payload?.runner?.first_name || payload?.runner_first_name || 'A runner';
        toast.show(`🎉 ${runner} accepted your errand! Tap the card above to track.`);
        fetchNotifications();
      }
    } else if (eventName === 'notification.created' && payload?.notification?.id) {
      const incoming = mapApiNotification(payload.notification as ApiNotification);
      setNotifications((prev) => {
        if (prev.some((item) => item.id === incoming.id)) return prev;
        return [incoming, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
    }
  });

  const runnerHeadingRef = useRef<CampusPlace | null>(null);
  runnerHeadingRef.current = runnerHeading;

  // Real-time campus open errands stream (task.created, task.bounty_raised, task.taken, task.cancelled)
  useAblyErrands(targetSiteId, (eventName, payload) => {
    if (mode !== 'earn') return;

    if (eventName === 'task.created') {
      if (!payload || !payload.id) return;
      if (payload.requester_id && payload.requester_id === me?.id) return;

      const heading = runnerHeadingRef.current;
      const isOnRoute = Boolean(heading)
        && (placeMatchesHeading(payload.pickup, heading) || placeMatchesHeading(payload.dropoff, heading));

      const newTask = {
        ...payload,
        on_route: isOnRoute,
      };

      setAvailableTasks((prev) => {
        if (prev.some((t) => t.id === newTask.id)) return prev;
        const nextList = [newTask, ...prev];
        return nextList.sort((a, b) => (b.on_route ? 1 : 0) - (a.on_route ? 1 : 0));
      });

      success();
      if (isOnRoute && heading) {
        toast.show(`🏃 Errand on your route! ${payload.item} → ${payload.dropoff?.name}`);
      } else {
        toast.show(`📦 New campus errand: ${payload.item} (${naira(payload.bounty)})`);
      }
    } else if (eventName === 'task.taken' || eventName === 'task.cancelled') {
      if (payload?.id) {
        setAvailableTasks((prev) => prev.filter((t) => t.id !== payload.id));
      }
    } else if (eventName === 'task.bounty_raised') {
      if (payload?.id && payload?.bounty) {
        setAvailableTasks((prev) =>
          prev.map((t) => (t.id === payload.id ? { ...t, bounty: payload.bounty } : t))
        );
      }
    }
  });

  const fetchAvailableErrands = useCallback((heading?: CampusPlace | null) => {
    const curH = heading !== undefined ? heading : runnerHeadingRef.current;
    return api.listAvailableTasks(targetSiteId, curH?.name, curH?.id)
      .then((av) => {
        if (av.tasks) setAvailableTasks(av.tasks);
        return av;
      })
      .catch(() => null);
  }, [targetSiteId]);

  // Sync latest user profile and active area from backend
  useEffect(() => {
    api.getMe()
      .then((freshMe) => {
        if (freshMe) {
          setSession({ me: freshMe, ...(freshMe.area ? { area: freshMe.area } : {}) });
        }
      })
      .catch(() => {});
    fetchNotifications();
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

  // Prevent unhandled GO_BACK action on Android when at root Home screen
  useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => true;
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
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
    let homeRequestInFlight = false;
    let availableRequestInFlight = false;
    const fetchHome = () => {
      if (!alive || homeRequestInFlight) return;
      homeRequestInFlight = true;
      api.home(targetSiteId, mode)
        .then((res) => {
          if (!alive) return;
          failCount = 0;
          setData(res);
          setUnreadCount(res.unread ?? 0);

          // Notify user if pending errand was accepted by a runner
          const isAcceptedNow = ['accepted', 'shopping', 'bought', 'in_transit', 'picked_up', 'arrived'].includes(res.active_task?.status ?? '');
          if (prevActiveTaskStatusRef.current === 'pending' && isAcceptedNow && res.active_task) {
            success();
            const runner = res.active_task.runner_first_name || 'A runner';
            toast.show(`🎉 ${runner} accepted your errand! Tap the card above to track.`);
            fetchNotifications();
          }
          prevActiveTaskStatusRef.current = res.active_task?.status ?? null;
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
                first_name: curMe?.first_name ?? null,
                last_name: curMe?.last_name ?? null,
                photo_url: curMe?.photo_url ?? null,
                area_id: curMe?.area_id ?? res.area?.id ?? 'buk-new',
                area: curMe?.area ?? res.area,
                rating: ratingVal,
                trips_count: trips,
                runner_status: runnerStatus,
                referral_code: res.profile?.referral_code ?? curMe?.referral_code,
                wallet: res.wallet ?? curMe?.wallet,
              },
            });
          }
          if (mode === 'earn') {
            const curH = runnerHeadingRef.current;
            if (!availableRequestInFlight) {
              availableRequestInFlight = true;
              api.listAvailableTasks(targetSiteId, curH?.name, curH?.id)
                .then((av) => {
                  if (alive && av.tasks) setAvailableTasks(av.tasks);
                })
                .catch(() => {})
                .finally(() => {
                  availableRequestInFlight = false;
                });
            }
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
        })
        .finally(() => {
          homeRequestInFlight = false;
        });
    };

    fetchHomeRef.current = fetchHome;
    fetchHome();
    const interval = setInterval(fetchHome, 5000);
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
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const hello = me?.first_name ? `${greeting}, ${me.first_name}` : greeting;

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
    const nextPlaces = [...customPlaces, item];
    setCustomPlaces(nextPlaces);
    const key = `@waydrop_saved_places_${me?.id ?? 'guest'}`;
    plain.setItem(key, JSON.stringify(nextPlaces)).catch(() => {});
    toast.show(`Added ${newPlace.label} to saved places!`);
  };

  const fetchNotifications = () => {
    api
      .listNotifications()
      .then((res) => {
        setNotifications(res.items.map(mapApiNotification));
        setUnreadCount(res.unread_count);
      })
      .catch(() => {});
  };

  const handlePressNotification = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    api
      .markNotificationRead(id)
      .then((res) => setUnreadCount(res.unread_count))
      .catch(() => {});
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    api
      .markAllNotificationsRead()
      .then((res) => setUnreadCount(res.unread_count))
      .catch(() => {});
    toast.show('All notifications marked as read');
  };

  // Keep the push token fresh so real pushes reach this device
  useEffect(() => {
    if (!me?.id) return;
    requestAndRegisterPushToken((token, platform, locale) =>
      api.registerDevice(token, platform, locale)
    ).catch(() => {});
  }, [me?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <StatusBar style="dark" />
      <CampusMap
        ref={map}
        center={mapCenter}
        you={you}
        runners={data?.runners ?? []}
        busy={data?.busy_spots ?? []}
        places={data?.places ?? []}
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
            fetchNotifications();
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
                onPress={() => {
                  if (Platform.OS === 'web') {
                    if (typeof navigator !== 'undefined' && navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        () => toast.show('Location access granted!'),
                        () => toast.show('Please allow location in your browser address bar / site settings.')
                      );
                    } else {
                      toast.show('Please allow location in your browser site settings.');
                    }
                  } else if (typeof Linking.openSettings === 'function') {
                    Linking.openSettings().catch(() => {});
                  }
                }}
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
                {data ? (mode === 'earn' ? `${data.busy_spots.reduce((a, b) => a + b.count, 0)} errands waiting` : `${data.runners_nearby} runners walking nearby`) : 'Loading live radar…'}
              </Text>
            </View>
          )}
        </View>

        <PressableScale
          style={[st.wallet, shadow[2]]}
          accessibilityLabel={`Wallet balance ${data ? naira(data.balance) : naira(me?.wallet?.balance_kobo ?? 0)}`}
          onPress={() => {
            tap();
            setMenuOpen(true);
          }}
        >
          <Wallet size={18} weight="duotone" color={color.midnight} />
          <Text variant="label" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontVariant: ['tabular-nums'] }}>
            {data ? naira(data.balance) : naira(me?.wallet?.balance_kobo ?? 0)}
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
                <Text variant="body" tone="ink4" style={{ flex: 1 }}>Describe what you need moved…</Text>
              </PressableScale>

              {/* Active Errand Live Tracking Card - only rendered when the user has an active task */}
              {!!data?.active_task && (
                <PressableScale
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: data.active_task.status === 'pending' ? 'rgba(255, 85, 0, 0.08)' : color.mintSoft,
                    borderWidth: 1.5,
                    borderColor: data.active_task.status === 'pending' ? 'rgba(255, 85, 0, 0.3)' : '#A7F3D0',
                    borderRadius: radius.md,
                    padding: space[3],
                    marginTop: space[3],
                  }}
                  onPress={() => {
                    tap();
                    if (data.active_task!.status === 'pending') {
                      router.push(`/finding?id=${data.active_task!.id}`);
                    } else {
                      const isBuy = (data.active_task as any)?.is_buy || (data.active_task as any)?.type === 'buy';
                      const route = isBuy ? `/buy-tracking?id=${data.active_task!.id}` : `/track?id=${data.active_task!.id}`;
                      router.push(route);
                    }
                  }}
                  accessibilityLabel={`Active errand: ${data.active_task.item}, ${data.active_task.from} to ${data.active_task.to}`}
                >
                  <Package size={22} weight="duotone" color={data.active_task.status === 'pending' ? color.tangerine : color.mintInk} />
                  <View style={{ flex: 1, marginLeft: space[2] }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text variant="label" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                        {data.active_task.status === 'pending' ? 'Searching for runner' : 'Active Errand'} · {data.active_task.from} → {data.active_task.to}
                      </Text>
                      <View style={{ backgroundColor: data.active_task.status === 'pending' ? color.tangerine : '#10B981', width: 6, height: 6, borderRadius: 3 }} />
                    </View>
                    <Text variant="caption" tone="ink2">
                      {data.active_task.item} · {data.active_task.status_text}
                    </Text>
                  </View>
                  <ArrowRight size={16} weight="bold" color={data.active_task.status === 'pending' ? color.tangerine : color.mintInk} />
                </PressableScale>
              )}

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
                            <MapPinIcon size={20} color={color.tangerine} />
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
              <View style={st.ask}>
                <PressableScale
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[3] }}
                  onPress={() => {
                    tap();
                    setRouteSetupOpen(true);
                  }}
                  accessibilityLabel="Where are you heading"
                >
                  <NavigationArrow size={22} weight="duotone" color={color.tangerine} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    {runnerHeading ? (
                      <View style={{ marginRight: space[2] }}>
                        <Text variant="caption" tone="tangerine" style={{ fontFamily: 'DMSans_700Bold' }}>
                          Walking towards
                        </Text>
                        <Text variant="body" tone="midnight" style={{ fontFamily: 'DMSans_700Bold' }} numberOfLines={1}>
                          {runnerHeading.name}
                        </Text>
                      </View>
                    ) : (
                      <Text variant="body" tone="ink4">
                        Search a building, hostel or gate
                      </Text>
                    )}
                  </View>
                </PressableScale>
                {runnerHeading && (
                  <PressableScale
                    onPress={() => {
                      tap();
                      setRunnerHeading(null);
                      runnerHeadingRef.current = null;
                      fetchAvailableErrands(null);
                      toast.show('Destination cleared');
                    }}
                    style={{ padding: 4 }}
                    accessibilityLabel="Clear destination"
                  >
                    <X size={18} weight="bold" color={color.ink3} />
                  </PressableScale>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[4] }}>
                <Stat label="Today" value={data ? naira(data.earn.today) : '₦0'} money />
                <Stat label="This week" value={data ? naira(data.earn.week) : '₦0'} sub={data ? `${data.earn.week_errands} errands, ${data.earn.rating} rating` : '0 errands'} />
              </View>
              <View style={st.note}>
                <Lightning size={20} weight="duotone" color={color.tangerine} />
                <Text variant="label" tone="ink2" style={{ flex: 1 }}>Set where you're going. Errands on your way pop up by themselves.</Text>
              </View>

              {/* Active runner task */}
              {data?.active_task && !data.active_task.is_requester && (
                <PressableScale
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: color.mintSoft,
                    borderWidth: 1.5,
                    borderColor: '#A7F3D0',
                    borderRadius: radius.md,
                    padding: space[3],
                    marginTop: space[3],
                  }}
                  onPress={() => {
                    tap();
                    router.push(`/runner-shopping?id=${data.active_task!.id}`);
                  }}
                  accessibilityLabel={`Active runner errand: ${data.active_task.item}`}
                >
                  <Package size={22} weight="duotone" color={color.mintInk} />
                  <View style={{ flex: 1, marginLeft: space[2] }}>
                    <Text variant="label" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                      Active Errand · {data.active_task.from} → {data.active_task.to}
                    </Text>
                    <Text variant="caption" tone="ink2">
                      {data.active_task.item} · {data.active_task.status_text}
                    </Text>
                  </View>
                  <ArrowRight size={16} weight="bold" color={color.mintInk} />
                </PressableScale>
              )}

              {/* Live available errand feed remains visible while a runner task is active */}
              {(() => {
                const onRouteTasks = availableTasks.filter((t) => t.on_route);
                const otherTasks = runnerHeading ? availableTasks.filter((t) => !t.on_route) : availableTasks;

                return (
                  <View style={{ marginTop: space[4], gap: space[3] }}>
                    {/* If heading is set, show On-Route section */}
                    {runnerHeading && onRouteTasks.length > 0 && (
                      <View style={{ gap: space[2] }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <NavigationArrow size={16} weight="fill" color={color.mintInk} />
                            <Text variant="label" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                              On your way to {runnerHeading.name} ({onRouteTasks.length})
                            </Text>
                          </View>
                          <Text variant="caption" tone="mintInk" style={{ fontFamily: 'DMSans_700Bold' }}>
                            Route Match
                          </Text>
                        </View>
                        {onRouteTasks.map((t) => (
                          <PressableScale
                            key={t.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: color.mintSoft,
                              borderWidth: 1.5,
                              borderColor: '#A7F3D0',
                              borderRadius: radius.md,
                              padding: space[3],
                              gap: space[3],
                            }}
                            onPress={() => {
                              tap();
                              router.push(`/runner-shopping?id=${t.id}`);
                            }}
                            accessibilityLabel={`Errand on your route: ${t.item}, earn ${naira(t.bounty)}`}
                          >
                            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                              <ShoppingCart size={20} weight="duotone" color={color.mintInk} />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text variant="label" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }} numberOfLines={1}>
                                  {t.item}
                                </Text>
                                <Text variant="label" tone="mintInk" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>
                                  {naira(t.bounty)}
                                </Text>
                              </View>
                              <Text variant="caption" tone="ink2" numberOfLines={1}>
                                {t.pickup?.name || 'Campus shop'} → {t.dropoff?.name || runnerHeading.name}
                              </Text>
                            </View>
                            <ArrowRight size={16} weight="bold" color={color.mintInk} />
                          </PressableScale>
                        ))}
                      </View>
                    )}

                    {/* If heading is set but no matching tasks on route yet, show active radar listening card */}
                    {runnerHeading && onRouteTasks.length === 0 && (
                      <View
                        style={{
                          padding: space[4],
                          backgroundColor: '#F8FAFC',
                          borderWidth: 1.5,
                          borderStyle: 'dashed',
                          borderColor: '#CBD5E1',
                          borderRadius: radius.md,
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                          <NavigationArrow size={20} weight="duotone" color={color.tangerine} />
                        </View>
                        <Text variant="label" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight, textAlign: 'center' }}>
                          Radar watching route to {runnerHeading.name}
                        </Text>
                        <Text variant="caption" tone="ink3" style={{ textAlign: 'center', maxWidth: 260 }}>
                          Listening for errands heading towards {runnerHeading.name} in real time…
                        </Text>
                      </View>
                    )}

                    {/* Other campus errands */}
                    {otherTasks.length > 0 && (
                      <View style={{ gap: space[2], marginTop: runnerHeading ? space[2] : 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <Text variant="label" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                            {runnerHeading ? `Other campus errands (${otherTasks.length})` : `Errands waiting on campus (${otherTasks.length})`}
                          </Text>
                          <Text variant="caption" tone="tangerine" style={{ fontFamily: 'DMSans_700Bold' }}>
                            Tap to accept
                          </Text>
                        </View>
                        {otherTasks.map((t) => (
                          <PressableScale
                            key={t.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: color.tangerineSoft,
                              borderWidth: 1.5,
                              borderColor: color.tangerineEdge,
                              borderRadius: radius.md,
                              padding: space[3],
                              gap: space[3],
                            }}
                            onPress={() => {
                              tap();
                              router.push(`/runner-shopping?id=${t.id}`);
                            }}
                            accessibilityLabel={`Errand: ${t.item}, earn ${naira(t.bounty)}`}
                          >
                            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                              <ShoppingCart size={20} weight="duotone" color={color.tangerine} />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text variant="label" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }} numberOfLines={1}>
                                  {t.item}
                                </Text>
                                <Text variant="label" tone="tangerine" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>
                                  {naira(t.bounty)}
                                </Text>
                              </View>
                              <Text variant="caption" tone="ink2" numberOfLines={1}>
                                {t.pickup?.name || 'Campus shop'} → {t.dropoff?.name || 'Campus hostel'}
                              </Text>
                            </View>
                            <ArrowRight size={16} weight="bold" color={color.tangerine} />
                          </PressableScale>
                        ))}
                      </View>
                    )}

                    {/* When no errands exist at all on campus */}
                    {!runnerHeading && availableTasks.length === 0 && (
                      <View
                        style={{
                          padding: space[4],
                          backgroundColor: '#F8FAFC',
                          borderWidth: 1.5,
                          borderStyle: 'dashed',
                          borderColor: '#CBD5E1',
                          borderRadius: radius.md,
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                          <PersonSimpleWalk size={20} weight="duotone" color={color.midnight} />
                        </View>
                        <Text variant="label" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight, textAlign: 'center' }}>
                          Campus radar active & listening
                        </Text>
                        <Text variant="caption" tone="ink3" style={{ textAlign: 'center', maxWidth: 260 }}>
                          Keep walking. New errands requested around campus will pop up here in real time.
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}
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
        balance={data?.balance ?? me?.wallet?.balance_kobo ?? 0}
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

      {/* Runner Route / Destination Setup Modal */}
      <RouteSetupModal
        open={routeSetupOpen}
        onClose={() => setRouteSetupOpen(false)}
        siteId={targetSiteId}
        onSelectDestination={(place) => {
          setRunnerHeading(place);
          runnerHeadingRef.current = place;
          fetchAvailableErrands(place);
          toast.show(`Route set: Searching errands to ${place.name}…`);
        }}
        currentDestination={runnerHeading}
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

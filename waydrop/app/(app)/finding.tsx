import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  ArrowLeft,
  Eye,
  LockSimple,
  Star,
} from 'phosphor-react-native';
import { Blob } from '@/components/art/Brand';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError, type Task } from '@/api';
import { useAblyTask } from '@/lib/ably';
import { error as hapticError, success as hapticSuccess, tap } from '@/lib/haptics';
import { useDraft } from '@/store/errand';
import { color, radius, shadow, space } from '@/theme/tokens';

const naira = (kobo: number) => '₦' + Math.round(kobo / 100).toLocaleString('en-NG');

export default function FindingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const resetDraft = useDraft((s) => s.reset);
  const toast = useToast();

  const [task, setTask] = useState<Task | null>(null);
  const [secs, setSecs] = useState(0);
  const [askCancelOpen, setAskCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedEvents, setFeedEvents] = useState<{ id: string; icon: ReactNode; text: string }[]>([]);
  const t0 = useRef(Date.now());
  const isCancelledRef = useRef(false);

  const addViewerEvent = (viewerName?: string | null) => {
    if (!viewerName) return;

    setFeedEvents((prev) => {
      const event = {
        id: 'viewing',
        icon: <Eye size={18} weight="duotone" color={color.mintInk} />,
        text: `${viewerName} is viewing your errand`,
      };

      if (prev.some((item) => item.id === event.id)) {
        return prev.map((item) => (item.id === event.id ? event : item));
      }

      return [...prev, event];
    });
  };

  // Real-time Ably WebSocket integration for instant acceptance & viewer updates
  useAblyTask(id, (eventName, data) => {
    if (isCancelledRef.current) return;

    if (eventName === 'task.accepted' || eventName === 'task.updated') {
      if (data && data.status) {
        setTask((prev) => {
          const wasPending = !prev || prev.status === 'pending';
          const isMatchedNow = Boolean(data.runner) && ['accepted', 'shopping', 'bought', 'in_transit', 'picked_up', 'arrived'].includes(data.status);
          if (wasPending && isMatchedNow) {
            hapticSuccess();
            const runnerName = data.runner?.first_name || 'A runner';
            toast.show(`🎉 ${runnerName} accepted your errand!`);
          }
          return { ...(prev ?? {}), ...data };
        });
      }
    } else if (eventName === 'task.viewing') {
      addViewerEvent(data?.viewing_runner);
    } else if (eventName === 'task.cancelled') {
      isCancelledRef.current = true;
      resetDraft();
      toast.show('Errand cancelled.');
      router.replace('/home');
    }
  });

  // Polling / search feed simulator
  useEffect(() => {
    let alive = true;
    let requestInFlight = false;
    const tick = async () => {
      if (isCancelledRef.current || !alive || requestInFlight) return;
      requestInFlight = true;
      try {
        const next = await api.getTask(id);
        if (!alive || isCancelledRef.current) return;

        // If the task was cancelled, navigate back home immediately
        if (next.status === 'cancelled') {
          alive = false;
          isCancelledRef.current = true;
          resetDraft();
          toast.show('Errand cancelled.');
          router.replace('/home');
          return;
        }

        addViewerEvent(next.search?.viewing_runner);

        setTask((prev) => {
          const wasPending = !prev || prev.status === 'pending';
          const isMatchedNow = Boolean(next.runner) && ['accepted', 'shopping', 'bought', 'in_transit', 'picked_up', 'arrived'].includes(next.status);
          if (wasPending && isMatchedNow) {
            hapticSuccess();
            const runnerName = next.runner?.first_name || 'A runner';
            toast.show(`🎉 ${runnerName} accepted your errand!`);
          }
          return next;
        });
      } catch (err) {
      } finally {
        requestInFlight = false;
      }
    };

    tick();
    const intervalPoll = setInterval(tick, 5000);
    const intervalSecs = setInterval(() => {
      setSecs(Math.floor((Date.now() - t0.current) / 1000));
    }, 500);

    return () => {
      alive = false;
      clearInterval(intervalPoll);
      clearInterval(intervalSecs);
    };
  }, [id]);

  // Back to map without cancelling the errand
  const handleBack = () => {
    tap();
    toast.show("Errand is still searching. We'll notify you when a runner accepts.");
    setTimeout(() => {
      router.replace('/home');
    }, 250);
  };

  // Cancel errand
  const handleCancel = async () => {
    if (busy) return;

    setBusy(true);
    tap();
    try {
      await api.cancelTask(id);
      isCancelledRef.current = true;
      setAskCancelOpen(false);
      resetDraft();
      toast.show(`Errand cancelled. ${naira(task?.bounty ?? 0)} is back in your wallet.`);
      setTimeout(() => {
        router.replace('/home');
      }, 300);
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'ALREADY_CANCELLED' || e.status === 200)) {
        isCancelledRef.current = true;
        setAskCancelOpen(false);
        resetDraft();
        toast.show('Errand cancelled.');
        router.replace('/home');
        return;
      }
      isCancelledRef.current = false;
      hapticError();
      toast.show(e instanceof ApiError ? e.message : 'Could not cancel errand. Try again.');
      setAskCancelOpen(false);
    } finally {
      setBusy(false);
    }
  };

  // Raise offer
  const handleRaise = async (raiseKobo: number) => {
    setBusy(true);
    tap();
    try {
      const updated = await api.raiseBounty(id, raiseKobo);
      t0.current = Date.now();
      setSecs(0);
      setFeedEvents([]);
      setTask(updated);
      toast.show(`Offer raised to ${naira(raiseKobo)}`);
    } catch (e) {
      hapticError();
      toast.show(e instanceof ApiError ? e.message : 'Could not raise the offer.');
    } finally {
      setBusy(false);
    }
  };

  const matchedNow = Boolean(task?.runner) && ['accepted', 'shopping', 'bought', 'in_transit', 'picked_up', 'arrived'].includes(task?.status ?? '');
  const isBuyTask = task?.type === 'buy' || (task?.budget_kobo ?? 0) > 0;

  useEffect(() => {
    if (!task || !matchedNow || !isBuyTask) return;

    const timer = setTimeout(() => {
      resetDraft();
      router.replace({ pathname: '/buy-tracking', params: { id: task.id } });
    }, 1500);

    return () => clearTimeout(timer);
  }, [task?.id, matchedNow, isBuyTask, resetDraft]);

  if (!task) {
    return (
      <View style={[s.root, s.centerBox, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Radar size={160} />
      </View>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     RUNNER MATCHED STATE
  ───────────────────────────────────────────────────────────── */
  const isMatched = task && Boolean(task.runner) && ['accepted', 'shopping', 'bought', 'in_transit', 'picked_up', 'arrived'].includes(task.status);
  if (isMatched && task.runner) {
    return (
      <View style={[s.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, paddingHorizontal: 20 }]}>
        {toast.node}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text variant="caption" tone="mintInk" style={{ fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Runner found
          </Text>
          <Text variant="h1" style={{ marginTop: 2, fontSize: 28, lineHeight: 34 }}>
            {task.runner.first_name} accepted your errand!
          </Text>

          {/* Runner Row Card */}
          <View style={[s.runnerCard, shadow[1]]}>
            <View style={s.runnerAva}>
              <Text variant="h3" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.midnight }}>
                {task.runner.first_name[0]}
                {task.runner.first_name[1] ?? 'A'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h3" style={{ fontSize: 17 }}>
                {task.runner.name || `${task.runner.first_name} ${task.runner.last_name || ''}`.trim()}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Star size={14} weight="fill" color={color.butter} />
                <Text variant="caption" tone="ink2">
                  {task.runner.rating} rating, {task.runner.trips} deliveries
                </Text>
              </View>
            </View>
            <Text variant="label" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.ink2 }}>
              {task.runner.eta_s != null ? `${Math.max(2, Math.round(task.runner.eta_s / 60))} min` : 'ETA updating'}
            </Text>
          </View>

          {/* Handshake PIN Card */}
          <View style={s.pinCard}>
            <Text variant="caption" tone="ink3" style={{ fontWeight: '500' }}>
              Your handshake PIN
            </Text>
            <View style={s.pinBoxesRow}>
              {task.pin.split('').map((char, i) => (
                <View key={i} style={s.pinDigitBox}>
                  <Text variant="number" tone="mintInk" style={{ fontSize: 28 }}>
                    {char}
                  </Text>
                </View>
              ))}
            </View>
            <Text variant="caption" tone="ink2" style={{ marginTop: space[2], lineHeight: 18 }}>
              Read it to {task.runner.first_name} only when the {task.item.toLowerCase()} is in your hands.
            </Text>
          </View>
        </View>

        <View style={{ gap: space[2] }}>
          <Button
            label="Track Live Delivery →"
            onPress={() => {
              tap();
              resetDraft();
              const targetRoute = task.type === 'buy' ? '/buy-tracking' : '/track';
              router.replace({ pathname: targetRoute, params: { id: task.id } });
            }}
          />
          <Button
            label="Back to the map"
            variant="ghost"
            onPress={() => {
              tap();
              resetDraft();
              router.replace('/home');
            }}
          />
        </View>
      </View>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     NO RUNNER YET (LOW OFFER) STATE
  ───────────────────────────────────────────────────────────── */
  const isNoMatch = task.status === 'pending' && task.search?.no_match;
  const raiseTargetKobo = Math.max(task.suggested_min, task.bounty + 10000);

  if (isNoMatch) {
    return (
      <View style={[s.root, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20, paddingHorizontal: 20 }]}>
        {toast.node}

        {/* Top Bar with Back Icon */}
        <View style={s.topBar}>
          <PressableScale
            onPress={handleBack}
            style={s.backBtn}
            accessibilityLabel="Back to map"
            accessibilityHint="Leaves errand searching in background"
          >
            <ArrowLeft size={20} weight="bold" color={color.midnight} />
          </PressableScale>
          <View style={s.topBarStatus}>
            <View style={s.radarPingDot} />
            <Text variant="caption" tone="ink2" style={{ fontFamily: 'DMSans_600SemiBold' }}>
              Errand Active
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Blob size={104} />
          <Text variant="h1" align="center" style={{ marginTop: space[4], fontSize: 26, lineHeight: 32 }}>
            No one's heading that way yet
          </Text>
          <Text variant="body" tone="ink2" align="center" style={{ marginTop: space[2], maxWidth: 300, lineHeight: 22 }}>
            It's quiet near {task.pickup.name} right now. Errands like this usually go for {naira(task.suggested_min)} or more.
          </Text>
        </View>

        <View style={{ gap: space[2] }}>
          <Button
            label={`Raise to ${naira(raiseTargetKobo)} and keep looking`}
            onPress={() => handleRaise(raiseTargetKobo)}
            loading={busy}
          />
          <Button
            label={`Keep waiting at ${naira(task.bounty)}`}
            variant="secondary"
            onPress={handleBack}
          />
          <Button
            label={`Cancel and get ${naira(task.bounty)} back`}
            variant="ghost"
            onPress={() => {
              tap();
              setAskCancelOpen(true);
            }}
          />
        </View>

        {/* Cancel Confirmation Overlay Sheet */}
        <CancelModal
          visible={askCancelOpen}
          bounty={task.bounty}
          busy={busy}
          onClose={() => setAskCancelOpen(false)}
          onConfirm={handleCancel}
        />
      </View>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     ACTIVE RADAR SEARCH PROGRESSION STATE
  ───────────────────────────────────────────────────────────── */
  return (
    <View style={[s.root, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20, paddingHorizontal: 20 }]}>
      {toast.node}

      {/* Top Bar with Back Icon */}
      <View style={s.topBar}>
        <PressableScale
          onPress={handleBack}
          style={s.backBtn}
          accessibilityLabel="Back to map"
          accessibilityHint="Leaves errand searching in background"
        >
          <ArrowLeft size={20} weight="bold" color={color.midnight} />
        </PressableScale>
        <View style={s.topBarStatus}>
          <View style={s.radarPingDot} />
          <Text variant="caption" tone="ink2" style={{ fontFamily: 'DMSans_600SemiBold' }}>
            Radar Active
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        {/* Radar & Timer Header */}
        <View style={s.searchHeadRow}>
          <View style={s.miniRadarWrap}>
            <MiniRadar />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="h2" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 22, lineHeight: 26 }}>
              Finding someone headed your way
            </Text>
            <Text variant="caption" tone="ink2" style={{ marginTop: 2 }}>
              Near {task.pickup.name}
            </Text>
          </View>
          <Text variant="number" style={s.clockText}>
            {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
          </Text>
        </View>

        {/* Live Feed Events */}
        <View style={s.feedBox}>
          {feedEvents.length > 0 ? feedEvents.map((evt) => (
            <Animated.View key={evt.id} entering={FadeInDown.duration(280)} style={s.feedItem}>
              {evt.icon}
              <Text variant="label" tone="ink2" style={{ flex: 1, fontSize: 14 }}>
                {evt.text}
              </Text>
            </Animated.View>
          )) : (
            <View style={s.feedItem}>
              <Eye size={18} weight="duotone" color={color.ink3} />
              <Text variant="label" tone="ink2" style={{ flex: 1, fontSize: 14 }}>
                Waiting for a runner to view your errand
              </Text>
            </View>
          )}
        </View>

        {/* Money Held Safely Banner */}
        <View style={s.heldBanner}>
          <LockSimple size={20} weight="duotone" color={color.mintInk} />
          <Text variant="label" tone="ink2" style={{ flex: 1, fontSize: 13, lineHeight: 18 }}>
            <Text variant="label" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
              {naira(task.bounty)} is held safely.
            </Text>{' '}
            Cancel for free until someone accepts.
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={{ gap: space[2] }}>
        <Button
          label="Cancel errand"
          variant="secondary"
          onPress={() => {
            tap();
            setAskCancelOpen(true);
          }}
        />
      </View>

      {/* Cancel Confirmation Overlay Sheet */}
      <CancelModal
        visible={askCancelOpen}
        bounty={task.bounty}
        busy={busy}
        onClose={() => setAskCancelOpen(false)}
        onConfirm={handleCancel}
      />
    </View>
  );
}

function CancelModal({
  visible,
  bounty,
  busy,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  bounty: number;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <PressableScale style={StyleSheet.absoluteFill} haptic={false} onPress={onClose} />
        <Animated.View entering={FadeInDown.duration(200)} style={[s.modalCard, shadow[2]]}>
          <Text variant="h2" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 24 }}>
            Cancel this errand?
          </Text>
          <Text variant="body" tone="ink2" style={{ marginTop: space[2], lineHeight: 22 }}>
            Nobody has accepted yet, so it's free. {naira(bounty)} goes straight back to your wallet.
          </Text>
          <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[5] }}>
            <Button label="Keep looking" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
            <Button
              label="Cancel errand"
              variant="danger"
              onPress={onConfirm}
              loading={busy}
              style={{ flex: 1 }}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Mini radar with two pulsating rings and an orange dot */
function MiniRadar() {
  const reduce = useReducedMotion();
  const ring1 = useSharedValue(reduce ? 0.5 : 0);
  const ring2 = useSharedValue(reduce ? 0.5 : 0);

  useEffect(() => {
    if (!reduce) {
      ring1.value = withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
        -1
      );
      ring2.value = withDelay(
        900,
        withRepeat(
          withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
          -1
        )
      );
    }
  }, [reduce]);

  const style1 = useAnimatedStyle(() => ({
    transform: [{ scale: 0.3 + ring1.value * 1.5 }],
    opacity: 0.8 * (1 - ring1.value),
  }));

  const style2 = useAnimatedStyle(() => ({
    transform: [{ scale: 0.3 + ring2.value * 1.5 }],
    opacity: 0.8 * (1 - ring2.value),
  }));

  return (
    <View style={s.miniRadarBox} pointerEvents="none">
      <Animated.View style={[s.radarRing, style1]} />
      <Animated.View style={[s.radarRing, style2]} />
      <View style={s.radarDot} />
    </View>
  );
}

function Radar({ size = 160 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <MiniRadar />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper },
  centerBox: { alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 85, 0, 0.08)',
  },
  radarPingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.tangerine,
  },
  searchHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  miniRadarWrap: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniRadarBox: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radarRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: color.tangerine,
    backgroundColor: 'rgba(255,85,0,0.06)',
  },
  radarDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: color.tangerine,
  },
  clockText: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 16,
    color: color.ink3,
  },
  feedBox: {
    marginTop: space[5],
    gap: space[3],
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: space[5],
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: color.mintSoft,
  },
  runnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: space[4],
    padding: 16,
    borderRadius: 20,
    backgroundColor: color.card,
  },
  runnerAva: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: color.tangerineEdge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCard: {
    marginTop: space[4],
    padding: 16,
    borderRadius: 20,
    backgroundColor: color.card,
    ...shadow[1],
  },
  pinBoxesRow: {
    flexDirection: 'row',
    gap: space[2],
    marginTop: space[2],
  },
  pinDigitBox: {
    width: 48,
    height: 54,
    borderRadius: 12,
    backgroundColor: color.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: color.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 36,
  },
});

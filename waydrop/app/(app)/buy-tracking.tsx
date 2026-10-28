import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  ArrowLeft,
  ChatCircleDots,
  CheckCircle,
  Clock,
  CurrencyNgn,
  Eye,
  EyeSlash,
  Flashlight,
  Handshake,
  Lightning,
  Microphone,
  MicrophoneSlash,
  PaperPlaneRight,
  Phone,
  PhoneDisconnect,
  Receipt,
  ShieldCheck,
  SpeakerHigh,
  Star,
  X,
} from 'phosphor-react-native';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { api, type CallSessionInfo, type Task, type TaskMessage } from '@/api';
import { useSession } from '@/store/session';
import { AquafinaProp, PriceTagProp, ReceiptProp } from '@/components/art/BuyProps';
import { Coin } from '@/components/art/Brand';
import { useAblyTask } from '@/lib/ably';
import { naira } from '@/lib/buyCatalog';
import { tap, success as hapticSuccess, error as hapticError } from '@/lib/haptics';
import { useAgoraCall } from '@/lib/agoraCall';
import { color, radius, shadow, space } from '@/theme/tokens';
import { useCommunicationStore } from '@/store/communication';

type TrackingStage = 'shopping' | 'bought' | 'near' | 'completed';

const formatRunnerRating = (rating: unknown): string => {
  const numericRating = typeof rating === 'number' ? rating : Number(rating);
  return Number.isFinite(numericRating) ? numericRating.toFixed(1) : '—';
};

export default function BuyTrackingScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const sessionMe = useSession((s) => s.me);

  const [stage, setStage] = useState<TrackingStage>('shopping');
  const [task, setTask] = useState<Task | null>(null);
  const [spent, setSpent] = useState<number>(0);
  const [budget, setBudget] = useState<number>(2000);
  const [budgetExtra, setBudgetExtra] = useState<number>(0);

  // Handshake PIN state
  const [pinVisible, setPinVisible] = useState(false);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const unreadCount = useCommunicationStore((state) => (
    id ? state.unreadMessagesByTask[id] ?? 0 : 0
  ));
  const markMessagesRead = useCommunicationStore((state) => state.markMessagesRead);
  const incrementMessage = useCommunicationStore((state) => state.incrementMessage);
  const receiveCall = useCommunicationStore((state) => state.receiveCall);

  // Call state
  const [callOpen, setCallOpen] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callSession, setCallSession] = useState<CallSessionInfo | null>(null);
  const callIntervalRef = useRef<any>(null);
  const { status: agoraStatus, error: agoraError, setMuted: setAgoraMuted, setSpeaker: setAgoraSpeaker } = useAgoraCall({
    visible: callOpen,
    taskId: id,
    session: callSession,
    muted: isMuted,
    speaker: isSpeaker,
    onRemoteLeft: () => {
      if (callOpen) void handleEndCall();
    },
  });

  useEffect(() => {
    if (agoraError) toast.show(agoraError);
  }, [agoraError]);

  // Modals
  const [priceCheckOpen, setPriceCheckOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [receiptDetailOpen, setReceiptDetailOpen] = useState(false);
  const [beaconOpen, setBeaconOpen] = useState(false);
  const [countdown, setCountdown] = useState(120);

  // Breathing animation for Handshake PIN card on Arrival
  const breatheAnim = useSharedValue(1);
  useEffect(() => {
    if (stage === 'near') {
      breatheAnim.value = withRepeat(
        withSequence(
          withTiming(1.025, { duration: 900 }),
          withTiming(1, { duration: 900 })
        ),
        -1,
        true
      );
    } else {
      breatheAnim.value = 1;
    }
  }, [stage, breatheAnim]);

  const animatedBreatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breatheAnim.value }],
  }));

  // Protect Handshake PIN page: If current user is the runner, redirect to runner shopping screen
  useEffect(() => {
    const runnerId = task?.runner_id || task?.runner?.id;
    if (task && sessionMe && runnerId && runnerId === sessionMe.id) {
      router.replace(`/runner-shopping?id=${task.id}`);
    }
  }, [task, sessionMe]);

  // A pending buy errand belongs on the radar screen until a runner accepts it.
  useEffect(() => {
    if (task?.status === 'pending') {
      router.replace({ pathname: '/finding', params: { id: task.id } });
    }
  }, [task?.id, task?.status]);

  // Load chat messages
  useEffect(() => {
    if (!id) return;
    api.getTaskMessages(id).then((res) => {
      if (res && res.messages) {
        setMessages(res.messages);
      }
    }).catch(() => {});
  }, [id, chatOpen]);

  useEffect(() => {
    if (chatOpen && id) markMessagesRead(id);
  }, [chatOpen, id, unreadCount, markMessagesRead]);

  // Call timer effect
  useEffect(() => {
    if (callOpen && agoraStatus === 'connected') {
      setCallTimer(0);
      callIntervalRef.current = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (callIntervalRef.current) clearInterval(callIntervalRef.current);
      setCallTimer(0);
    }
    return () => {
      if (callIntervalRef.current) clearInterval(callIntervalRef.current);
    };
  }, [callOpen, agoraStatus]);

  const handleStartCall = async () => {
    tap();
    if (!id) return;

    try {
      const info = await api.callRunner(id);
      setCallSession(info);
      setCallOpen(true);
      toast.show(`Calling ${runnerFirstName}...`);
    } catch (error: any) {
      toast.show(error?.message || 'Calls are unavailable until the errand is accepted.');
    }
  };

  const handleEndCall = () => {
    tap();
    if (id && callSession?.call_session_id) {
      void api.endCall(id, callSession.call_session_id).catch(() => {});
    }
    setCallOpen(false);
    setCallSession(null);
    setCallTimer(0);
    if (callIntervalRef.current) clearInterval(callIntervalRef.current);
    toast.show('Call ended');
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const cleanText = text.replace(/[\s\-_.,*#:\/]/g, '');
    if (task?.pin && cleanText.includes(task.pin)) {
      hapticError();
      toast.show("Don't send your PIN in chat. Read it out in person.");
      return;
    }

    tap();
    setInputText('');
    const temporaryId = 'msg-' + Date.now();
    const tempMsg: TaskMessage = {
      id: temporaryId,
      task_id: id || '',
      sender_name: 'You',
      text,
      is_runner: false,
      created_at: Date.now(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    if (id) {
      try {
        const sent = await api.sendTaskMessage(id, text, 'You', false);
        setMessages((prev) => prev.map((message) => (message.id === temporaryId ? sent : message)));
      } catch (error: any) {
        setMessages((prev) => prev.filter((message) => message.id !== temporaryId));
        toast.show(error?.message || 'Message could not be sent.');
      }
    }
  };

  // Beacon pulse animation
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 700 }),
        withTiming(0.96, { duration: 700 })
      ),
      -1,
      true
    );
  }, [pulse]);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  // Fetch real task and sync status
  useEffect(() => {
    let alive = true;
    const fetchTask = () => {
      if (!id) return;
      api.getTask(id).then((t) => {
        if (alive && t) {
          setTask(t);
          if (t.budget_kobo) setBudget(Math.round(t.budget_kobo / 100));
          if (t.spent_kobo) setSpent(Math.round(t.spent_kobo / 100));
          if (t.status === 'completed') setStage('completed');
          else if (t.status === 'arrived') setStage('near');
          else if (t.status === 'bought' || t.status === 'in_transit') setStage('bought');
          else if (t.status === 'shopping') setStage('shopping');
          if (t.active_ask && !priceCheckOpen) {
            setPriceCheckOpen(true);
          }
        }
      }).catch(() => {});
    };

    fetchTask();
    const interval = setInterval(fetchTask, 2500);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [id, priceCheckOpen]);

  useAblyTask(id, (eventName, data) => {
    if (eventName === 'task.updated') {
      if (data) {
        setTask((prev) => ({ ...(prev || {}), ...data } as Task));
        if (data.budget_kobo) setBudget(Math.round(data.budget_kobo / 100));
        if (data.spent_kobo) setSpent(Math.round(data.spent_kobo / 100));
        if (data.status === 'completed') setStage('completed');
        else if (data.status === 'arrived') setStage('near');
        else if (data.status === 'bought' || data.status === 'in_transit') setStage('bought');
        else if (data.status === 'shopping') setStage('shopping');
        if (data.active_ask && !priceCheckOpen) {
          setPriceCheckOpen(true);
        }
      }
    } else if (eventName === 'beacon.toggled') {
      if (data?.beacon_active) {
        setBeaconOpen(true);
      } else {
        setBeaconOpen(false);
      }
    } else if (eventName === 'ask.created') {
      setPriceCheckOpen(true);
    } else if (eventName === 'task.message' && data) {
      const isIncoming = data.sender_id
        ? data.sender_id !== sessionMe?.id
        : !!data.is_runner;
      if (isIncoming && !chatOpen && id) incrementMessage(id, data.id);

      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    } else if (eventName === 'call.initiated' && data?.receiver_id === sessionMe?.id) {
      receiveCall(data);
    } else if (eventName === 'call.ended' && data?.task_id === id) {
      setCallOpen(false);
      setCallSession(null);
    }
  });

  // Countdown timer for Price Check modal
  useEffect(() => {
    let timer: any;
    if (priceCheckOpen) {
      timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [priceCheckOpen]);

  const runnerFirstName = task?.runner?.first_name || 'Runner';
  const runnerName = task?.runner ? (task.runner.name || task.runner.first_name) : 'Runner';
  const pickupName = task?.pickup?.name || 'Shop';
  const dropoffName = task?.dropoff?.name || 'Delivery spot';
  const itemsSummary = task?.item || task?.items?.map((i) => `${i.qty}× ${i.name}`).join(', ') || 'Items';
  const myFirstName = (sessionMe?.first_name || 'YOU').toUpperCase();

  const currentBudget = (task?.budget_kobo ? Math.round(task.budget_kobo / 100) : budget) + budgetExtra;
  const currentSpent = task?.spent_kobo ? Math.round(task.spent_kobo / 100) : spent;
  const availableBudget = Math.max(0, currentBudget - currentSpent);
  const askNewPriceKobo = task?.active_ask?.new_price_kobo;
  const askNewPrice = askNewPriceKobo != null ? Math.round(askNewPriceKobo / 100) : 0;
  const askShortNaira = Math.max(0, Math.round((task?.active_ask?.diff_kobo ?? 0) / 100));

  const handleApprovePrice = async () => {
    tap();
    setPriceCheckOpen(false);
    const ask = task?.active_ask;
    const diffNaira = askShortNaira;
    if (diffNaira > 0) setBudgetExtra((prev) => prev + diffNaira);
    if (id && ask?.id) {
      try {
        const res = await api.answerAsk(id, ask.id, 'approve');
        if (typeof res?.budget_kobo === 'number') {
          setTask((prev) => (prev ? { ...prev, budget_kobo: res.budget_kobo, active_ask: null } : prev));
        }
        setBudgetExtra(0);
        toast.show(
          diffNaira > 0
            ? `${naira(diffNaira)} added to budget. ${runnerFirstName} is buying now.`
            : `Price approved. No extra budget needed.`,
        );
      } catch {
        if (diffNaira > 0) setBudgetExtra((prev) => Math.max(0, prev - diffNaira));
        setPriceCheckOpen(true);
        toast.show('Could not approve the price. Try again.');
      }
      return;
    }
    toast.show(
      diffNaira > 0
        ? `${naira(diffNaira)} added to budget. ${runnerFirstName} is buying now.`
        : `Price approved. No extra budget needed.`,
    );
  };

  const handleBuyFewer = async () => {
    tap();
    setPriceCheckOpen(false);
    const ask = task?.active_ask;
    if (id && ask?.id) {
      try {
        await api.answerAsk(id, ask.id, 'fewer');
      } catch {}
    }
    toast.show(`${runnerFirstName} will adjust item quantity. Remaining budget stays with you.`);
  };

  const handleSkipItem = async () => {
    tap();
    setPriceCheckOpen(false);
    const ask = task?.active_ask;
    if (id && ask?.id) {
      try {
        await api.answerAsk(id, ask.id, 'skip');
      } catch {}
    }
    toast.show('Item skipped. Your full item budget comes back.');
  };

  const handleBeaconToggle = () => {
    tap();
    setBeaconOpen(true);
    if (id) api.toggleBeacon(id, true).catch(() => {});
  };

  const handleBeaconOff = () => {
    tap();
    setBeaconOpen(false);
    if (id) api.toggleBeacon(id, false).catch(() => {});
    hapticSuccess();
    toast.show(`Read ${runnerFirstName} your PIN once items are in your hands`);
  };

  const headerInfo = {
    shopping: {
      title: `${runnerFirstName} is shopping`,
      sub: `At ${pickupName}`,
    },
    bought: {
      title: `${runnerFirstName} bought everything`,
      sub: `On the way to ${dropoffName}`,
    },
    near: {
      title: `${runnerFirstName} is nearby`,
      sub: 'Look around, or light up your screen',
    },
    completed: {
      title: `Delivered to ${dropoffName}`,
      sub: `${itemsSummary}, brought by ${runnerName}`,
    },
  }[stage];

  const refundNaira = task?.refund_kobo ? Math.round(task.refund_kobo / 100) : Math.max(0, currentBudget - currentSpent);
  const bountyNaira = task?.bounty ? Math.round(task.bounty / 100) : 400;
  const spentPct = Math.min(100, Math.round((currentSpent / (currentBudget || 1)) * 100));

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {toast.node}

      {/* Top navigation header */}
      <View style={s.topNav}>
        <PressableScale
          style={s.backCircle}
          onPress={() => router.replace('/home')}
          accessibilityLabel="Back to map"
        >
          <ArrowLeft size={20} weight="bold" color={color.midnight} />
        </PressableScale>
        <Text variant="h3" style={{ flex: 1, marginLeft: space[3], fontFamily: 'BricolageGrotesque_800ExtraBold' }}>
          {stage === 'completed' ? 'Receipt & Delivery' : 'Live errand tracking'}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status & Progress Steps */}
        <View style={s.statusCard}>
          <Text variant="caption" tone="tangerine" style={{ fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>
            {stage === 'shopping' ? 'In progress' : stage === 'bought' ? 'On the way' : stage === 'near' ? 'Arriving' : 'Delivered'}
          </Text>
          <Text variant="h1" style={{ fontSize: 24, lineHeight: 29, marginTop: 4 }}>
            {headerInfo.title}
          </Text>
          <Text variant="body" tone="ink2" style={{ marginTop: 2 }}>
            {headerInfo.sub}
          </Text>

          {/* 3 Steps indicator */}
          <View style={s.stepsRow}>
            {['Shopping', 'Bought', 'Arrived'].map((stepName, idx) => {
              const active = idx <= (stage === 'shopping' ? 0 : stage === 'bought' ? 1 : 2);
              return (
                <View key={stepName} style={[s.stepChip, active && s.stepChipActive]}>
                  <View style={[s.stepDot, active && s.stepDotActive]} />
                  <Text
                    variant="caption"
                    style={[
                      { fontFamily: 'DMSans_600SemiBold', color: color.ink3 },
                      active && { color: color.midnight },
                    ]}
                  >
                    {stepName}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Live Budget Meter */}
        <View style={[s.card, { marginTop: space[3] }]}>
          <View style={s.budgetHeader}>
            <Text variant="caption" tone="ink3" style={{ fontWeight: '600' }}>
              Spent so far
            </Text>
            <Text variant="caption" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
              {naira(currentSpent)} of {naira(currentBudget)} budget
            </Text>
          </View>
          <View style={s.progressBarTrack}>
            <View style={[s.progressBarFill, { width: `${spentPct}%` }]} />
          </View>
        </View>

        {/* Bought details proof card (when bought) */}
        {stage !== 'shopping' && (
          <PressableScale
            style={[s.card, s.proofCard]}
            onPress={() => setReceiptDetailOpen(true)}
          >
            <ReceiptProp size={54} />
            <View style={{ flex: 1, marginLeft: space[3] }}>
              <Text variant="body" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                Spent {naira(currentSpent)} of {naira(currentBudget)}
              </Text>
              <Text variant="caption" tone="ink2" style={{ marginTop: 2, lineHeight: 18 }}>
                Paid to {task?.vendor_payment?.account_name || 'seller'} by {task?.vendor_payment ? 'transfer' : 'cash'}.{' '}
                {refundNaira > 0 && (
                  <Text variant="caption" style={{ fontFamily: 'DMSans_700Bold', color: color.mintInk }}>
                    {naira(refundNaira)} already back in your wallet.
                  </Text>
                )}
              </Text>
            </View>
          </PressableScale>
        )}

        {/* Proximity / Screen Beacon Trigger */}
        {(stage === 'near' || stage === 'bought') && (
          <View style={[s.card, s.beaconCard]}>
            <Text variant="h3" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.midnight }}>
              Help {runnerFirstName} spot you
            </Text>
            <Text variant="caption" tone="ink2" style={{ marginTop: 2, lineHeight: 18 }}>
              In dense crowds or campus spaces, lighting up your screen gives the runner an instant visual marker.
            </Text>
            <View style={{ marginTop: space[3] }}>
              <Button
                label="Light up my screen"
                onPress={handleBeaconToggle}
              />
            </View>
          </View>
        )}

        {/* Runner Profile Row */}
        {task?.runner && (
          <View style={[s.card, s.runnerCard]}>
            <View style={s.avatarBox}>
              <Text variant="label" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.tangerineInk }}>
                {(task.runner.first_name?.[0] || 'R') + (task.runner.last_name?.[0] || '')}
              </Text>
            </View>

            <View style={{ flex: 1, marginLeft: space[3] }}>
              <Text variant="body" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                {runnerName}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Star size={14} weight="fill" color={color.butter} />
                <Text variant="caption" tone="ink2" style={{ marginLeft: 4 }}>
                  {formatRunnerRating(task.runner.rating)} · {task.runner.trips || task.runner.trips_count || 0} deliveries
                </Text>
              </View>
            </View>

            <View style={s.actionBtnsRow}>
              <View style={s.contactActionWrap}>
                <PressableScale
                  style={s.roundActBtn}
                  onPress={handleStartCall}
                  accessibilityLabel="Call runner"
                >
                  <Phone size={18} weight="bold" color={color.midnight} />
                </PressableScale>
                <Text variant="caption" tone="ink3" style={s.contactLabel}>
                  Call
                </Text>
              </View>
              <View style={s.contactActionWrap}>
                <PressableScale
                  style={s.roundActBtn}
                  onPress={() => {
                    tap();
                    if (id) markMessagesRead(id);
                    setChatOpen(true);
                  }}
                  accessibilityLabel="Message runner"
                >
                  <ChatCircleDots size={18} weight="bold" color={color.midnight} />
                  {unreadCount > 0 && (
                    <View style={s.actionBadge}>
                      <Text variant="caption" style={s.actionBadgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </PressableScale>
                <Text variant="caption" tone="ink3" style={s.contactLabel}>
                  Chat
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* INTERACTIVE HANDSHAKE PIN CARD (FOR SENDER) */}
        {stage !== 'completed' && (
          <Animated.View
            style={[
              s.pinCard,
              stage === 'near' && s.pinCardLiveBorder,
              stage === 'near' && animatedBreatheStyle,
            ]}
          >
            <View style={s.pinHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Handshake size={22} weight="duotone" color={stage === 'near' ? '#059669' : color.tangerine} />
                <Text variant="h3">
                  Handshake PIN
                </Text>
              </View>
              <PressableScale
                style={s.pinToggleBtn}
                onPress={() => {
                  tap();
                  setPinVisible(!pinVisible);
                }}
              >
                {pinVisible ? (
                  <EyeSlash size={16} weight="bold" color={color.ink2} />
                ) : (
                  <Eye size={16} weight="bold" color={color.ink2} />
                )}
                <Text variant="caption" tone="ink2" style={{ marginLeft: 4, fontWeight: '700' }}>
                  {pinVisible ? 'Hide' : 'Show'}
                </Text>
              </PressableScale>
            </View>

            {/* 4 Digit Boxes */}
            <View style={s.pinBoxesRow}>
              {(pinVisible ? (task?.pin || '••••') : '••••').split('').map((char, idx) => (
                <View
                  key={idx}
                  style={[
                    s.pinDigitBox,
                    stage === 'near' && { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1 },
                  ]}
                >
                  <Text
                    variant="h1"
                    tone={stage === 'near' ? 'mintInk' : 'midnight'}
                    style={{ fontSize: 28 }}
                  >
                    {char}
                  </Text>
                </View>
              ))}
            </View>

            <Text variant="caption" tone="ink2" style={{ marginTop: space[3], lineHeight: 18 }}>
              {stage === 'near'
                ? `${runnerFirstName} has arrived! Read this 4-digit PIN to ${runnerFirstName} only when items are handed to you.`
                : `Read this 4-digit PIN to ${runnerFirstName} only when your items are in your hands. Never share it in chat.`}
            </Text>
          </Animated.View>
        )}

        {/* Handover summary if completed */}
        {stage === 'completed' && (
          <View style={[s.card, s.summaryCard]}>
            <Text variant="h3" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.midnight }}>
              Handover summary
            </Text>

            <View style={[s.calcRow, { marginTop: space[3] }]}>
              <Text variant="caption" tone="ink2">Held at start</Text>
              <Text variant="caption" style={{ fontFamily: 'DMSans_700Bold' }}>{naira(currentBudget + bountyNaira)}</Text>
            </View>
            <View style={s.calcRow}>
              <Text variant="caption" tone="ink2">{itemsSummary}</Text>
              <Text variant="caption" style={{ fontFamily: 'DMSans_700Bold' }}>{naira(currentSpent)}</Text>
            </View>
            <View style={s.calcRow}>
              <Text variant="caption" tone="ink2">Runner's fee</Text>
              <Text variant="caption" style={{ fontFamily: 'DMSans_700Bold' }}>{naira(bountyNaira)}</Text>
            </View>
            {refundNaira > 0 && (
              <View style={s.calcRow}>
                <Text variant="caption" style={{ color: color.mintInk, fontWeight: '700' }}>Refunded to your wallet</Text>
                <Text variant="caption" style={{ color: color.mintInk, fontWeight: '700' }}>{naira(refundNaira)}</Text>
              </View>
            )}

            <View style={[s.calcRow, s.calcTotal]}>
              <Text variant="label" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>You paid</Text>
              <Text variant="h3" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.midnight }}>{naira(currentSpent + bountyNaira)}</Text>
            </View>

            <View style={{ marginTop: space[4] }}>
              <Button
                label="Order this again"
                onPress={() => {
                  tap();
                  router.push('/send');
                }}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* ─────────────────────────────────────────────────────────────
         MODAL 1: PRICE CHECK (2-MINUTE COUNTDOWN)
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={priceCheckOpen} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeaderRow}>
              <Text variant="caption" tone="tangerine" style={{ fontFamily: 'DMSans_700Bold' }}>
                {runnerFirstName} needs a quick yes
              </Text>
              <Text variant="label" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.roseInk }}>
                {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
              </Text>
            </View>

            <View style={s.askCardInner}>
              <PriceTagProp size={64} />
              <View style={{ flex: 1, marginLeft: space[3] }}>
                <Text variant="body" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                  {task?.active_ask?.item_name || 'Item'} costs more than expected
                </Text>
                <Text variant="caption" tone="ink2" style={{ marginTop: 2, lineHeight: 18 }}>
                  New price is {naira(askNewPrice || 350)}.
                </Text>
              </View>
            </View>

            <View style={s.mathCard}>
              <View style={s.mathLine}>
                <Text variant="caption" tone="ink2">New price</Text>
                <Text variant="caption" style={{ fontFamily: 'DMSans_700Bold' }}>{naira(askNewPrice || 350)}</Text>
              </View>
              <View style={s.mathLine}>
                <Text variant="caption" tone="ink2">Budget left</Text>
                <Text variant="caption" style={{ fontFamily: 'DMSans_700Bold' }}>{naira(availableBudget)}</Text>
              </View>
              <View style={[s.mathLine, { borderTopWidth: 1, borderTopColor: color.lineSoft, paddingTop: 6 }]}>
                <Text variant="caption" style={{ color: color.roseInk, fontWeight: '700' }}>
                  {askShortNaira > 0 ? 'Short by' : 'Budget covers it'}
                </Text>
                <Text variant="caption" style={{ color: color.roseInk, fontWeight: '800' }}>
                  {naira(askShortNaira)}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: space[4], gap: space[2] }}>
              <Button
                label={askShortNaira > 0 ? `Approve ${naira(askShortNaira)} more` : 'Approve price'}
                onPress={handleApprovePrice}
              />
              <View style={{ flexDirection: 'row', gap: space[2] }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Adjust quantity"
                    variant="secondary"
                    onPress={handleBuyFewer}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Skip this item"
                    variant="secondary"
                    onPress={handleSkipItem}
                  />
                </View>
              </View>
            </View>

            <Text variant="caption" tone="ink3" align="center" style={{ marginTop: space[3] }}>
              If you don't answer in 2 minutes, {runnerFirstName} buys what your budget covers.
            </Text>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
         MODAL 2: SWAP SUGGESTION
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={swapOpen} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeaderRow}>
              <Text variant="caption" tone="tangerine" style={{ fontFamily: 'DMSans_700Bold' }}>
                {runnerFirstName} found a swap
              </Text>
              <Text variant="label" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.midnight }}>
                1:43
              </Text>
            </View>

            <View style={s.askCardInner}>
              <AquafinaProp size={64} />
              <View style={{ flex: 1, marginLeft: space[3] }}>
                <Text variant="body" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                  Original item not in stock. Similar replacement found.
                </Text>
                <Text variant="caption" tone="ink2" style={{ marginTop: 2, lineHeight: 18 }}>
                  Same category and size.
                </Text>
              </View>
            </View>

            <View style={{ marginTop: space[4], gap: space[2] }}>
              <Button
                label="Yes, swap it"
                onPress={() => {
                  tap();
                  setSwapOpen(false);
                  toast.show('Swap approved');
                }}
              />
              <View style={{ flexDirection: 'row', gap: space[2] }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Try other shop"
                    variant="secondary"
                    onPress={() => {
                      tap();
                      setSwapOpen(false);
                      toast.show(`${runnerFirstName} will check nearby shop`);
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Skip it"
                    variant="secondary"
                    onPress={() => {
                      tap();
                      setSwapOpen(false);
                      toast.show('Skipped. That money stays with you.');
                    }}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
         MODAL 3: BOUGHT DETAILS RECEIPT
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={receiptDetailOpen} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeaderRow}>
              <Text variant="h3" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.midnight }}>
                What {runnerFirstName} bought
              </Text>
              <PressableScale onPress={() => setReceiptDetailOpen(false)}>
                <X size={20} weight="bold" color={color.ink3} />
              </PressableScale>
            </View>

            {task?.items && task.items.length > 0 ? (
              task.items.map((it, idx) => (
                <View key={idx} style={s.boughtLi}>
                  <Text variant="body" style={{ fontFamily: 'DMSans_700Bold' }}>{it.name}</Text>
                  <Text variant="caption" tone="ink3">{it.qty} × {naira(it.est ?? 0)}</Text>
                  <Text variant="label" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', alignSelf: 'flex-end' }}>
                    {naira(it.qty * (it.est ?? 0))}
                  </Text>
                </View>
              ))
            ) : (
              <View style={s.boughtLi}>
                <Text variant="body" style={{ fontFamily: 'DMSans_700Bold' }}>{itemsSummary}</Text>
                <Text variant="label" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', alignSelf: 'flex-end' }}>
                  {naira(currentSpent)}
                </Text>
              </View>
            )}

            <View style={s.rcptPhotoBox}>
              <ReceiptProp size={54} />
              <View style={{ flex: 1, marginLeft: space[3] }}>
                <Text variant="label" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>Receipt photo</Text>
                <Text variant="caption" tone="ink2" style={{ marginTop: 2 }}>
                  Paid by {task?.vendor_payment ? 'transfer' : 'cash'} to {task?.vendor_payment?.account_name || 'Vendor'}.
                </Text>
              </View>
            </View>

            <View style={s.reconcileBox}>
              <View style={s.mathLine}>
                <Text variant="caption" tone="ink2">Item budget</Text>
                <Text variant="caption" style={{ fontFamily: 'DMSans_700Bold' }}>{naira(currentBudget)}</Text>
              </View>
              <View style={s.mathLine}>
                <Text variant="caption" tone="ink2">Spent</Text>
                <Text variant="caption" style={{ fontFamily: 'DMSans_700Bold' }}>{naira(currentSpent)}</Text>
              </View>
              <View style={[s.mathLine, { borderTopWidth: 1, borderTopColor: color.lineSoft, paddingTop: 6 }]}>
                <Text variant="caption" style={{ color: color.mintInk, fontWeight: '700' }}>Back in your wallet</Text>
                <Text variant="caption" style={{ color: color.mintInk, fontWeight: '800' }}>{naira(refundNaira)}</Text>
              </View>
            </View>

            <View style={{ marginTop: space[4] }}>
              <Button
                label="Close receipt"
                variant="secondary"
                onPress={() => setReceiptDetailOpen(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
         FULLSCREEN SCREEN BEACON MODE
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={beaconOpen} animationType="fade">
        <View style={s.beaconFullscreen}>
          <Animated.View style={[s.beaconRings, animatedPulseStyle]} />
          <Text variant="display" style={s.beaconName}>
            {myFirstName}
          </Text>
          <Text variant="body" style={s.beaconSub}>
            Hold your phone up high. {runnerFirstName} is looking for this screen.
          </Text>

          <View style={s.beaconCloseWrap}>
            <Button
              label={`${runnerFirstName} found me`}
              variant="secondary"
              onPress={handleBeaconOff}
            />
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
         IN-APP CHAT MODAL (BUY SENDER SIDE)
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={chatOpen} animationType="slide" transparent>
        <View style={s.chatBackdrop}>
          <View style={s.chatModalCard}>
            {/* Header */}
            <View style={s.chatHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={s.chatAvatar}>
                  <Text variant="caption" style={{ color: '#FFFFFF', fontWeight: '700' }}>
                    {runnerFirstName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text variant="body" style={{ fontWeight: '700' }}>
                    {runnerFirstName}
                  </Text>
                  <Text variant="caption" tone="mintInk" style={{ fontWeight: '600' }}>
                    {stage === 'near' ? 'Arriving at your spot' : stage === 'bought' ? 'Bought items, en route' : 'Shopping for your items'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  style={s.chatCallBtn}
                  onPress={() => {
                    tap();
                    setChatOpen(false);
                    handleStartCall();
                  }}
                  accessibilityLabel="Call runner"
                >
                  <Phone size={18} weight="fill" color="#059669" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setChatOpen(false)}
                  accessibilityLabel="Close chat"
                >
                  <X size={22} weight="bold" color={color.midnight} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Anti-PIN leakage banner */}
            <View style={s.chatSecurityBanner}>
              <ShieldCheck size={16} weight="fill" color="#D97706" />
              <Text variant="caption" style={{ color: '#92400E', flex: 1, fontSize: 11, fontWeight: '500' }}>
                Never send your Handshake PIN in chat. Read it to {runnerFirstName} in person.
              </Text>
            </View>

            {/* Messages list */}
            <ScrollView style={s.chatMessagesList} contentContainerStyle={{ paddingVertical: 8, gap: 10 }}>
              {messages.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: space[4] }}>
                  <Text variant="caption" tone="ink3">No messages yet. Send a note to {runnerFirstName}.</Text>
                </View>
              ) : (
                messages.map((m) => (
                  <View
                    key={m.id}
                    style={[
                      s.chatBubble,
                      m.is_runner ? s.chatBubbleThem : s.chatBubbleMe,
                    ]}
                  >
                    <Text
                      variant="body"
                      tone={m.is_runner ? 'midnight' : 'card'}
                      style={{ fontSize: 14, lineHeight: 20 }}
                    >
                      {m.text}
                    </Text>
                    <Text
                      variant="caption"
                      style={{
                        fontSize: 10,
                        alignSelf: 'flex-end',
                        marginTop: 4,
                        color: m.is_runner ? color.ink3 : 'rgba(255,255,255,0.7)',
                      }}
                    >
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Quick Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickChipsRow}>
              {[
                "I'm at the entrance",
                "Take your time",
                "Any brand is fine",
                "Call when you're nearby",
              ].map((chip, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={s.quickChip}
                  onPress={() => handleSendMessage(chip)}
                >
                  <Text variant="caption" tone="ink2" style={{ fontWeight: '500' }}>
                    {chip}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Input Row */}
            <View style={s.chatInputRow}>
              <TextInput
                style={s.chatInput}
                placeholder={`Type a message to ${runnerFirstName}...`}
                placeholderTextColor={color.ink3}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSendMessage()}
              />
              <PressableScale style={s.chatSendBtn} onPress={() => handleSendMessage()}>
                <PaperPlaneRight size={18} weight="bold" color="#FFFFFF" />
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
         MASKED CALL MODAL (BUY SENDER SIDE)
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={callOpen} animationType="fade" transparent>
        <View style={[s.modalOverlay, { backgroundColor: '#0F172A' }]}>
          {toast.node}
          <View style={s.callScreenInner}>
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <View style={s.callAvatarLarge}>
                <Text variant="h1" style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '700' }}>
                  {runnerFirstName.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <Text variant="h2" style={{ color: '#FFFFFF', marginTop: space[3] }}>
                {runnerName}
              </Text>
              <Text variant="caption" style={{ color: '#94A3B8', marginTop: 2 }}>
                Waydrop Agora Call
              </Text>

              {/* Call Timer */}
              <View style={s.callTimerBadge}>
                <Clock size={14} weight="bold" color="#10B981" />
                <Text variant="caption" style={{ color: '#10B981', fontWeight: '700' }}>
                  {agoraStatus === 'connected'
                    ? `${Math.floor(callTimer / 60).toString().padStart(2, '0')}:${(callTimer % 60).toString().padStart(2, '0')}`
                    : agoraStatus === 'error' ? (agoraError || 'Call unavailable') : 'Connecting…'}
                </Text>
              </View>
            </View>

            {/* Privacy Guarantee Badge */}
            <View style={s.callPrivacyBadge}>
              <ShieldCheck size={18} weight="fill" color="#10B981" />
              <Text variant="caption" style={{ color: '#CBD5E1', textAlign: 'center', lineHeight: 18 }}>
                Encrypted audio is connected securely inside Waydrop.
              </Text>
            </View>

            <View
              style={s.systemCallLink}
            >
              <Text variant="caption" style={{ color: '#38BDF8', fontWeight: '600' }}>
                {agoraStatus === 'connected' ? 'Audio call connected' : 'Requesting secure audio connection'}
              </Text>
            </View>

            {/* Call Controls */}
            <View style={s.callControlsRow}>
              {/* Mute */}
              <TouchableOpacity
                style={[s.callBtnCircle, isMuted && s.callBtnActive]}
                onPress={() => {
                  tap();
                  const nextMuted = !isMuted;
                  setIsMuted(nextMuted);
                  void setAgoraMuted(nextMuted);
                }}
              >
                {isMuted ? (
                  <MicrophoneSlash size={24} weight="bold" color="#EF4444" />
                ) : (
                  <Microphone size={24} weight="bold" color="#FFFFFF" />
                )}
                <Text variant="caption" style={{ color: '#94A3B8', marginTop: 6 }}>
                  {isMuted ? 'Unmute' : 'Mute'}
                </Text>
              </TouchableOpacity>

              {/* End Call */}
              <TouchableOpacity
                style={s.callEndBtn}
                onPress={handleEndCall}
              >
                <PhoneDisconnect size={28} weight="fill" color="#FFFFFF" />
              </TouchableOpacity>

              {/* Speaker */}
              <TouchableOpacity
                style={[s.callBtnCircle, isSpeaker && s.callBtnActive]}
                onPress={() => {
                  tap();
                  const nextSpeaker = !isSpeaker;
                  setIsSpeaker(nextSpeaker);
                  void setAgoraSpeaker(nextSpeaker);
                }}
              >
                <SpeakerHigh size={24} weight="bold" color={isSpeaker ? '#10B981' : '#FFFFFF'} />
                <Text variant="caption" style={{ color: '#94A3B8', marginTop: 6 }}>
                  Speaker
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  statusCard: {
    backgroundColor: color.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: color.line,
    padding: space[4],
  },
  stepsRow: {
    flexDirection: 'row',
    gap: space[2],
    marginTop: space[4],
  },
  stepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[3],
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: color.paper,
    borderWidth: 1,
    borderColor: color.line,
  },
  stepChipActive: {
    backgroundColor: color.tangerineSoft,
    borderColor: color.tangerine,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.ink4,
    marginRight: 6,
  },
  stepDotActive: {
    backgroundColor: color.tangerine,
  },
  card: {
    backgroundColor: color.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: color.line,
    padding: space[4],
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space[2],
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: color.line,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: color.mint,
  },
  proofCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space[3],
    backgroundColor: '#F0FDF4',
    borderColor: color.mint,
  },
  beaconCard: {
    marginTop: space[3],
    backgroundColor: color.tangerineSoft,
    borderColor: color.tangerineEdge,
  },
  runnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space[3],
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.tangerineSoft,
    borderWidth: 1.5,
    borderColor: color.tangerine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnsRow: {
    flexDirection: 'row',
    gap: space[2],
  },
  contactActionWrap: {
    alignItems: 'center',
    gap: 2,
  },
  contactLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontFamily: 'DMSans_600SemiBold',
  },
  roundActBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.paper,
    borderWidth: 1.5,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simRow: {
    marginTop: space[4],
    paddingHorizontal: space[1],
  },
  simChip: {
    paddingHorizontal: space[3],
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: color.paper,
    borderWidth: 1,
    borderColor: color.line,
  },
  simChipActive: {
    backgroundColor: color.tangerineSoft,
    borderColor: color.tangerine,
  },
  summaryCard: {
    marginTop: space[4],
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  calcTotal: {
    marginTop: space[3],
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: color.lineSoft,
    alignItems: 'baseline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: color.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space[5],
    paddingBottom: space[8],
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space[3],
  },
  askCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.paper,
    borderRadius: radius.md,
    padding: space[3],
    borderWidth: 1.5,
    borderColor: color.line,
  },
  mathCard: {
    marginTop: space[3],
    backgroundColor: color.paper,
    borderRadius: radius.md,
    padding: space[3],
    gap: 4,
  },
  mathLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  boughtLi: {
    padding: space[3],
    backgroundColor: color.paper,
    borderRadius: radius.md,
    marginBottom: space[3],
  },
  rcptPhotoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space[3],
    backgroundColor: color.paper,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    marginBottom: space[3],
  },
  reconcileBox: {
    padding: space[3],
    backgroundColor: color.paper,
    borderRadius: radius.md,
    gap: 4,
  },
  beaconFullscreen: {
    flex: 1,
    backgroundColor: '#FF5500',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[6],
  },
  beaconRings: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 8,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  beaconName: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 56,
    color: color.white,
    letterSpacing: 2,
    textAlign: 'center',
  },
  beaconSub: {
    fontFamily: 'DMSans_700Bold',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginTop: space[3],
    maxWidth: 280,
    lineHeight: 24,
  },
  beaconCloseWrap: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
  },
  actionBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: color.roseInk,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: color.card,
  },
  actionBadgeText: {
    color: color.white,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '700',
  },
  pinCard: {
    backgroundColor: color.card,
    borderRadius: radius.xl,
    padding: space[4],
    marginTop: space[3],
    borderWidth: 1.5,
    borderColor: color.line,
  },
  pinCardLiveBorder: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  pinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pinToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: color.paper,
    borderWidth: 1,
    borderColor: color.line,
  },
  pinBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: space[3],
  },
  pinDigitBox: {
    width: 58,
    height: 64,
    borderRadius: 16,
    backgroundColor: color.paper,
    borderWidth: 1.5,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  chatModalCard: {
    backgroundColor: color.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '88%',
    height: '84%',
    padding: space[4],
    paddingBottom: space[6],
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: space[3],
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
  },
  chatAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: color.tangerine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSecurityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginTop: space[2],
  },
  chatMessagesList: {
    flex: 1,
    marginVertical: space[2],
  },
  chatBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: radius.lg,
  },
  chatBubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: color.midnight,
    borderBottomRightRadius: 2,
  },
  chatBubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: color.paper,
    borderWidth: 1,
    borderColor: color.line,
    borderBottomLeftRadius: 2,
  },
  quickChipsRow: {
    gap: 8,
    paddingVertical: space[2],
  },
  quickChip: {
    backgroundColor: color.paper,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: space[2],
  },
  chatInput: {
    flex: 1,
    backgroundColor: color.paper,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: color.midnight,
  },
  chatSendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: color.tangerine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callScreenInner: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  callAvatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: color.tangerine,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  callTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginTop: 12,
  },
  callPrivacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.lg,
    maxWidth: 320,
  },
  systemCallLink: {
    paddingVertical: 8,
  },
  callControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 320,
    paddingBottom: 20,
  },
  callBtnCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  callEndBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

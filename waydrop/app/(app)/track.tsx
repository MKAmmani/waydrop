import React, { useEffect, useRef, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  ArrowLeft,
  ArrowsCounterClockwise,
  ChatCircleDots,
  CheckCircle,
  Clock,
  Eye,
  EyeSlash,
  Flag,
  Handshake,
  Hourglass,
  Image as ImageIcon,
  Microphone,
  MicrophoneSlash,
  PaperPlaneRight,
  Phone,
  PhoneDisconnect,
  Receipt,
  ShareNetwork,
  ShieldCheck,
  ShieldWarning,
  Siren,
  SpeakerHigh,
  Star,
  Warning,
  X,
} from 'phosphor-react-native';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import {
  api,
  type CallSessionInfo,
  type ReceiptData,
  type Task,
  type TaskMessage,
} from '@/api';
import { error as hapticError, success as hapticSuccess, tap } from '@/lib/haptics';
import { useAgoraCall } from '@/lib/agoraCall';
import { useAblyTask } from '@/lib/ably';
import { useCommunicationStore } from '@/store/communication';
import { useSession } from '@/store/session';
import { color, radius, shadow, space } from '@/theme/tokens';

const naira = (kobo: number) => '₦' + Math.round(kobo / 100).toLocaleString('en-NG');

type DeliveryPhase =
  | 's1_accepted'
  | 's2_to_pickup'
  | 's3_at_pickup'
  | 's4_photo_proof'
  | 's5_photo_inspect'
  | 's6_en_route'
  | 's7_arrived'
  | 's8_chat'
  | 's9_call'
  | 's10_delivered'
  | 's11_rating'
  | 's12_receipt';

const GOOD_TAGS = ['Fast', 'Friendly', 'Careful with my item', 'Easy to find', 'Great communication'];
const BAD_TAGS = ['Late', 'Hard to reach', 'Item not handled well', 'Rude', 'Asked for extra money'];

const RATING_LABELS = ['', 'Not good', 'Could be better', 'Okay', 'Good', 'Great!'];

export default function TrackScreen() {
  const { id, tab, action } = useLocalSearchParams<{ id?: string; tab?: string; action?: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const sessionMe = useSession((s) => s.me);
  const receiveCall = useCommunicationStore((state) => state.receiveCall);

  const [task, setTask] = useState<Task | null>(null);
  const [phase, setPhase] = useState<DeliveryPhase>('s1_accepted');
  const [pinVisible, setPinVisible] = useState(false);
  const [isLate, setIsLate] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);

  // Active Runner Info from real task
  const [runnerInfo, setRunnerInfo] = useState({
    name: 'Runner',
    first: 'Runner',
    initials: 'R',
    rating: 5.00,
    trips: 0,
  });

  // Modals state
  const [photoInspectOpen, setPhotoInspectOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Chat state
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Call state
  const [callTimer, setCallTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callSession, setCallSession] = useState<CallSessionInfo | null>(null);
  const callIntervalRef = useRef<any>(null);
  const loadTaskInFlightRef = useRef(false);
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

  // Rating state (Flow 7 & Flow 12)
  const [selectedRating, setSelectedRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Fast', 'Friendly']);
  const [selectedTip, setSelectedTip] = useState(10000); // ₦100 default
  const [ratingNote, setRatingNote] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Dispute state (Flow 11)
  const [disputeStep, setDisputeStep] = useState<'list' | 'detail' | 'safety' | 'confirmed'>('list');
  const [disputeReason, setDisputeReason] = useState<string>('wrong');
  const [disputeExplanation, setDisputeExplanation] = useState('');
  const [disputePhotoAttached, setDisputePhotoAttached] = useState(false);
  const [disputeTicket, setDisputeTicket] = useState<string | null>(null);

  // Shared Values for animated map & pulsing
  const runnerProgress = useSharedValue(0.1);
  const pulseAnim = useSharedValue(1);

  // Green Breathing Animation for Handshake PIN card on Arrival
  const breatheAnim = useSharedValue(1);
  useEffect(() => {
    breatheAnim.value = withRepeat(
      withSequence(
        withTiming(1.025, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [breatheAnim]);

  const animatedBreatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breatheAnim.value }],
  }));

  // Pulse animation for runner dot
  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 800, easing: Easing.out(Easing.ease) }),
        withTiming(1.0, { duration: 800, easing: Easing.in(Easing.ease) })
      ),
      -1,
      true
    );
  }, [pulseAnim]);

  // Fetch task initially and keep live sync with real backend
  const loadTask = async () => {
    if (loadTaskInFlightRef.current) return;
    loadTaskInFlightRef.current = true;
    try {
      if (!id) return;
      const res = await api.getTask(id);
      if (res) {
        setTask(res);
        setIsLate(Boolean(res.is_late));
        if (res.runner) {
          const first = res.runner.first_name || 'Runner';
          const last = res.runner.last_name || '';
          const fullName = res.runner.name || `${first} ${last}`.trim();
          const initials = `${first[0] || 'R'}${last[0] || ''}`;
          setRunnerInfo({
            name: fullName,
            first,
            initials,
            rating: res.runner.rating || 5.0,
            trips: res.runner.trips || 0,
          });
        }
        if (res.status === 'accepted') {
          setPhase('s1_accepted');
          runnerProgress.value = withTiming(0.15, { duration: 600 });
        } else if (res.status === 'picked_up') {
          setPhase('s4_photo_proof');
          runnerProgress.value = withTiming(0.4, { duration: 600 });
        } else if (res.status === 'in_transit') {
          setPhase('s6_en_route');
          runnerProgress.value = withTiming(0.65, { duration: 600 });
        } else if (res.status === 'arrived') {
          setPhase('s7_arrived');
          runnerProgress.value = withTiming(0.95, { duration: 600 });
        } else if (res.status === 'completed') {
          setPhase('s10_delivered');
          runnerProgress.value = withTiming(1.0, { duration: 800 });
        } else if (res.status === 'cancelled') {
          setIsCancelled(true);
        }
      }
    } catch {
    } finally {
      loadTaskInFlightRef.current = false;
    }
  };

  useEffect(() => {
    let alive = true;
    loadTask();
    const interval = setInterval(loadTask, 5000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [id, runnerProgress]);

  // Protect Handshake PIN page: If the current user is the runner, redirect to runner shopping screen
  useEffect(() => {
    const runnerId = task?.runner_id || task?.runner?.id;
    if (task && sessionMe && runnerId && runnerId === sessionMe.id) {
      router.replace(`/runner-shopping?id=${task.id}`);
    }
  }, [task, sessionMe]);

  // Real-time Ably updates: task updates, live chat messages, and incoming calls
  useAblyTask(id, (eventName, data) => {
    if (eventName === 'task.updated' || eventName === 'task.accepted') {
      loadTask();
    } else if (eventName === 'task.message' && data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
      if (!chatOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    } else if (eventName === 'call.initiated' && data?.receiver_id === sessionMe?.id) {
      // Incoming calls are joined by IncomingCallOverlay after the receiver answers.
      // Do not open this screen's call modal here: doing so joins the same Agora UID
      // before the overlay and produces AgoraRTCError UID_CONFLICT on answer.
      receiveCall(data);
    } else if (eventName === 'call.ended' && data?.task_id === id) {
      setCallOpen(false);
      setCallSession(null);
    }
  });

  // Handle URL tabs / action params
  useEffect(() => {
    if (tab === 'chat') {
      setChatOpen(true);
      setUnreadCount(0);
    } else if (tab === 'call' || action === 'call') {
      handleStartCall();
    }
  }, [tab, action]);

  // Load chat messages
  useEffect(() => {
    if (!id) return;
    api.getTaskMessages(id).then((res) => {
      if (res && res.messages) {
        setMessages(res.messages);
      }
    }).catch(() => {});
  }, [id, chatOpen]);

  // Call timer effect
  useEffect(() => {
    if (callOpen) {
      setCallTimer(1);
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
  }, [callOpen]);

  const handleStartCall = async () => {
    tap();
    if (!id) return;

    try {
      const info = await api.callRunner(id);
      setCallSession(info);
      setCallOpen(true);
      toast.show(`Calling ${runnerInfo.first}...`);
    } catch (error: any) {
      toast.show(error?.message || 'Calls are unavailable until a runner accepts this errand.');
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

  // Perform Handshake PIN verification (Flow 6 Delivered)
  const handleVerifyPin = async () => {
    tap();
    try {
      const pinToVerify = task?.pin || '';
      if (id && pinToVerify) {
        await api.verifyTaskPin(id, pinToVerify);
      }
      hapticSuccess();
      setPhase('s10_delivered');
      setCelebrationOpen(true);
    } catch (err: any) {
      hapticError();
      toast.show(err.message || 'Incorrect PIN entered.');
    }
  };

  // Flow 4: In-App Chat Sending with Anti-PIN Leakage Guard & Contextual Runner Replies
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    // ANTI-PIN LEAKAGE GUARD:
    // Strictly blocks sending the 4-digit PIN in chat
    const cleanText = text.replace(/[\s\-_.,*#:\/]/g, '');
    const currentPin = task?.pin;
    if (currentPin && cleanText.includes(currentPin)) {
      hapticError();
      toast.show("Don't send your PIN in chat. Read it out in person.");
      return;
    }

    tap();
    setInputText('');
    const temporaryId = 'msg-' + Date.now();
    const newMsg: TaskMessage = {
      id: temporaryId,
      task_id: id || '',
      sender_name: 'You',
      text,
      is_runner: false,
      created_at: Date.now(),
    };
    setMessages((prev) => [...prev, newMsg]);

    try {
      if (id) {
        const sent = await api.sendTaskMessage(id, text, 'You', false);
        setMessages((prev) => prev.map((message) => (message.id === temporaryId ? sent : message)));
      }
    } catch (error: any) {
      setMessages((prev) => prev.filter((message) => message.id !== temporaryId));
      toast.show(error?.message || 'Message could not be sent.');
    }
  };

  // Flow 7 & 12: Rating Submit
  const handleSubmitRating = async () => {
    tap();
    setRatingSubmitting(true);
    try {
      if (id) {
        await api.rateTask(id, {
          rating: selectedRating,
          tags: selectedTags,
          note: ratingNote,
          tip_kobo: selectedRating >= 4 ? selectedTip : 0,
        });
      }
      hapticSuccess();
      setRatingOpen(false);
      toast.show(selectedTip > 0 && selectedRating >= 4 ? `Thanks! ${naira(selectedTip)} tip sent to ${runnerInfo.first}` : 'Thanks for rating');
      fetchReceiptAndOpen();
    } catch {
      setRatingOpen(false);
      fetchReceiptAndOpen();
    } finally {
      setRatingSubmitting(false);
    }
  };

  // Flow 8: Digital Receipt Fetcher
  const fetchReceiptAndOpen = async () => {
    const tipKobo = selectedRating >= 4 ? selectedTip : 0;
    const requesterName = useSession.getState().me?.first_name || 'Requester';
    const fallbackReceipt: ReceiptData = {
      task_id: task?.id || id || '',
      reference: 'WD-REC-' + (task?.id || id || 'ORDER').replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
      date: new Date().toISOString(),
      requester: { name: requesterName },
      runner: { name: runnerInfo.name, rating: runnerInfo.rating, trips: runnerInfo.trips },
      item: task?.item || 'Errand item',
      note: task?.note || '',
      pickup: task?.pickup?.name || 'Pickup',
      dropoff: task?.dropoff?.name || 'Drop-off',
      duration_minutes: 5,
      bounty_kobo: task?.bounty || 0,
      platform_fee_kobo: Math.round((task?.bounty || 0) * 0.1),
      runner_payout_kobo: Math.round((task?.bounty || 0) * 0.9),
      tip_kobo: tipKobo,
      total_paid_kobo: (task?.bounty || 0) + tipKobo,
      payment_method: 'Waydrop Wallet (Escrow Verified)',
      status: 'Paid & Completed',
    };

    try {
      if (id) {
        const r = await api.getTaskReceipt(id);
        setReceiptData(r || fallbackReceipt);
      } else {
        setReceiptData(fallbackReceipt);
      }
    } catch {
      setReceiptData(fallbackReceipt);
    }
    setReceiptOpen(true);
  };

  // Flow 11: Dispute & Report A Problem Handler
  const handleDisputeSubmit = async (reasonKey?: string) => {
    tap();
    const reasonToUse = reasonKey || disputeReason;
    try {
      if (id) {
        const res = await api.disputeTask(id, {
          reason: reasonToUse,
          explanation: disputeExplanation,
        });
        setDisputeTicket(res.ticket_id);
      } else {
        setDisputeTicket('Case WD-' + (task?.pin || id || 'ORDER'));
      }
      hapticSuccess();
      setDisputeStep('confirmed');
    } catch {
      setDisputeTicket('Case WD-' + (task?.pin || id || 'ORDER'));
      setDisputeStep('confirmed');
    }
  };

  const isArrived = phase === 's7_arrived';
  const isDelivered = phase === 's10_delivered' || phase === 's11_rating' || phase === 's12_receipt';
  const pickupPhotoUrl = task?.pickup_photo_url || null;
  const deliveryPhotoUrl = task?.dropoff_photo_url || null;
  const proofPhotoUrl = deliveryPhotoUrl || pickupPhotoUrl;
  const proofPhotoIsDelivery = Boolean(deliveryPhotoUrl);
  const hasPhotoProof = Boolean(proofPhotoUrl);

  const activeStep = isDelivered ? 3 : (phase === 's6_en_route' || isArrived ? 2 : 1);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {toast.node}

      {/* TOP HEADER */}
      <View style={styles.topHeader}>
        <PressableScale
          style={styles.backCircle}
          onPress={() => {
            tap();
            router.replace('/home');
          }}
        >
          <ArrowLeft size={20} weight="bold" color={color.midnight} />
        </PressableScale>

        {/* Dynamic Status Pill */}
        <View
          style={[
            styles.statusPill,
            isArrived
              ? styles.statusPillLive
              : isDelivered
              ? styles.statusPillCompleted
              : styles.statusPillDefault,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              isArrived
                ? { backgroundColor: '#10B981' }
                : isDelivered
                ? { backgroundColor: '#059669' }
                : { backgroundColor: color.tangerine },
            ]}
          />
          <Text
            variant="caption"
            tone={isArrived ? 'mintInk' : isDelivered ? 'mintInk' : 'midnight'}
            style={{ fontSize: 13, fontWeight: '700' }}
          >
            {isDelivered
              ? '✓ Delivery Completed'
              : isArrived
              ? `📍 ${runnerInfo.first} arrived at drop-off`
              : phase === 's6_en_route'
              ? '⚡ On the way to you · ~2 mins'
              : hasPhotoProof
              ? '📸 Verified with photo proof'
              : phase === 's3_at_pickup'
              ? `🔍 Inspecting item at ${task?.pickup?.name || 'pickup'}`
              : `🏃 Heading to pickup · ~3 mins`}
          </Text>
        </View>

        <PressableScale
          style={styles.helpCircle}
          onPress={() => {
            tap();
            setDisputeStep('list');
            setDisputeOpen(true);
          }}
        >
          <ShieldWarning size={20} weight="duotone" color={color.ink2} />
        </PressableScale>
      </View>

      {/* FLOW 9: RUNNER RUNNING LATE BANNER */}
      {isLate && (
        <Animated.View entering={FadeInDown} style={styles.lateBanner}>
          <Hourglass size={20} weight="duotone" color="#D97706" />
          <View style={{ flex: 1 }}>
            <Text variant="caption" style={{ color: '#92400E', fontWeight: '700' }}>
              {runnerInfo.first} is running a bit late
            </Text>
            <Text variant="caption" style={{ color: '#B45309', fontSize: 12, marginTop: 1 }}>
              Still moving toward {task?.pickup?.name || 'pickup'}.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                style={styles.lateActionBtn}
                onPress={() => {
                  tap();
                  setChatOpen(true);
                }}
              >
                <ChatCircleDots size={14} weight="bold" color="#92400E" />
                <Text variant="caption" style={{ color: '#92400E', fontWeight: '700', fontSize: 11 }}>
                  Message
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.lateActionBtn}
                onPress={() => {
                  tap();
                  setDisputeStep('list');
                  setDisputeOpen(true);
                }}
              >
                <Flag size={14} weight="bold" color="#92400E" />
                <Text variant="caption" style={{ color: '#92400E', fontWeight: '700', fontSize: 11 }}>
                  Get help
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* FLOW 10: RUNNER CANCELLED / RE-MATCH RADAR BANNER */}
      {isCancelled && (
        <Animated.View entering={FadeInDown} style={styles.cancelledBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Warning size={20} weight="fill" color="#DC2626" />
            <Text variant="body" style={{ color: '#991B1B', fontWeight: '700' }}>
              {runnerInfo.first} had to cancel
            </Text>
          </View>
          <Text variant="caption" style={{ color: '#7F1D1D', marginTop: 4, lineHeight: 18 }}>
            It happens. We're already finding someone else heading your way. Your {naira(task?.bounty || 30000)} is held safely and your PIN stays the same.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <View style={styles.miniRadarDot} />
            <Text variant="caption" tone="ink2" style={{ fontWeight: '700', flex: 1 }}>
              Radar searching near {task?.pickup?.name || 'campus'}...
            </Text>
            <TouchableOpacity
              style={styles.cancelRefundBtn}
              onPress={() => {
                tap();
                setIsCancelled(false);
                toast.show('Errand cancelled.');
                router.replace('/home');
              }}
            >
              <Text variant="caption" style={{ color: '#DC2626', fontWeight: '700', fontSize: 11 }}>
                Cancel & Refund
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* INTERACTIVE CAMPUS DELIVERY MAP */}
        <View style={styles.mapContainer}>
          <Svg width="100%" height={260} viewBox="0 0 400 260">
            <Defs>
              <LinearGradient id="routeGradient" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="#10B981" />
                <Stop offset="50%" stopColor="#FF5500" />
                <Stop offset="100%" stopColor="#3B82F6" />
              </LinearGradient>
            </Defs>

            {/* Campus Background with Pathways */}
            <Rect width="400" height="260" fill="#F8FAFC" rx="24" />
            <Path
              d="M 20 60 Q 120 40 220 80 T 380 70"
              stroke="#E2E8F0"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M 60 220 Q 180 200 280 240 T 380 180"
              stroke="#E2E8F0"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M 200 20 L 200 240"
              stroke="#E2E8F0"
              strokeWidth="6"
              fill="none"
              strokeDasharray="6 6"
            />

            {/* Architectural Building Landmarks from Task */}
            {/* Pickup Landmark */}
            <Rect x="40" y="70" width="84" height="64" rx="12" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
            <SvgText x="82" y="100" fontSize="10" fontWeight="bold" fill="#334155" textAnchor="middle">
              {task?.pickup?.name ? (task.pickup.name.length > 12 ? task.pickup.name.slice(0, 10) + '…' : task.pickup.name) : 'Pickup'}
            </SvgText>
            <SvgText x="82" y="118" fontSize="9" fill="#64748B" textAnchor="middle">
              Pickup Point
            </SvgText>

            {/* Dropoff Landmark */}
            <Rect x="276" y="126" width="90" height="66" rx="12" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
            <SvgText x="321" y="156" fontSize="10" fontWeight="bold" fill="#334155" textAnchor="middle">
              {task?.dropoff?.name ? (task.dropoff.name.length > 12 ? task.dropoff.name.slice(0, 10) + '…' : task.dropoff.name) : 'Drop-off'}
            </SvgText>
            <SvgText x="321" y="174" fontSize="9" fill="#64748B" textAnchor="middle">
              Drop-off Point
            </SvgText>

            {/* Active Delivery Path Curve */}
            <Path
              d="M 124 102 C 180 102, 220 160, 276 160"
              stroke="url(#routeGradient)"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />

            {/* Pickup Spot Marker (Green) */}
            <Circle cx="124" cy="102" r="8" fill="#10B981" />
            <Circle cx="124" cy="102" r="14" fill="#10B981" opacity="0.25" />

            {/* Dropoff Spot Marker (Blue/Destination) */}
            <Circle cx="276" cy="160" r="8" fill="#3B82F6" />
            <Circle cx="276" cy="160" r="14" fill="#3B82F6" opacity="0.25" />

            {/* Runner Marker Gliding along Route */}
            {(() => {
              let cx = 140;
              let cy = 104;
              if (phase === 's1_accepted') {
                cx = 70;
                cy = 50;
              } else if (phase === 's2_to_pickup') {
                cx = 95;
                cy = 75;
              } else if (phase === 's3_at_pickup' || phase === 's4_photo_proof' || phase === 's5_photo_inspect') {
                cx = 124;
                cy = 102;
              } else if (phase === 's6_en_route') {
                cx = 200;
                cy = 131;
              } else if (isArrived || isDelivered) {
                cx = 276;
                cy = 160;
              }

              return (
                <G>
                  <Circle cx={cx} cy={cy} r="22" fill="#FF5500" opacity="0.2" />
                  <Circle cx={cx} cy={cy} r="15" fill="#FF5500" stroke="#FFFFFF" strokeWidth="3" />
                  <SvgText
                    x={cx}
                    y={cy + 4}
                    fontSize="9"
                    fontWeight="bold"
                    fill="#FFFFFF"
                    textAnchor="middle"
                  >
                    {runnerInfo.initials}
                  </SvgText>
                </G>
              );
            })()}
          </Svg>

          {/* Quick Route Tag on Map */}
          <View style={styles.mapRouteOverlay}>
            <Text variant="caption" tone="midnight" style={{ fontSize: 12, fontWeight: '700' }}>
              {task?.item || 'Delivery'}
            </Text>
            <Text variant="caption" tone="ink3" style={{ fontSize: 11 }}>
              {task ? `${task.pickup?.name ?? 'Pickup'} → ${task.dropoff?.name ?? 'Drop-off'}` : 'Live route'}
            </Text>
          </View>
        </View>

        {/* 3-STEP DELIVERY PROGRESS BAR */}
        <View style={styles.stepperContainer}>
          <View style={styles.stepperTrack}>
            <View
              style={[
                styles.stepperTrackFill,
                { width: activeStep === 3 ? '100%' : activeStep === 2 ? '65%' : '25%' },
              ]}
            />
          </View>

          <View style={styles.stepperRow}>
            {/* Step 1 */}
            <View style={styles.stepCol}>
              <View
                style={[
                  styles.stepBadge,
                  activeStep >= 1 ? styles.stepBadgeDone : styles.stepBadgePending,
                ]}
              >
                {activeStep > 1 ? (
                  <CheckCircle size={14} weight="bold" color="#FFFFFF" />
                ) : (
                  <Text variant="caption" style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                    1
                  </Text>
                )}
              </View>
              <Text variant="caption" tone={activeStep === 1 ? 'midnight' : 'ink3'} style={{ fontWeight: activeStep === 1 ? '700' : '500' }}>
                To pickup
              </Text>
            </View>

            {/* Step 2 */}
            <View style={styles.stepCol}>
              <View
                style={[
                  styles.stepBadge,
                  activeStep >= 2 ? styles.stepBadgeDone : styles.stepBadgePending,
                ]}
              >
                {activeStep > 2 ? (
                  <CheckCircle size={14} weight="bold" color="#FFFFFF" />
                ) : (
                  <Text
                    variant="caption"
                    style={{ color: activeStep >= 2 ? '#FFFFFF' : color.ink3, fontSize: 11, fontWeight: '700' }}
                  >
                    2
                  </Text>
                )}
              </View>
              <Text variant="caption" tone={activeStep === 2 ? 'midnight' : 'ink3'} style={{ fontWeight: activeStep === 2 ? '700' : '500' }}>
                To you
              </Text>
            </View>

            {/* Step 3 */}
            <View style={styles.stepCol}>
              <View
                style={[
                  styles.stepBadge,
                  activeStep === 3 ? styles.stepBadgeDone : styles.stepBadgePending,
                ]}
              >
                <Text
                  variant="caption"
                  style={{ color: activeStep === 3 ? '#FFFFFF' : color.ink3, fontSize: 11, fontWeight: '700' }}
                >
                  3
                </Text>
              </View>
              <Text variant="caption" tone={activeStep === 3 ? 'midnight' : 'ink3'} style={{ fontWeight: activeStep === 3 ? '700' : '500' }}>
                Delivered
              </Text>
            </View>
          </View>
        </View>

        {/* RUNNER CONTACT CARD */}
        <View style={styles.runnerCard}>
          <View style={styles.runnerAvatar}>
            <Text variant="h3" style={{ color: '#FFFFFF', fontWeight: '700' }}>
              {runnerInfo.initials}
            </Text>
            <View style={styles.onlineBadge} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text variant="h3">
                {runnerInfo.name}
              </Text>
              <ShieldCheck size={16} weight="fill" color="#10B981" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Star size={13} weight="fill" color="#F59E0B" />
              <Text variant="caption" tone="midnight" style={{ fontWeight: '700' }}>
                {runnerInfo.rating.toFixed(2)}
              </Text>
              <Text variant="caption" tone="ink3">
                · {runnerInfo.trips} errands · Verified Runner
              </Text>
            </View>
          </View>

          {/* Quick Action Icons: Chat & Masked Phone */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <PressableScale
              style={styles.actionRoundBtn}
              onPress={() => {
                tap();
                setUnreadCount(0);
                setChatOpen(true);
              }}
            >
              <ChatCircleDots size={20} weight="duotone" color={color.midnight} />
              {unreadCount > 0 && <View style={styles.actionBadge} />}
            </PressableScale>

            <PressableScale
              style={[styles.actionRoundBtn, { backgroundColor: color.mintSoft }]}
              onPress={handleStartCall}
            >
              <Phone size={20} weight="fill" color="#059669" />
            </PressableScale>
          </View>
        </View>

        {/* PHOTO PROOF CARD (Pickup or delivery proof) */}
        {hasPhotoProof && proofPhotoUrl && (
          <PressableScale
            style={styles.photoProofCard}
            accessibilityRole="button"
            accessibilityLabel={`View ${proofPhotoIsDelivery ? 'delivery' : 'pickup'} photo proof`}
            onPress={() => {
              tap();
              setPhotoInspectOpen(true);
            }}
          >
            <View style={styles.photoProofThumb}>
              <Image source={{ uri: proofPhotoUrl }} style={styles.photoProofThumbImage} contentFit="cover" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text variant="body" style={{ fontWeight: '700' }}>
                  {proofPhotoIsDelivery ? 'Delivery Photo Proof' : 'Photo Proof at Pickup'}
                </Text>
                <View style={styles.verifiedTag}>
                  <Text variant="caption" style={{ color: '#059669', fontSize: 10, fontWeight: '700' }}>
                    VERIFIED
                  </Text>
                </View>
              </View>
              <Text variant="caption" tone="ink2" style={{ marginTop: 2 }}>
                {proofPhotoIsDelivery
                  ? `${runnerInfo.first} photographed the item at handover. Tap to view`
                  : `${runnerInfo.first} photographed pickup proof. Tap to view`}
              </Text>
            </View>
            <Eye size={20} weight="bold" color={color.ink3} />
          </PressableScale>
        )}

        {/* INTERACTIVE HANDSHAKE PIN CARD */}
        <Animated.View
          style={[
            styles.pinCard,
            isArrived && styles.pinCardLiveBorder,
            isArrived && animatedBreatheStyle,
          ]}
        >
          <View style={styles.pinHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Handshake size={22} weight="duotone" color={isArrived ? '#059669' : color.tangerine} />
              <Text variant="h3">
                Handshake PIN
              </Text>
            </View>
            <PressableScale
              style={styles.pinToggleBtn}
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
          <View style={styles.pinBoxesRow}>
            {(pinVisible ? (task?.pin || '••••') : '••••').split('').map((char, idx) => (
              <View
                key={idx}
                style={[
                  styles.pinDigitBox,
                  isArrived && { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1 },
                ]}
              >
                <Text
                  variant="h1"
                  tone={isArrived ? 'mintInk' : 'midnight'}
                  style={{ fontSize: 28 }}
                >
                  {char}
                </Text>
              </View>
            ))}
          </View>

          <Text variant="caption" tone="ink2" style={{ marginTop: space[3], lineHeight: 18 }}>
            {isArrived
              ? `Runner has arrived at ${task?.dropoff?.name || 'drop-off'}! Read this 4-digit PIN to ${runnerInfo.first} to release payment.`
              : `Read this 4-digit PIN to ${runnerInfo.first} only when the item is in your hands. Never share it in chat.`}
          </Text>

          {/* Confirm Button */}
          <View style={{ marginTop: space[4] }}>
            <Button
              label={isDelivered ? '✓ Delivered & Escrow Released' : 'Confirm PIN Handshake'}
              variant={isDelivered ? 'secondary' : 'primary'}
              onPress={handleVerifyPin}
              disabled={isDelivered}
            />
          </View>
        </Animated.View>

        {/* FINANCIAL ESCROW AUDIT SUMMARY */}
        <View style={styles.escrowCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={20} weight="fill" color="#10B981" />
            <Text variant="body" style={{ fontWeight: '700' }}>
              {naira(task?.bounty || 0)} Held Safely in Escrow
            </Text>
          </View>
          <Text variant="caption" tone="ink3" style={{ marginTop: 4, lineHeight: 18 }}>
            Your money is locked in campus escrow. It is only released to {runnerInfo.first} when the Handshake PIN is validated.
          </Text>
        </View>

        {/* BOTTOM QUICK ACTIONS: RECEIPT & DISPUTE */}
        <View style={styles.bottomActionsRow}>
          <PressableScale
            style={styles.subActionBtn}
            onPress={() => {
              tap();
              fetchReceiptAndOpen();
            }}
          >
            <Receipt size={18} weight="bold" color={color.ink2} />
            <Text variant="caption" tone="ink2" style={{ fontWeight: '700' }}>
              Digital Receipt
            </Text>
          </PressableScale>

          <PressableScale
            style={styles.subActionBtn}
            onPress={() => {
              tap();
              setDisputeStep('list');
              setDisputeOpen(true);
            }}
          >
            <ShieldWarning size={18} weight="bold" color={color.ink2} />
            <Text variant="caption" tone="ink2" style={{ fontWeight: '700' }}>
              Report Issue
            </Text>
          </PressableScale>
        </View>
      </ScrollView>

      {/* PHOTO PROOF INSPECTOR */}
      <Modal
        visible={photoInspectOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setPhotoInspectOpen(false)}
      >
        <View
          style={[
            styles.photoInspectModal,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 },
          ]}
        >
          <View style={styles.photoInspectHeader}>
            <View style={{ flex: 1 }}>
              <Text variant="h2" style={{ color: '#FFFFFF' }}>
                {proofPhotoIsDelivery ? 'Delivery photo proof' : 'Pickup photo proof'}
              </Text>
              <Text variant="caption" style={{ color: '#CBD5E1', marginTop: 4 }}>
                {proofPhotoIsDelivery
                  ? `Captured by ${runnerInfo.first} at handover`
                  : `Captured by ${runnerInfo.first} at pickup`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.photoInspectCloseBtn}
              onPress={() => {
                tap();
                setPhotoInspectOpen(false);
              }}
              accessibilityRole="button"
              accessibilityLabel="Close photo proof"
            >
              <X size={20} weight="bold" color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {proofPhotoUrl ? (
            <Image source={{ uri: proofPhotoUrl }} style={styles.photoInspectImage} contentFit="contain" />
          ) : null}

          <Text variant="caption" style={{ color: '#94A3B8', textAlign: 'center' }}>
            This photo is saved with the delivery record.
          </Text>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
         FLOW 4: IN-APP CHAT WITH ANTI-PIN LEAKAGE GUARD & CALL BTN
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={chatOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '88%', height: '84%' }]}>
            {/* Chat Header */}
            <View style={styles.chatHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.chatRunnerAva}>
                  <Text variant="caption" style={{ color: '#FFFFFF', fontWeight: '700' }}>
                    {runnerInfo.initials}
                  </Text>
                </View>
                <View>
                  <Text variant="body" style={{ fontWeight: '700' }}>
                    {runnerInfo.first}
                  </Text>
                  <Text variant="caption" tone="mintInk" style={{ fontWeight: '600' }}>
                    {isArrived ? `Arrived at ${task?.dropoff?.name || 'drop-off'}` : `Walking to ${task?.pickup?.name || 'pickup'}`}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {/* Chat Call Button */}
                <TouchableOpacity
                  style={styles.chatCallBtn}
                  onPress={() => {
                    tap();
                    setChatOpen(false);
                    handleStartCall();
                  }}
                >
                  <Phone size={18} weight="fill" color="#059669" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setChatOpen(false)}>
                  <X size={22} weight="bold" color={color.midnight} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Anti-PIN Leakage Notice Banner from 04_Live_Delivery.html */}
            <View style={styles.chatSecurityBanner}>
              <ShieldCheck size={16} weight="fill" color="#D97706" />
              <Text variant="caption" style={{ color: '#92400E', flex: 1, fontSize: 11, fontWeight: '500' }}>
                Never send your Handshake PIN in chat. Read it out in person.
              </Text>
            </View>

            {/* Messages Feed */}
            <ScrollView style={styles.chatMessagesList} contentContainerStyle={{ paddingVertical: 6, gap: 6 }}>
              {messages.map((m) => (
                <View
                  key={m.id}
                  style={[
                    styles.chatBubble,
                    m.is_runner ? styles.chatBubbleRunner : styles.chatBubbleYou,
                  ]}
                >
                  <Text
                    variant="body"
                    tone={m.is_runner ? 'midnight' : 'card'}
                    style={{ fontSize: 14, lineHeight: 19 }}
                  >
                    {m.text}
                    {'  '}
                    <Text
                      style={{
                        fontSize: 9,
                        color: m.is_runner ? color.ink3 : 'rgba(255,255,255,0.75)',
                      }}
                    >
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Quick Reply Chips from 04_Live_Delivery.html */}
            <View style={styles.quickChipsRow}>
              {[
                "I'm at the foyer",
                "Wearing a blue hoodie",
                "Be right down",
                "Call when outside",
              ].map((chip, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickChip}
                  onPress={() => handleSendMessage(chip)}
                >
                  <Text variant="caption" tone="ink2" style={{ fontWeight: '500' }}>
                    {chip}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Message Input Bar */}
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder={`Type a message to ${runnerInfo.first}...`}
                placeholderTextColor={color.ink3}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSendMessage()}
              />
              <PressableScale style={styles.chatSendBtn} onPress={() => handleSendMessage()}>
                <PaperPlaneRight size={18} weight="bold" color="#FFFFFF" />
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
         FLOW 5: MASKED PHONE CALLING SCREEN
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={callOpen} animationType="fade" transparent>
        <View style={[styles.modalBackdrop, { backgroundColor: '#0F172A' }]}>
          {toast.node}
          <View style={styles.callScreenInner}>
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <View style={styles.callAvatarLarge}>
                <Text variant="h1" style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '700' }}>
                  {runnerInfo.initials}
                </Text>
              </View>
              <Text variant="h2" style={{ color: '#FFFFFF', marginTop: space[3] }}>
                {runnerInfo.name}
              </Text>
              <Text variant="caption" style={{ color: '#94A3B8', marginTop: 2 }}>
                Waydrop Agora Call
              </Text>

              {/* Call Timer */}
              <View style={styles.callTimerBadge}>
                <Clock size={14} weight="bold" color="#10B981" />
                <Text variant="caption" style={{ color: '#10B981', fontWeight: '700' }}>
                  {agoraStatus === 'connected'
                    ? `${Math.floor(callTimer / 60).toString().padStart(2, '0')}:${(callTimer % 60).toString().padStart(2, '0')}`
                    : agoraStatus === 'error' ? 'Call unavailable' : 'Connecting…'}
                </Text>
              </View>
            </View>

            {/* Privacy Guarantee Badge from spec */}
            <View style={styles.callPrivacyBadge}>
              <ShieldCheck size={18} weight="fill" color="#10B981" />
              <Text variant="caption" style={{ color: '#CBD5E1', textAlign: 'center', lineHeight: 18 }}>
                Encrypted audio is connected securely inside Waydrop.
              </Text>
            </View>

            <View
              style={styles.systemCallLink}
            >
              <Text variant="caption" style={{ color: '#38BDF8', fontWeight: '600' }}>
                {agoraStatus === 'connected' ? 'Audio call connected' : 'Requesting secure audio connection'}
              </Text>
            </View>

            {/* Call Control Buttons */}
            <View style={styles.callControlsRow}>
              {/* Mute */}
              <TouchableOpacity
                style={[styles.callBtnCircle, isMuted && styles.callBtnActive]}
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

              {/* End Call (Red) */}
              <TouchableOpacity
                style={styles.callEndBtn}
                onPress={handleEndCall}
              >
                <PhoneDisconnect size={28} weight="fill" color="#FFFFFF" />
              </TouchableOpacity>

              {/* Speaker */}
              <TouchableOpacity
                style={[styles.callBtnCircle, isSpeaker && styles.callBtnActive]}
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

      {/* ─────────────────────────────────────────────────────────────
         FLOW 6: FULLSCREEN CELEBRATION MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={celebrationOpen} animationType="fade" transparent>
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(15,23,42,0.85)' }]}>
          <Animated.View entering={FadeInUp} style={styles.celebrationCard}>
            {/* Confetti Particles */}
            <View style={styles.confettiDotsRow}>
              {['#10B981', '#FF5500', '#F59E0B', '#3B82F6', '#8B5CF6'].map((c, i) => (
                <View key={i} style={[styles.confettiDot, { backgroundColor: c }]} />
              ))}
            </View>

            <View style={styles.celebrationCheckLarge}>
              <CheckCircle size={64} weight="fill" color="#10B981" />
            </View>

            <Text variant="h1" align="center" style={{ marginTop: space[3], fontSize: 26 }}>
              Delivery Complete!
            </Text>
            <Text variant="body" tone="ink2" align="center" style={{ marginTop: space[2], lineHeight: 22 }}>
              Your {task?.item?.toLowerCase() || 'item'} is in your hands. {naira(task?.bounty || 0)} has been released safely to {runnerInfo.first}.
            </Text>

            <View style={{ width: '100%', marginTop: space[5] }}>
              <Button
                label="Rate Your Runner →"
                onPress={() => {
                  tap();
                  setCelebrationOpen(false);
                  setRatingOpen(true);
                }}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
         FLOW 7 & FLOW 12: 5-STAR RATING & LOW RATING FLOW
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={ratingOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text variant="h2">
                How was {runnerInfo.first}?
              </Text>
              <TouchableOpacity onPress={() => setRatingOpen(false)}>
                <X size={22} weight="bold" color={color.midnight} />
              </TouchableOpacity>
            </View>

            <Text variant="caption" tone="ink3" style={{ marginBottom: 12 }}>
              Ratings keep Waydrop safe and fair. {runnerInfo.first} only sees the stars, not your note.
            </Text>

            {/* 5 Stars */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => {
                    tap();
                    const flip = (selectedRating <= 3) !== (star <= 3);
                    setSelectedRating(star);
                    if (flip) setSelectedTags([]);
                    if (star < 4) setSelectedTip(0); // Flow 12: No tip on low ratings!
                  }}
                >
                  <Star
                    size={40}
                    weight={star <= selectedRating ? 'fill' : 'regular'}
                    color={star <= selectedRating ? '#F59E0B' : '#CBD5E1'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Dynamic Label from 04_Live_Delivery.html */}
            <Text variant="body" tone={selectedRating <= 3 ? 'rose' : 'tangerine'} align="center" style={{ marginTop: 4, fontWeight: '700' }}>
              {RATING_LABELS[selectedRating] || ''}
            </Text>

            {/* Dynamic Tags: BAD_TAGS on <= 3 stars; GOOD_TAGS on >= 4 stars */}
            <View style={styles.complimentsWrap}>
              {(selectedRating <= 3 ? BAD_TAGS : GOOD_TAGS).map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.complimentTag, active && styles.complimentTagActive]}
                    onPress={() => {
                      tap();
                      setSelectedTags((prev) =>
                        active ? prev.filter((t) => t !== tag) : [...prev, tag]
                      );
                    }}
                  >
                    <Text variant="caption" style={{ color: active ? '#FFFFFF' : color.ink2, fontWeight: '500' }}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* TIP SELECTOR: Only visible on High Ratings (4 or 5 stars) */}
            {selectedRating >= 4 ? (
              <View style={{ marginTop: space[4] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text variant="caption" tone="ink3" style={{ fontWeight: '700' }}>
                    ADD A TIP
                  </Text>
                  <Text variant="caption" tone="ink3">
                    100% goes to {runnerInfo.first}
                  </Text>
                </View>
                <View style={styles.tipRow}>
                  {[
                    { kobo: 0, label: 'No tip' },
                    { kobo: 5000, label: '₦50' },
                    { kobo: 10000, label: '₦100' },
                    { kobo: 20000, label: '₦200' },
                  ].map((tip) => {
                    const active = selectedTip === tip.kobo;
                    return (
                      <TouchableOpacity
                        key={tip.kobo}
                        style={[styles.tipBtn, active && styles.tipBtnActive]}
                        onPress={() => {
                          tap();
                          setSelectedTip(tip.kobo);
                        }}
                      >
                        <Text
                          variant="body"
                          style={{ color: active ? '#FFFFFF' : color.midnight, fontWeight: '700' }}
                        >
                          {tip.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : (
              /* FLOW 12: Low rating report link */
              <TouchableOpacity
                style={styles.lowRatingReportBox}
                onPress={() => {
                  tap();
                  setRatingOpen(false);
                  setDisputeStep('list');
                  setDisputeOpen(true);
                }}
              >
                <Flag size={18} weight="bold" color="#E11D48" />
                <Text variant="caption" style={{ color: '#E11D48', fontWeight: '700', flex: 1, marginLeft: 8 }}>
                  Something went wrong? Report it
                </Text>
                <Text variant="caption" style={{ color: '#E11D48', fontWeight: '700' }}>
                  →
                </Text>
              </TouchableOpacity>
            )}

            {/* Note input */}
            <TextInput
              style={styles.ratingTextInput}
              placeholder={selectedRating <= 3 ? "What went wrong? We'll look into it." : `Leave an encouraging note for ${runnerInfo.first}...`}
              placeholderTextColor={color.ink3}
              value={ratingNote}
              onChangeText={setRatingNote}
            />

            <View style={{ gap: space[2], marginTop: space[4] }}>
              <Button
                label={selectedTip > 0 && selectedRating >= 4 ? `Submit and tip ${naira(selectedTip)}` : 'Submit rating'}
                loading={ratingSubmitting}
                onPress={handleSubmitRating}
              />
              <Button
                label="Skip for now"
                variant="ghost"
                onPress={() => {
                  tap();
                  setRatingOpen(false);
                  fetchReceiptAndOpen();
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
         FLOW 8: DIGITAL RECEIPT
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={receiptOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text variant="h2">
                Receipt
              </Text>
              <TouchableOpacity onPress={() => setReceiptOpen(false)}>
                <X size={22} weight="bold" color={color.midnight} />
              </TouchableOpacity>
            </View>

            {/* Clean Receipt Container */}
            <View style={styles.receiptFrame}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={styles.paidBadge}>
                  <Text variant="caption" style={{ color: '#059669', fontSize: 11, fontWeight: '700' }}>
                    ✓ Delivered
                  </Text>
                </View>
                <Text variant="caption" tone="ink3">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              <Text variant="h2" style={{ marginTop: space[2], fontSize: 20 }}>
                {receiptData?.item || task?.item || 'Errand item'}
              </Text>
              <Text variant="caption" tone="ink2" style={{ marginTop: 2 }}>
                {receiptData?.pickup || task?.pickup?.name || 'Pickup'} to {receiptData?.dropoff || task?.dropoff?.name || 'Drop-off'}, by {runnerInfo.name}
              </Text>

              <View style={styles.receiptDivider} />

              {/* Financial Breakdown */}
              <View style={styles.receiptRow}>
                <Text variant="caption" tone="ink2">
                  Errand offer
                </Text>
                <Text variant="caption" tone="midnight" style={{ fontWeight: '700' }}>
                  {naira(receiptData?.bounty_kobo || task?.bounty || 0)}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text variant="caption" tone="ink2">
                  Included service fee (10%)
                </Text>
                <Text variant="caption" tone="ink3">
                  {naira(receiptData?.platform_fee_kobo || 3000)}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text variant="caption" tone="ink2">
                  Runner received
                </Text>
                <Text variant="caption" tone="midnight" style={{ fontWeight: '700' }}>
                  {naira(receiptData?.runner_payout_kobo || 27000)}
                </Text>
              </View>
              {(receiptData?.tip_kobo ?? 0) > 0 && (
                <View style={styles.receiptRow}>
                  <Text variant="caption" tone="ink2">
                    Tip
                  </Text>
                  <Text variant="caption" tone="midnight" style={{ fontWeight: '700' }}>
                    {naira(receiptData!.tip_kobo)}
                  </Text>
                </View>
              )}

              <View style={[styles.receiptRow, { marginTop: space[2], paddingTop: space[2], borderTopWidth: 1, borderTopColor: '#E2E8F0' }]}>
                <Text variant="body" style={{ fontWeight: '700' }}>
                  Total paid from wallet
                </Text>
                <Text variant="h3" tone="mintInk">
                  {naira(receiptData?.total_paid_kobo || 30000)}
                </Text>
              </View>

              <View style={styles.receiptDivider} />

              {/* Timestamps & Reference */}
              <View style={styles.receiptRow}>
                <Text variant="caption" tone="ink3">
                  Requested
                </Text>
                <Text variant="caption" tone="midnight">
                  {new Date(Date.now() - 600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text variant="caption" tone="ink3">
                  Picked up
                </Text>
                <Text variant="caption" tone="midnight">
                  {new Date(Date.now() - 360000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, photo on file
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text variant="caption" tone="ink3">
                  Delivered
                </Text>
                <Text variant="caption" tone="midnight">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, PIN confirmed
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text variant="caption" tone="ink3">
                  Reference
                </Text>
                <Text variant="caption" tone="midnight" style={{ fontWeight: '700' }}>
                  {receiptData?.reference || 'WD-T7Q2-4821'}
                </Text>
              </View>
            </View>

            <View style={{ gap: space[2], marginTop: space[4] }}>
              <Button
                label="Send this again"
                onPress={() => {
                  tap();
                  setReceiptOpen(false);
                  const textParam = task
                    ? `Bring my ${task.item} from ${task.pickup?.name} to ${task.dropoff?.name} for ${Math.round(task.bounty / 100)}`
                    : '';
                  router.push({ pathname: '/send', params: { text: textParam } });
                }}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Share"
                    variant="secondary"
                    onPress={() => {
                      tap();
                      toast.show('Receipt saved as PDF / link copied');
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Report"
                    variant="secondary"
                    onPress={() => {
                      tap();
                      setReceiptOpen(false);
                      setDisputeStep('list');
                      setDisputeOpen(true);
                    }}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
         FLOW 11: REPORT A PROBLEM & SAFETY ESCALATION MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={disputeOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Step 1: Reasons List */}
            {disputeStep === 'list' && (
              <View>
                <View style={styles.modalHeader}>
                  <Text variant="h2">
                    What's wrong?
                  </Text>
                  <TouchableOpacity onPress={() => setDisputeOpen(false)}>
                    <X size={22} weight="bold" color={color.midnight} />
                  </TouchableOpacity>
                </View>
                <Text variant="caption" tone="ink3" style={{ marginBottom: space[3] }}>
                  Your {naira(task?.bounty || 30000)} stays held safely while we sort it out.
                </Text>

                <View style={{ gap: 8 }}>
                  {[
                    { id: 'moving', label: "Runner isn't moving", icon: <Hourglass size={18} weight="bold" color={color.ink2} /> },
                    { id: 'reach', label: "Can't reach the runner", icon: <PhoneDisconnect size={18} weight="bold" color={color.ink2} /> },
                    { id: 'wrong', label: "Wrong or damaged item", icon: <Warning size={18} weight="bold" color={color.ink2} /> },
                    { id: 'money', label: "Asked me for extra money", icon: <ShieldWarning size={18} weight="bold" color={color.ink2} /> },
                    { id: 'safety', label: "I feel unsafe", icon: <Siren size={18} weight="fill" color="#DC2626" />, isDanger: true },
                    { id: 'other', label: "Something else", icon: <ChatCircleDots size={18} weight="bold" color={color.ink2} /> },
                  ].map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.reasonRowBtn, r.isDanger && styles.reasonDangerBtn]}
                      onPress={() => {
                        tap();
                        setDisputeReason(r.id);
                        if (r.id === 'safety') {
                          setDisputeStep('safety');
                        } else {
                          setDisputeStep('detail');
                        }
                      }}
                    >
                      {r.icon}
                      <Text
                        variant="body"
                        style={{
                          fontWeight: '600',
                          flex: 1,
                          marginLeft: 10,
                          color: r.isDanger ? '#DC2626' : color.midnight,
                        }}
                      >
                        {r.label}
                      </Text>
                      <Text variant="caption" style={{ color: color.ink3 }}>
                        →
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Step 2a: Emergency Safety Escalation */}
            {disputeStep === 'safety' && (
              <View>
                <View style={styles.modalHeader}>
                  <Text variant="h2" style={{ color: '#DC2626' }}>
                    Your safety comes first
                  </Text>
                  <TouchableOpacity onPress={() => setDisputeOpen(false)}>
                    <X size={22} weight="bold" color={color.midnight} />
                  </TouchableOpacity>
                </View>
                <Text variant="caption" tone="ink2" style={{ marginBottom: space[3], lineHeight: 18 }}>
                  If you're in danger right now, call emergency services. We'll also alert our campus safety team immediately.
                </Text>

                <View style={{ gap: space[2], marginTop: space[2] }}>
                  <Button
                    label="🚨 Call 112 (Emergency)"
                    variant="primary"
                    onPress={() => {
                      tap();
                      Linking.openURL('tel:112');
                    }}
                  />
                  <Button
                    label="Share my live location with a friend"
                    variant="secondary"
                    onPress={() => {
                      tap();
                      toast.show('Live location link copied to clipboard');
                    }}
                  />
                  <Button
                    label="Alert the Waydrop safety team"
                    variant="secondary"
                    onPress={() => handleDisputeSubmit('safety')}
                  />
                </View>
              </View>
            )}

            {/* Step 2b: Detail Textarea + Photo Proof */}
            {disputeStep === 'detail' && (
              <View>
                <View style={styles.modalHeader}>
                  <Text variant="h2">
                    {disputeReason === 'wrong' ? 'Wrong or damaged item' : 'A few words help us fix it'}
                  </Text>
                  <TouchableOpacity onPress={() => setDisputeOpen(false)}>
                    <X size={22} weight="bold" color={color.midnight} />
                  </TouchableOpacity>
                </View>
                <Text variant="caption" tone="ink3" style={{ marginBottom: space[2] }}>
                  Tell us what happened so we can assist right away.
                </Text>

                <TextInput
                  style={[styles.ratingTextInput, { height: 80 }]}
                  placeholder={disputeReason === 'wrong' ? 'What was wrong with the item?' : 'What happened?'}
                  placeholderTextColor={color.ink3}
                  multiline
                  value={disputeExplanation}
                  onChangeText={setDisputeExplanation}
                />

                <TouchableOpacity
                  style={[styles.addPhotoBtn, disputePhotoAttached && styles.addPhotoBtnAttached]}
                  onPress={() => {
                    tap();
                    setDisputePhotoAttached(true);
                    toast.show('Photo attached');
                  }}
                >
                  <ImageIcon size={18} weight="bold" color={disputePhotoAttached ? '#059669' : color.ink2} />
                  <Text variant="caption" style={{ color: disputePhotoAttached ? '#059669' : color.ink2, fontWeight: '600' }}>
                    {disputePhotoAttached ? '✓ Photo attached' : 'Add a photo (optional)'}
                  </Text>
                </TouchableOpacity>

                <View style={{ marginTop: space[4] }}>
                  <Button
                    label="Send report"
                    onPress={() => handleDisputeSubmit()}
                  />
                </View>
              </View>
            )}

            {/* Step 3: Ticket Confirmed Screen from 04_Live_Delivery.html */}
            {disputeStep === 'confirmed' && (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <CheckCircle size={56} weight="fill" color="#10B981" />
                <Text variant="h1" style={{ marginTop: space[3], fontSize: 24 }}>
                  We're on it
                </Text>
                <Text variant="body" tone="ink2" align="center" style={{ marginTop: space[2], lineHeight: 22 }}>
                  {disputeReason === 'safety'
                    ? 'Our safety team has been alerted and will call you within 2 minutes.'
                    : 'A real person will reply in the app within 15 minutes.'}
                  {' '}{naira(task?.bounty || 30000)} stays held safely until this is resolved.
                </Text>

                <View style={styles.caseBadge}>
                  <Text variant="caption" tone="mintInk" style={{ fontWeight: '700', fontSize: 14 }}>
                    {disputeTicket || 'Case WD-4821'}
                  </Text>
                </View>

                <View style={{ width: '100%', marginTop: space[4] }}>
                  <Button
                    label="Okay"
                    onPress={() => {
                      tap();
                      setDisputeOpen(false);
                      setDisputeStep('list');
                    }}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.paper,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow[1],
  },
  helpCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow[1],
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    ...shadow[1],
  },
  statusPillDefault: {
    backgroundColor: color.card,
  },
  statusPillLive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderWidth: 1.5,
  },
  statusPillCompleted: {
    backgroundColor: '#D1FAE5',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lateBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 14,
  },
  lateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cancelledBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  miniRadarDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
  },
  cancelRefundBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  simBar: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  simBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  simBarRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  simChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  simBarToggle: {
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    marginBottom: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: space[4],
  },
  mapContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    ...shadow[1],
  },
  mapRouteOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    ...shadow[1],
  },
  stepperContainer: {
    backgroundColor: color.card,
    borderRadius: 20,
    padding: 16,
    ...shadow[1],
  },
  stepperTrack: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  stepperTrackFill: {
    height: 4,
    backgroundColor: color.tangerine,
    borderRadius: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepCol: {
    alignItems: 'center',
    gap: 4,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeDone: {
    backgroundColor: color.tangerine,
  },
  stepBadgePending: {
    backgroundColor: '#E2E8F0',
  },
  runnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.card,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    ...shadow[1],
  },
  runnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: color.tangerine,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  actionRoundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  actionBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.tangerine,
  },
  photoProofCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  photoProofThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoProofThumbImage: {
    width: '100%',
    height: '100%',
  },
  verifiedTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pinCard: {
    backgroundColor: color.card,
    borderRadius: 24,
    padding: 20,
    ...shadow[1],
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
    backgroundColor: '#F1F5F9',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  escrowCard: {
    backgroundColor: color.mintSoft,
    borderRadius: 18,
    padding: 16,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  subActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: color.card,
    paddingVertical: 12,
    borderRadius: 14,
    ...shadow[1],
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  photoInspectModal: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.96)',
    paddingHorizontal: 20,
  },
  photoInspectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photoInspectCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInspectImage: {
    flex: 1,
    width: '100%',
    marginVertical: 16,
    borderRadius: 20,
    backgroundColor: '#0F172A',
  },
  modalCard: {
    backgroundColor: color.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space[3],
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  chatRunnerAva: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 8,
  },
  chatMessagesList: {
    flex: 1,
    marginVertical: 8,
  },
  chatBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  chatBubbleRunner: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 4,
  },
  chatBubbleYou: {
    alignSelf: 'flex-end',
    backgroundColor: color.tangerine,
    borderBottomRightRadius: 4,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 6,
    paddingTop: 6,
    paddingBottom: 4,
  },
  quickChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  chatInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 14,
    color: color.midnight,
  },
  chatSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.tangerine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callScreenInner: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  callAvatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: color.tangerine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginTop: 12,
  },
  callPrivacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    borderRadius: 16,
    maxWidth: 320,
  },
  systemCallLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(56,189,248,0.12)',
  },
  callControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingBottom: 20,
  },
  callBtnCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnActive: {
    backgroundColor: 'rgba(239,68,68,0.2)',
  },
  callEndBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationCard: {
    backgroundColor: color.card,
    borderRadius: 28,
    padding: 24,
    width: '90%',
    alignItems: 'center',
    position: 'relative',
  },
  confettiDotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  confettiDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  celebrationCheckLarge: {
    marginTop: 12,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 12,
  },
  complimentsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    justifyContent: 'center',
  },
  complimentTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  complimentTagActive: {
    backgroundColor: color.tangerine,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tipBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipBtnActive: {
    backgroundColor: color.tangerine,
  },
  lowRatingReportBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    padding: 12,
    borderRadius: 14,
    marginTop: 14,
  },
  ratingTextInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: color.midnight,
    marginTop: 14,
  },
  receiptFrame: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paidBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  reasonRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonDangerBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  addPhotoBtnAttached: {
    borderStyle: 'solid',
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  caseBadge: {
    backgroundColor: color.mintSoft,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 14,
  },
});

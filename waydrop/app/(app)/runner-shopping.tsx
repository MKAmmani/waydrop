import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ArrowRight,
  Bank,
  CaretDown,
  Camera,
  ChatCircleDots,
  Check,
  CheckCircle,
  Clock,
  CurrencyNgn,
  Flashlight,
  Lightning,
  Microphone,
  MicrophoneSlash,
  Money,
  PaperPlaneRight,
  Phone,
  PhoneDisconnect,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  SpeakerHigh,
  Storefront,
  X,
} from 'phosphor-react-native';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError, type BankOption, type CallSessionInfo, type Task, type TaskMessage } from '@/api';
import { Coin } from '@/components/art/Brand';
import { ReceiptProp, SeatViewProp } from '@/components/art/BuyProps';
import { useAblyTask } from '@/lib/ably';
import { naira } from '@/lib/buyCatalog';
import { preparePhotoForUpload } from '@/lib/preparePhoto';
import { tap, success as hapticSuccess, error as hapticError } from '@/lib/haptics';
import { useAgoraCall } from '@/lib/agoraCall';
import { color, radius, shadow, space } from '@/theme/tokens';
import { useCommunicationStore } from '@/store/communication';
import { useSession } from '@/store/session';

type RunnerStage = 'offer' | 'shopping' | 'pay' | 'crowd' | 'payout';

const STAGE_ORDER: Record<RunnerStage, number> = {
  offer: 0,
  shopping: 1,
  pay: 2,
  crowd: 3,
  payout: 4,
};

const stageForTaskStatus = (status?: string): RunnerStage | null => {
  if (status === 'completed') return 'payout';
  if (status === 'arrived' || status === 'in_transit' || status === 'bought') return 'crowd';
  if (status === 'shopping' || status === 'accepted') return 'shopping';
  if (status === 'pending') return 'offer';
  return null;
};

export default function RunnerShoppingScreen() {
  const { id, initialStage, stage: queryStage } = useLocalSearchParams<{ id?: string; initialStage?: RunnerStage; stage?: RunnerStage }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const requestedStage = initialStage || (queryStage as RunnerStage | undefined);
  const [stage, setStage] = useState<RunnerStage>(requestedStage || 'shopping');
  const stageInitializedRef = useRef(Boolean(requestedStage));
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [offerTimer, setOfferTimer] = useState<number>(25);
  const [task, setTask] = useState<Task | null>(null);
  const [accepting, setAccepting] = useState(false);

  // Shopping list state
  const [items, setItems] = useState<
    {
      id: string;
      name: string;
      qty: number;
      est: number;
      got: boolean;
      det: string;
      photo: boolean;
      photo_url: string | null;
    }[]
  >([]);
  const [gotState, setGotState] = useState<Record<string, number>>({});
  const [totalBudget, setTotalBudget] = useState(0);

  // Modals inside shopping
  const [askPriceOpen, setAskPriceOpen] = useState(false);
  const [realPriceInput, setRealPriceInput] = useState('350');
  const [priceTagPhoto, setPriceTagPhoto] = useState(false);

  // Pay seller state
  const [payTab, setPayTab] = useState<'transfer' | 'cash'>('transfer');
  const [acctNumber, setAcctNumber] = useState('');
  const [bankQuery, setBankQuery] = useState('');
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankOption | null>(null);
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState<string | null>(null);
  const [resolvedName, setResolvedName] = useState('');
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState<string | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [payingState, setPayingState] = useState<'idle' | 'processing' | 'success'>('idle');
  const resolveRequestRef = useRef(0);

  // Find in crowd state
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [deliveryPhotoUri, setDeliveryPhotoUri] = useState<string | null>(null);
  const [deliveryPhotoBusy, setDeliveryPhotoBusy] = useState(false);
  const deliveryPhoto = deliveryPhotoUri || task?.dropoff_photo_url || null;

  // Payout roll-up animation numbers
  const [payAmtDisplay, setPayAmtDisplay] = useState(0);
  const [refAmtDisplay, setRefAmtDisplay] = useState(0);
  const [totAmtDisplay, setTotAmtDisplay] = useState(0);
  const payoutInitRef = useRef(false);

  // In-app Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [inputText, setInputText] = useState('');

  // Masked In-app Call state
  const [callOpen, setCallOpen] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callSession, setCallSession] = useState<CallSessionInfo | null>(null);
  const callIntervalRef = useRef<any>(null);
  const fetchTaskInFlightRef = useRef(false);
  const sessionMe = useSession((s) => s.me);
  const curTaskId = id || task?.id;
  const unreadMessageCount = useCommunicationStore((state) => (
    curTaskId ? state.unreadMessagesByTask[curTaskId] ?? 0 : 0
  ));
  const markMessagesRead = useCommunicationStore((state) => state.markMessagesRead);
  const incrementMessage = useCommunicationStore((state) => state.incrementMessage);
  const receiveCall = useCommunicationStore((state) => state.receiveCall);
  const { status: agoraStatus, error: agoraError, setMuted: setAgoraMuted, setSpeaker: setAgoraSpeaker } = useAgoraCall({
    visible: callOpen,
    taskId: curTaskId,
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

  const isBuyErrand = task?.type === 'buy' || ((task?.budget_kobo ?? 0) > 0);

  const syncStageFromTask = (status?: string) => {
    if (requestedStage) return;

    const nextStage = stageForTaskStatus(status);
    if (!nextStage) return;

    if (!stageInitializedRef.current) {
      stageInitializedRef.current = true;
      setStage(nextStage);
      return;
    }

    setStage((prev) => (
      STAGE_ORDER[nextStage] > STAGE_ORDER[prev] ? nextStage : prev
    ));
  };

  // Sync real task data
  const fetchRealTask = async () => {
    if (fetchTaskInFlightRef.current) return;
    fetchTaskInFlightRef.current = true;
    let targetId = id;
    if (!targetId) {
      try {
        const avail = await api.listAvailableTasks();
        if (avail.tasks && avail.tasks.length > 0) {
          targetId = avail.tasks[0].id;
        }
      } catch {}
    }

    try {
      if (!targetId) {
        setLoading(false);
        setLoadError('No errand was selected.');
        return;
      }

      const t = await api.getTask(targetId);
      if (!t) {
        setLoading(false);
        return;
      }
      setTask(t);
      setLoadError(null);
      setLoading(false);
      const buyMode = t.type === 'buy' || ((t.budget_kobo ?? 0) > 0);

      if (t.items && t.items.length > 0) {
        setItems(
          t.items.map((it, idx) => ({
            id: String(idx + 1),
            name: it.name,
            qty: it.qty,
            est: it.est ?? 0,
            got: !!it.got,
            det: it.det ?? '',
            photo: !!it.photo,
            photo_url: it.photo_url ?? null,
          }))
        );
        const g: Record<string, number> = {};
        t.items.forEach((it, idx) => {
          if (it.got) {
            g[String(idx + 1)] = it.real_price ? Math.round(it.real_price / 100) : it.qty * (it.est ?? 0);
          }
        });
        setGotState(g);
      } else if (t.item) {
        setItems((prev) => {
          if (prev.length > 0) return prev;
          return [
            {
              id: '1',
              name: t.item,
              qty: 1,
              est: buyMode ? Math.round((t.budget_kobo || 0) / 100) : 0,
              got: false,
              det: t.note || '',
              photo: false,
              photo_url: null,
            },
          ];
        });
      }

      if (t.budget_kobo) {
        setTotalBudget(Math.round(t.budget_kobo / 100));
      } else {
        setTotalBudget(0);
      }

      syncStageFromTask(t.status);
    } catch (error: any) {
      if (!task) {
        setLoadError(error?.message || 'Could not load this errand from Waydrop.');
      }
      setLoading(false);
    } finally {
      fetchTaskInFlightRef.current = false;
    }
  };

  useEffect(() => {
    fetchRealTask();
    const interval = setInterval(fetchRealTask, 5000);
    return () => clearInterval(interval);
  }, [id, stage]);

  // Opening an already-completed errand skips the PIN animation, so populate the payout figures
  // from the task itself instead of leaving the roll-up counters at ₦0.
  useEffect(() => {
    if (stage !== 'payout' || !task || payoutInitRef.current) return;

    payoutInitRef.current = true;
    const grossKobo = task.bounty ?? 0;
    const platformFeeKobo = task.platform_fee || Math.round(grossKobo * 0.10);
    const earnedKobo = task.runner_payout_kobo ?? Math.max(0, grossKobo - platformFeeKobo);
    const cashKobo = task.cash_purchase?.amount_kobo ?? 0;

    setPayAmtDisplay(Math.round(earnedKobo / 100));
    setRefAmtDisplay(Math.round(cashKobo / 100));
    setTotAmtDisplay(Math.round((earnedKobo + cashKobo) / 100));
  }, [stage, task]);

  // Load chat messages
  useEffect(() => {
    if (!curTaskId) return;
    api.getTaskMessages(curTaskId).then((res) => {
      if (res && res.messages) {
        setMessages(res.messages);
      }
    }).catch(() => {});
  }, [curTaskId, chatOpen]);

  useEffect(() => {
    if (chatOpen && curTaskId) markMessagesRead(curTaskId);
  }, [chatOpen, curTaskId, unreadMessageCount, markMessagesRead]);

  // Masked call timer effect
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

  // Real-time Ably updates
  useAblyTask(curTaskId, (eventName, data) => {
    if (eventName === 'task.updated') {
      if (data?.status === 'completed') setStage('payout');
      else if (data?.status === 'arrived' || data?.status === 'in_transit') setStage('crowd');
      else if (data?.status === 'bought' && (stage === 'offer' || stage === 'shopping' || stage === 'pay')) {
        setStage('crowd');
      }
      fetchRealTask();
    } else if (eventName === 'task.message' && data) {
      const isIncoming = data.sender_id
        ? data.sender_id !== sessionMe?.id
        : !data.is_runner;
      if (isIncoming && !chatOpen && curTaskId) incrementMessage(curTaskId, data.id);

      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    } else if (eventName === 'ask.answered') {
      toast.show(`${requesterName} replied to your price inquiry.`);
      fetchRealTask();
    } else if (eventName === 'beacon.toggled') {
      if (data?.beacon_active) {
        toast.show(`${requesterName}'s screen beacon is flashing now!`);
      }
    } else if (eventName === 'call.initiated' && data?.receiver_id === sessionMe?.id) {
      receiveCall(data);
    } else if (eventName === 'call.ended' && data?.task_id === curTaskId) {
      setCallOpen(false);
      setCallSession(null);
    }
  });

  const handleStartCall = async () => {
    tap();
    if (!curTaskId) return;

    try {
      const info = await api.callRunner(curTaskId);
      setCallSession(info);
      setCallOpen(true);
      toast.show(`Calling ${requesterName}...`);
    } catch (error: any) {
      toast.show(error?.message || 'Calls are unavailable until the errand is accepted.');
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const cleanText = text.replace(/[\s\-_.,*#:\/]/g, '');
    if (task?.pin && cleanText.includes(task.pin)) {
      hapticError();
      toast.show("Don't send the Handshake PIN in chat. Complete delivery in person.");
      return;
    }

    tap();
    setInputText('');
    const senderName = sessionMe?.first_name || task?.runner?.first_name || 'You';
    const temporaryId = 'msg-' + Date.now();
    const tempMsg: TaskMessage = {
      id: temporaryId,
      task_id: curTaskId || '',
      sender_name: senderName,
      text,
      is_runner: true,
      created_at: Date.now(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    if (curTaskId) {
      try {
        const sent = await api.sendTaskMessage(curTaskId, text, senderName, true);
        setMessages((prev) => prev.map((message) => (message.id === temporaryId ? sent : message)));
      } catch (error: any) {
        setMessages((prev) => prev.filter((message) => message.id !== temporaryId));
        toast.show(error?.message || 'Message could not be sent.');
      }
    }
  };

  const handleEndCall = () => {
    tap();
    if (curTaskId && callSession?.call_session_id) {
      void api.endCall(curTaskId, callSession.call_session_id).catch(() => {});
    }
    setCallOpen(false);
    setCallSession(null);
    setCallTimer(0);
    if (callIntervalRef.current) clearInterval(callIntervalRef.current);
    toast.show('Call ended');
  };

  const handleItemCollected = async () => {
    tap();
    hapticSuccess();
    const nextGot = { ...gotState, '1': 0 };
    setGotState(nextGot);
    setItems((prev) => prev.map((it) => ({ ...it, got: true })));

    if (!curTaskId) return;

    try {
      await api.pickupTask(curTaskId);
    } catch (error: any) {
      toast.show(error?.message || 'Could not confirm pickup. Try again.');
      return;
    }
    setStage('crowd');
    toast.show(`Item collected! Heading to ${dropoffName}.`);
  };

  const handleArrived = async () => {
    tap();
    hapticSuccess();
    if (!curTaskId) return;

    try {
      await api.arriveTask(curTaskId);
    } catch (error: any) {
      toast.show(error?.message || 'Could not update arrival. Try again.');
      return;
    }
    toast.show(`Arrived at ${dropoffName}! Meet ${requesterName} for handover.`);
    fetchRealTask();
  };

  // Offer timer countdown
  useEffect(() => {
    let t: any;
    if (stage === 'offer') {
      t = setInterval(() => {
        setOfferTimer((prev) => {
          if (prev <= 1) {
            clearInterval(t);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(t);
  }, [stage]);

  // Load the complete combined bank directory once when the payment step opens.
  // Filtering is local so every keystroke does not call Squad/Zainpay again.
  useEffect(() => {
    if (stage !== 'pay') return;

    let active = true;
    setBanksLoading(true);
    setBanksError(null);

    api.listBanks().then((result) => {
      if (active) {
        setBankOptions(result.banks);
      }
    }).catch((error) => {
      if (active) {
        setBankOptions([]);
        setBanksError(error instanceof ApiError ? error.message : 'Could not load banks.');
      }
    }).finally(() => {
      if (active) {
        setBanksLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [stage]);

  const grossFeeKobo = task?.bounty ?? 0;
  const feeKobo = task?.runner_payout_kobo
    ?? Math.max(0, grossFeeKobo - (task?.platform_fee || Math.round(grossFeeKobo * 0.10)));
  const requesterName = task?.requester ? (task.requester.first_name || task.requester.name || 'Requester') : 'Requester';
  const requesterFullName = task?.requester ? (task.requester.name || `${task.requester.first_name || ''} ${task.requester.last_name || ''}`.trim() || 'Requester') : 'Requester';
  const requesterInitials = task?.requester
    ? `${(task.requester.first_name || 'C')[0]}${(task.requester.last_name || '')[0] || ''}`.toUpperCase()
    : 'C';
  const pickupName = task?.pickup?.name || 'Pickup location';
  const rawDropoffName = task?.dropoff?.name || 'Drop-off location';
  const dropoffName = /^(?:my current location|your location|current location)$/i.test(rawDropoffName)
    ? `${requesterName}'s location`
    : rawDropoffName;
  const errandSummary = task?.items && task.items.length > 0
    ? task.items.map((i) => `${i.name} × ${i.qty}`).join(', ')
    : (task?.item || 'Items to buy');

  // Account name validation is handled by Zainpay for every selected bank.
  const resolveSellerAccount = async (account: string, bank: BankOption) => {
    const requestId = ++resolveRequestRef.current;
    setResolving(true);
    setResolveError(null);

    try {
      const result = await api.resolveBankAccount(account, bank.nipCode);
      if (requestId === resolveRequestRef.current) {
        setResolvedName(result.account_name);
      }
    } catch (error) {
      if (requestId === resolveRequestRef.current) {
        setResolvedName('');
        setResolveError(error instanceof ApiError ? error.message : 'Could not verify that account.');
      }
    } finally {
      if (requestId === resolveRequestRef.current) {
        setResolving(false);
      }
    }
  };

  const handleAcctInput = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setAcctNumber(cleaned);
    resolveRequestRef.current += 1;
    setResolvedName('');
    setResolveError(null);
    setResolving(false);

    if (cleaned.length === 10 && selectedBank) {
      resolveSellerAccount(cleaned, selectedBank);
    }
  };

  const handleBankSelect = (bank: BankOption) => {
    tap();
    setSelectedBank(bank);
    setBankQuery('');
    setBankDropdownOpen(false);
    setResolvedName('');
    setResolveError(null);

    if (acctNumber.length === 10) {
      resolveSellerAccount(acctNumber, bank);
    }
  };


  const handleBankQueryChange = (value: string) => {
    setBankQuery(value);
    setBankDropdownOpen(true);
    if (selectedBank && value !== selectedBank.name) {
      setSelectedBank(null);
      setResolvedName('');
      setResolveError(null);
      resolveRequestRef.current += 1;
      setResolving(false);
    }
  };

  const visibleBankOptions = bankOptions.filter((bank) => {
    const query = bankQuery.trim().toLowerCase();
    return query === '' || bank.name.toLowerCase().includes(query);
  });

  const toggleItemGot = (itemId: string, cost: number) => {
    tap();
    const isGot = !gotState[itemId];
    const nextGot = { ...gotState };
    if (isGot) {
      nextGot[itemId] = cost;
    } else {
      delete nextGot[itemId];
    }
    setGotState(nextGot);

    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, got: isGot } : it))
    );

    const itemIndex = parseInt(itemId, 10) - 1;
    if (curTaskId && itemIndex >= 0) {
      api.updateShoppingItem(curTaskId, itemIndex, isGot, cost * 100).catch(() => {});
    }
  };

  const handleSendPriceAsk = async () => {
    tap();
    setAskPriceOpen(false);
    const newPrice = parseInt(realPriceInput.replace(/\D/g, ''), 10) || 350;
    const spentNaira = Object.values(gotState).reduce((acc, value) => acc + value, 0);
    const remainingBudget = Math.max(0, totalBudget - spentNaira);
    const diff = Math.max(0, newPrice - remainingBudget);
    if (curTaskId) {
      try {
        await api.createAsk(curTaskId, {
          type: 'price',
          item_name: items[0]?.name || 'Item',
          diff_kobo: diff * 100,
          new_price_kobo: newPrice * 100,
        });
        toast.show(`Sent price ask to ${requesterName}. You can keep shopping.`);
      } catch {
        toast.show('Could not send price request.');
      }
    } else {
      toast.show(`Sent to ${requesterName}. You can keep shopping.`);
    }
  };

  const handleReceiptPhoto = async () => {
    if (receiptBusy) return;

    if (receiptPhotoUrl) {
      tap();
      setReceiptPhotoUrl(null);
      toast.show('Receipt photo removed.');
      return;
    }

    tap();
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toast.show('Camera access is off. Enable it in Settings to add the receipt.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    setReceiptBusy(true);
    try {
      const preparedUri = await preparePhotoForUpload(result.assets[0].uri);
      const uploaded = await api.uploadErrandPhoto(preparedUri);
      setReceiptPhotoUrl(uploaded.url);
      hapticSuccess();
      toast.show('Receipt photo attached.');
    } catch (error) {
      hapticError();
      toast.show(error instanceof ApiError ? error.message : 'Could not upload receipt. Try again.');
    } finally {
      setReceiptBusy(false);
    }
  };

  const handleExecutePayment = async () => {
    tap();
    if (!receiptPhotoUrl || payAmount <= 0) return;

    if (payTab === 'cash') {
      if (curTaskId) {
        try {
          await api.submitCashPurchase(curTaskId, {
            amount_kobo: payAmount * 100,
            receipt_photo: receiptPhotoUrl,
          });
        } catch (e) {
          toast.show(e instanceof ApiError ? e.message : 'Could not log cash.');
          return;
        }
      }
      toast.show(`${naira(payAmount)} cash logged. It comes back to you at handover.`);
      setStage('crowd');
      return;
    }

    if (!selectedBank || !resolvedName) return;

    setPayingState('processing');
    if (curTaskId) {
      try {
        await api.submitVendorPayment(curTaskId, {
          bank: selectedBank.name,
          bank_code: selectedBank.nipCode,
          account: acctNumber,
          account_name: resolvedName,
          amount_kobo: payAmount * 100,
          receipt_photo: receiptPhotoUrl,
        });
        setPayingState('success');
        hapticSuccess();
        setTimeout(() => {
          setPayingState('idle');
          setStage('crowd');
        }, 1200);
      } catch (e) {
        setPayingState('idle');
        toast.show(e instanceof ApiError ? e.message : 'Vendor payment failed.');
      }
    } else {
      setTimeout(() => {
        setPayingState('success');
        hapticSuccess();
        setTimeout(() => {
          setPayingState('idle');
          setStage('crowd');
        }, 1200);
      }, 1000);
    }
  };

  const captureDeliveryPhoto = async () => {
    tap();
    if (!curTaskId || deliveryPhotoBusy) return;

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toast.show('Camera access is off. Enable it in Settings to capture proof.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setDeliveryPhotoUri(uri);
    setDeliveryPhotoBusy(true);

    try {
      const res = await api.uploadDeliveryPhoto(curTaskId, uri);
      setTask((prev) => (prev ? { ...prev, dropoff_photo_url: res.dropoff_photo_url } : prev));
      hapticSuccess();
      toast.show('Delivery photo saved.');
    } catch (e) {
      setDeliveryPhotoUri(null);
      hapticError();
      toast.show(e instanceof ApiError ? e.message : 'Could not save the delivery photo.');
    } finally {
      setDeliveryPhotoBusy(false);
    }
  };

  const handleVerifyPin = async () => {
    tap();
    if (verifyingPin) return;
    const enteredPin = pinCode.trim();
    if (!enteredPin) {
      toast.show('Please enter the 4-digit PIN');
      return;
    }

    if (curTaskId) {
      setVerifyingPin(true);
      try {
        const res = await api.verifyPinAndPayout(curTaskId, enteredPin);
        setPinModalOpen(false);
        hapticSuccess();
        toast.show('Handover PIN accepted!');

        const earnNaira = res.payout_kobo ? Math.round(res.payout_kobo / 100) : Math.round(feeKobo / 100);
        const refNaira = res.cash_refund_kobo ? Math.round(res.cash_refund_kobo / 100) : (payTab === 'cash' ? payAmount : 0);
        const totalNaira = earnNaira + refNaira;

        payoutInitRef.current = true;
        setStage('payout');
        let step = 0;
        const interval = setInterval(() => {
          step++;
          const pct = Math.min(1, step / 15);
          setPayAmtDisplay(Math.round(earnNaira * pct));
          setRefAmtDisplay(Math.round(refNaira * pct));
          setTotAmtDisplay(Math.round(totalNaira * pct));
          if (pct >= 1) clearInterval(interval);
        }, 40);
      } catch (e) {
        hapticError();
        toast.show(e instanceof ApiError ? e.message : 'Incorrect Handshake PIN. Ask the customer.');
      } finally {
        setVerifyingPin(false);
      }
    } else {
      setPinModalOpen(false);
      hapticSuccess();
      payoutInitRef.current = true;
      setStage('payout');
      setPayAmtDisplay(Math.round(feeKobo / 100));
      setRefAmtDisplay(payAmount);
      setTotAmtDisplay(Math.round(feeKobo / 100) + payAmount);
    }
  };

  const spentSoFar = Object.values(gotState).reduce((acc, v) => acc + v, 0);

  if (loading && !task) {
    return (
      <View style={[s.root, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={color.tangerine} />
        <Text variant="caption" tone="ink3" style={{ marginTop: space[3], fontFamily: 'DMSans_600SemiBold' }}>
          Loading errand details…
        </Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom, justifyContent: 'center', paddingHorizontal: space[5] }]}>
        {toast.node}
        <View style={s.card}>
          <Text variant="h2" style={{ fontSize: 22 }}>Errand unavailable</Text>
          <Text variant="body" tone="ink2" style={{ marginTop: space[2], lineHeight: 22 }}>
            {loadError || 'This errand could not be loaded from the server.'}
          </Text>
          <View style={{ marginTop: space[4] }}>
            <Button label="Back to my route" onPress={() => router.replace('/home')} />
          </View>
        </View>
      </View>
    );
  }

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
          {stage === 'offer'
            ? (isBuyErrand ? 'Errand Radar' : 'Delivery Offer')
            : stage === 'shopping'
            ? (isBuyErrand ? 'Shopping Checklist' : 'Pickup Checklist')
            : stage === 'pay'
            ? 'Pay the seller'
            : stage === 'crowd'
            ? 'Delivery Handover'
            : 'Earnings Summary'}
        </Text>
        {stage !== 'offer' && stage !== 'payout' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <PressableScale
              style={s.topNavBtn}
              onPress={handleStartCall}
              accessibilityLabel="Call requester"
            >
              <Phone size={18} weight="bold" color={color.midnight} />
            </PressableScale>
            <PressableScale
              style={s.topNavBtn}
              onPress={() => {
                tap();
                setChatOpen(true);
              }}
              accessibilityLabel="Message requester"
            >
              <ChatCircleDots size={18} weight="bold" color={color.midnight} />
              {unreadMessageCount > 0 && (
                <View style={s.messageBadge}>
                  <Text variant="caption" style={s.messageBadgeText}>
                    {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                  </Text>
                </View>
              )}
            </PressableScale>
          </View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─────────────────────────────────────────────────────────────
           STAGE 1: BUY ERRAND OFFER PING (SCREEN 10)
        ───────────────────────────────────────────────────────────── */}
        {stage === 'offer' && (
          <View style={s.offerWrap}>
            <View style={s.card}>
              {/* Countdown bar */}
              <View style={s.offerTimerBar}>
                <View style={[s.offerTimerFill, { width: `${(offerTimer / 25) * 100}%` }]} />
              </View>

              <View style={s.offerHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {isBuyErrand ? (
                    <ShoppingCart size={18} weight="duotone" color={color.tangerine} />
                  ) : (
                    <Storefront size={18} weight="duotone" color={color.tangerine} />
                  )}
                  <Text variant="caption" tone="tangerine" style={{ fontFamily: 'DMSans_700Bold', marginLeft: 6 }}>
                    {isBuyErrand ? 'Buy errand on your route' : 'Package delivery on your route'}
                  </Text>
                </View>
                <Text variant="caption" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.roseInk }}>
                  {offerTimer}s
                </Text>
              </View>

              <View style={s.offerMainRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="h1" style={{ fontSize: 24, lineHeight: 28 }}>
                    {errandSummary}
                  </Text>
                </View>
                <View style={s.earnBadge}>
                  <Text variant="caption" tone="ink3">You earn</Text>
                  <Text variant="h2" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.mintInk }}>
                    {naira(feeKobo / 100)}
                  </Text>
                </View>
              </View>

              {/* Errand Route Facts */}
              <View style={s.factsCard}>
                <View style={s.factLine}>
                  <View style={s.pickupBullet} />
                  <View style={{ flex: 1, marginLeft: space[2] }}>
                    <Text variant="caption" tone="ink3">{isBuyErrand ? 'Buy from' : 'Pick up from'}</Text>
                    <Text variant="body" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                      {pickupName}
                    </Text>
                  </View>
                </View>

                <View style={[s.factLine, { marginTop: space[3] }]}>
                  <View style={s.dropBullet} />
                  <View style={{ flex: 1, marginLeft: space[2] }}>
                    <Text variant="caption" tone="ink3">Deliver to</Text>
                    <Text variant="body" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                      {dropoffName}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Meta Chips */}
              <View style={s.chipsRow}>
                {isBuyErrand ? (
                  <>
                    <View style={s.metaChip}>
                      <Text variant="caption" style={s.metaChipText}>🔒 {naira(totalBudget)} budget held</Text>
                    </View>
                    <View style={s.metaChip}>
                      <Text variant="caption" style={s.metaChipText}>🏦 Pay seller in app</Text>
                    </View>
                    <View style={s.metaChip}>
                      <Text variant="caption" style={s.metaChipText}>⏱️ +4 min</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={s.metaChip}>
                      <Text variant="caption" style={s.metaChipText}>📦 Direct pickup</Text>
                    </View>
                    <View style={s.metaChip}>
                      <Text variant="caption" style={s.metaChipText}>📍 On your route</Text>
                    </View>
                    <View style={s.metaChip}>
                      <Text variant="caption" style={s.metaChipText}>⏱️ +4 min</Text>
                    </View>
                  </>
                )}
              </View>

              {/* Swipe to accept button */}
              <View style={{ marginTop: space[4] }}>
                <Button
                  label="Swipe / Tap to accept"
                  onPress={async () => {
                    tap();
                    if (!curTaskId || accepting) return;

                    setAccepting(true);
                    try {
                      await api.acceptTask(curTaskId);
                      await api.progressTask(curTaskId, 'shopping');
                      hapticSuccess();
                      setStage('shopping');
                      toast.show(`Errand accepted. Head to ${pickupName}.`);
                    } catch (error: any) {
                      toast.show(error?.message || 'This errand is no longer available.');
                    } finally {
                      setAccepting(false);
                    }
                  }}
                  loading={accepting}
                />
              </View>

              <PressableScale
                style={{ alignItems: 'center', marginTop: space[3], paddingVertical: space[2] }}
                onPress={() => {
                  tap();
                  toast.show('Skipped. Skips never affect your rating.');
                  router.replace('/home');
                }}
              >
                <Text variant="caption" tone="ink3">
                  Skip this one
                </Text>
              </PressableScale>
            </View>
          </View>
        )}

        {/* ─────────────────────────────────────────────────────────────
           STAGE 2: SHOPPING CHECKLIST (SCREEN 11)
        ───────────────────────────────────────────────────────────── */}
        {stage === 'shopping' && (
          <View>
            <View style={s.card}>
              <View style={s.offerMainRow}>
                <View>
                  <Text variant="caption" tone="ink3">{isBuyErrand ? `Buying for ${requesterName}` : `Picking up for ${requesterName}`}</Text>
                  <Text variant="h1" style={{ fontSize: 24, lineHeight: 28, marginTop: 2 }}>
                    {isBuyErrand ? 'Shopping list' : 'Item checklist'}
                  </Text>
                </View>
                <View style={s.earnBadge}>
                  <Text variant="caption" tone="ink3">You earn</Text>
                  <Text variant="h2" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.mintInk }}>
                    {naira(feeKobo / 100)}
                  </Text>
                </View>
              </View>

              {/* Live Budget Meter (Only for buy errands) */}
              {isBuyErrand ? (
                <>
                  <View style={s.budgetHeader}>
                    <Text variant="caption" tone="ink3" style={{ fontWeight: '600' }}>
                      Budget
                    </Text>
                    <Text variant="caption" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                      {naira(spentSoFar)} of {naira(totalBudget)} used
                    </Text>
                  </View>
                  <View style={s.progressBarTrack}>
                    <View style={[s.progressBarFill, { width: `${Math.min(100, (spentSoFar / (totalBudget || 1)) * 100)}%` }]} />
                  </View>
                </>
              ) : (
                <View style={[s.factsCard, { marginTop: space[3] }]}>
                  <View style={s.factLine}>
                    <View style={s.pickupBullet} />
                    <View style={{ flex: 1, marginLeft: space[2] }}>
                      <Text variant="caption" tone="ink3">Pick up at</Text>
                      <Text variant="body" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                        {pickupName}
                      </Text>
                    </View>
                  </View>
                  <View style={[s.factLine, { marginTop: space[3] }]}>
                    <View style={s.dropBullet} />
                    <View style={{ flex: 1, marginLeft: space[2] }}>
                      <Text variant="caption" tone="ink3">Deliver to</Text>
                      <Text variant="body" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                        {dropoffName}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Interactive checklist */}
              <View style={{ marginTop: space[4] }}>
                {items.map((it) => (
                  <View key={it.id} style={s.shopItemCard}>
                    <PressableScale
                      style={[s.chkBox, it.got && s.chkBoxActive]}
                      onPress={() => toggleItemGot(it.id, it.qty * (it.est || 0))}
                    >
                      {it.got && <Check size={16} weight="bold" color={color.white} />}
                    </PressableScale>

                    <View style={{ flex: 1, marginLeft: space[3] }}>
                      <Text
                        variant="body"
                        style={[
                          { fontFamily: 'DMSans_700Bold', color: color.midnight },
                          it.got && { textDecorationLine: 'line-through', color: color.ink4 },
                        ]}
                      >
                        {it.qty} × {it.name}
                      </Text>
                      <Text variant="caption" tone="ink3" style={{ marginTop: 2, lineHeight: 18 }}>
                        {isBuyErrand
                          ? `Expected about ${naira(it.est || 300)} each. ${it.det || 'Similar brand is fine.'}`
                          : `Pick up from ${pickupName}. ${it.det ? `Note: "${it.det}"` : ''}`}
                      </Text>

                      {it.photo_url && (
                        <Image source={{ uri: it.photo_url }} style={s.shopItemPhoto} contentFit="cover" />
                      )}

                      {/* Action buttons (Only for buy errands) */}
                      {isBuyErrand && (
                        <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[2] }}>
                          <PressableScale
                            style={s.itemActionBtn}
                            onPress={() => setAskPriceOpen(true)}
                          >
                            <Text variant="caption" style={{ fontFamily: 'DMSans_600SemiBold', color: color.ink2 }}>
                              Costs more
                            </Text>
                          </PressableScale>

                          <PressableScale
                            style={s.itemActionBtn}
                            onPress={() => toast.show(`${requesterName} said a similar brand is fine. No need to ask, just buy it.`)}
                          >
                            <Text variant="caption" style={{ fontFamily: 'DMSans_600SemiBold', color: color.ink2 }}>
                              Not available
                            </Text>
                          </PressableScale>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {/* Nearby shops list */}
              <Text variant="caption" tone="ink3" style={{ fontWeight: '700', marginTop: space[4], textTransform: 'uppercase' }}>
                {isBuyErrand ? 'Shops on your way' : 'Pickup location'}
              </Text>
              <View style={s.shopsRow}>
                <View style={s.shopPill}>
                  <Storefront size={16} weight="duotone" color={color.tangerine} />
                  <Text variant="caption" style={{ fontFamily: 'DMSans_600SemiBold', marginLeft: 4 }}>
                    {pickupName}
                  </Text>
                </View>
              </View>

              {/* Pay the seller button (buy) or Collected button (move) */}
              <View style={{ marginTop: space[4] }}>
                {isBuyErrand ? (
                  <Button
                    label="Pay the seller"
                    onPress={() => {
                      tap();
                      setStage('pay');
                    }}
                    disabled={Object.keys(gotState).length === 0}
                  />
                ) : (
                  <Button
                    label={`Item collected → Head to ${dropoffName}`}
                    onPress={handleItemCollected}
                  />
                )}
              </View>

              <Text variant="caption" tone="ink3" align="center" style={{ marginTop: space[2] }}>
                {isBuyErrand
                  ? '🛡️ Never pay from your own account. Use the button above.'
                  : `📦 Pick up ${errandSummary} from ${pickupName}, then head to ${dropoffName}.`}
              </Text>
            </View>
          </View>
        )}

        {/* ─────────────────────────────────────────────────────────────
           STAGE 3: PAY THE SELLER (SCREEN 12 & 13)
        ───────────────────────────────────────────────────────────── */}
        {stage === 'pay' && (
          <View>
            <View style={s.kindSwitch}>
              <PressableScale
                style={[s.kindBtn, payTab === 'transfer' && s.kindBtnActive]}
                onPress={() => {
                  tap();
                  setPayTab('transfer');
                }}
              >
                <Bank size={16} weight="duotone" color={payTab === 'transfer' ? color.midnight : color.ink3} />
                <Text variant="label" style={[s.kindBtnText, payTab === 'transfer' && s.kindBtnTextActive]}>
                  Transfer to seller
                </Text>
              </PressableScale>

              <PressableScale
                style={[s.kindBtn, payTab === 'cash' && s.kindBtnActive]}
                onPress={() => {
                  tap();
                  setPayTab('cash');
                }}
              >
                <Money size={16} weight="duotone" color={payTab === 'cash' ? color.midnight : color.ink3} />
                <Text variant="label" style={[s.kindBtnText, payTab === 'cash' && s.kindBtnTextActive]}>
                  I paid cash
                </Text>
              </PressableScale>
            </View>

            <View style={[s.card, { marginTop: space[3] }]}>
              {payTab === 'transfer' ? (
                <View>
                  <Text variant="body" tone="ink2" style={{ lineHeight: 22 }}>
                    Ask the seller for their account. Waydrop pays them straight from {requesterName}'s budget.
                  </Text>

                  {/* Searchable bank dropdown populated from Squad and Zainpay */}
                  <Text variant="caption" tone="ink2" style={{ fontWeight: '700', marginTop: space[3] }}>
                    Seller's bank
                  </Text>

                  {!selectedBank ? (
                    <View style={s.bankDropdownField}>
                      <TextInput
                        value={bankQuery}
                        onChangeText={handleBankQueryChange}
                        onFocus={() => setBankDropdownOpen(true)}
                        placeholder={banksLoading ? 'Loading banks…' : 'Search or select a bank'}
                        placeholderTextColor={color.ink4}
                        autoCorrect={false}
                        style={[s.fieldInput, s.bankDropdownInput]}
                      />
                      <TouchableOpacity
                        style={s.bankDropdownButton}
                        onPress={() => setBankDropdownOpen((open) => !open)}
                        accessibilityLabel="Open seller bank list"
                      >
                        <CaretDown size={18} weight="bold" color={color.ink2} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={s.selectedBank}
                      onPress={() => {
                        setSelectedBank(null);
                        setBankQuery('');
                        setBankDropdownOpen(true);
                        setResolvedName('');
                        setResolveError(null);
                        resolveRequestRef.current += 1;
                        setResolving(false);
                      }}
                      accessibilityLabel="Change seller bank"
                    >
                      <Bank size={16} weight="fill" color={color.tangerineInk} />
                      <Text variant="label" style={{ color: color.tangerineInk, marginLeft: space[2], flex: 1 }}>
                        {selectedBank.name}
                      </Text>
                      <Text variant="caption" style={{ color: color.tangerineInk, fontWeight: '700' }}>
                        Change
                      </Text>
                    </TouchableOpacity>
                  )}

                  {banksLoading && (
                    <View style={s.resolveBox}>
                      <ActivityIndicator size="small" color={color.tangerine} />
                      <Text variant="caption" tone="ink3" style={{ marginLeft: space[2] }}>
                        Searching banks…
                      </Text>
                    </View>
                  )}

                  {banksError && !banksLoading && (
                    <Text variant="caption" style={{ color: color.rose, marginTop: space[2] }}>
                      {banksError}
                    </Text>
                  )}

                  {!selectedBank && bankDropdownOpen && !banksLoading && !banksError && visibleBankOptions.length === 0 && (
                    <Text variant="caption" tone="ink3" style={{ marginTop: space[2] }}>
                      No bank matches that name.
                    </Text>
                  )}

                  {!selectedBank && bankDropdownOpen && visibleBankOptions.length > 0 && (
                    <View style={s.bankResults}>
                      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                        {visibleBankOptions.map((bank) => (
                          <PressableScale
                          key={`${bank.provider}:${bank.code}`}
                          style={s.bankResult}
                          onPress={() => handleBankSelect(bank)}
                          >
                            <Text variant="label" style={{ flex: 1 }}>{bank.name}</Text>
                          </PressableScale>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Account Input */}
                  <Text variant="caption" tone="ink2" style={{ fontWeight: '700', marginTop: space[3] }}>
                    Seller's account number
                  </Text>
                  <TextInput
                    value={acctNumber}
                    onChangeText={handleAcctInput}
                    keyboardType="numeric"
                    maxLength={10}
                    editable={Boolean(selectedBank)}
                    placeholder={selectedBank ? '10 digits' : 'Select the seller bank first'}
                    placeholderTextColor={color.ink4}
                    style={[s.fieldInput, !selectedBank && s.fieldInputDisabled]}
                  />
                  {!selectedBank && (
                    <Text variant="caption" tone="ink3" style={{ marginTop: space[2] }}>
                      Select the bank before entering the account number.
                    </Text>
                  )}

                  {/* Account resolution status */}
                  {resolving && (
                    <View style={s.resolveBox}>
                      <ActivityIndicator size="small" color={color.tangerine} />
                      <Text variant="caption" tone="ink3" style={{ marginLeft: space[2] }}>
                        Checking account name…
                      </Text>
                    </View>
                  )}
                  {resolveError && !resolving && (
                    <Text variant="caption" style={{ color: color.rose, marginTop: space[2] }}>
                      {resolveError}
                    </Text>
                  )}
                  {resolvedName !== '' && !resolving && (
                    <View style={s.resolvedBox}>
                      <CheckCircle size={18} weight="fill" color={color.mint} />
                      <Text variant="label" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.mintInk, marginLeft: space[2] }}>
                        {resolvedName}
                      </Text>
                    </View>
                  )}

                  {/* Amount input */}
                  <Text variant="caption" tone="ink2" style={{ fontWeight: '700', marginTop: space[3] }}>
                    Amount
                  </Text>
                  <View style={s.amtInputWrap}>
                    <Text variant="h3" style={{ color: color.ink3 }}>₦</Text>
                    <TextInput
                      value={payAmount > 0 ? payAmount.toString() : ''}
                      placeholder={totalBudget.toString()}
                      placeholderTextColor={color.ink4}
                      onChangeText={(val) => setPayAmount(parseInt(val.replace(/\D/g, ''), 10) || 0)}
                      keyboardType="numeric"
                      style={s.amtInput}
                    />
                  </View>
                  <Text variant="caption" tone="ink3" style={{ marginTop: 4 }}>
                    Up to {naira(totalBudget)}. Anything left goes back to {requesterName}.
                  </Text>
                </View>
              ) : (
                <View>
                  <Text variant="body" tone="ink2" style={{ lineHeight: 22 }}>
                    Only if the seller won't take a transfer, like hawkers in campus walkways.
                  </Text>

                  <Text variant="caption" tone="ink2" style={{ fontWeight: '700', marginTop: space[3] }}>
                    Cash you paid
                  </Text>
                  <View style={s.amtInputWrap}>
                    <Text variant="h3" style={{ color: color.ink3 }}>₦</Text>
                    <TextInput
                      value={payAmount > 0 ? payAmount.toString() : ''}
                      placeholder={totalBudget.toString()}
                      placeholderTextColor={color.ink4}
                      onChangeText={(val) => setPayAmount(parseInt(val.replace(/\D/g, ''), 10) || 0)}
                      keyboardType="numeric"
                      style={s.amtInput}
                    />
                  </View>
                  <Text variant="caption" tone="ink3" style={{ marginTop: 4, lineHeight: 18 }}>
                    You get this back with your fee, the moment {requesterName} gives you the PIN. Cash is capped at ₦3,000 per errand.
                  </Text>
                </View>
              )}

              {/* Photo of receipt / items */}
              <PressableScale
                style={[s.rcptBtn, receiptPhotoUrl && s.rcptBtnActive]}
                onPress={handleReceiptPhoto}
              >
                {receiptBusy ? (
                  <ActivityIndicator size="small" color={color.mint} />
                ) : receiptPhotoUrl ? (
                  <Image source={{ uri: receiptPhotoUrl }} style={s.receiptThumb} contentFit="cover" />
                ) : (
                  <Camera size={18} weight="bold" color={color.ink2} />
                )}
                <Text variant="label" style={{ fontFamily: 'DMSans_600SemiBold', marginLeft: space[2], color: color.midnight, flex: 1 }}>
                  {receiptBusy
                    ? 'Uploading receipt…'
                    : receiptPhotoUrl
                      ? 'Receipt photo attached (tap to remove)'
                      : 'Photo of the receipt or items (required)'}
                </Text>
                {receiptPhotoUrl && !receiptBusy && (
                  <X size={16} weight="bold" color={color.ink3} />
                )}
              </PressableScale>

              {/* Payment CTA */}
              <View style={{ marginTop: space[4] }}>
                <Button
                  label={payTab === 'transfer' ? `Send ${naira(payAmount)} to seller` : `Log ${naira(payAmount)} cash`}
                  onPress={handleExecutePayment}
                  loading={payingState === 'processing'}
                  disabled={receiptBusy || !receiptPhotoUrl || payAmount <= 0 || (payTab === 'transfer' && (!selectedBank || !resolvedName))}
                />
              </View>
            </View>
          </View>
        )}

        {/* ─────────────────────────────────────────────────────────────
           STAGE 4: FIND IN THE CROWD (SCREEN 14)
        ───────────────────────────────────────────────────────────── */}
        {stage === 'crowd' && (
          <View>
            <View style={s.card}>
              <View style={s.offerMainRow}>
                <View>
                  <Text variant="caption" tone="ink3">Delivering to {requesterName}</Text>
                  <Text variant="h1" style={{ fontSize: 24, lineHeight: 28, marginTop: 2 }}>
                    {dropoffName}
                  </Text>
                </View>
                <View style={s.distBadge}>
                  <Text variant="h3" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.tangerine }}>
                    {task?.status === 'arrived' ? 'Here' : 'Near'}
                  </Text>
                  <Text variant="caption" tone="ink3" style={{ fontSize: 10 }}>
                    {task?.status === 'arrived' ? 'at location' : 'live location'}
                  </Text>
                </View>
              </View>

              {/* Seat view info card */}
              <View style={s.seatCardRow}>
                <SeatViewProp size={64} />
                <View style={{ flex: 1, marginLeft: space[3] }}>
                  <Text variant="body" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                    {dropoffName}
                  </Text>
                  <Text variant="caption" tone="ink2" style={{ marginTop: 2, fontStyle: 'italic', lineHeight: 18 }}>
                    {task?.note ? `"${task.note}"` : 'Meet at delivery spot'}
                  </Text>
                </View>
              </View>

              {/* Delivery proof photo */}
              <PressableScale
                style={[s.deliveryPhotoRow, deliveryPhoto && s.deliveryPhotoRowActive]}
                onPress={captureDeliveryPhoto}
                disabled={deliveryPhotoBusy}
                accessibilityLabel="Capture delivery photo"
              >
                {deliveryPhoto ? (
                  <Image source={{ uri: deliveryPhoto }} style={s.deliveryPhotoThumb} contentFit="cover" />
                ) : (
                  <View style={s.deliveryPhotoEmpty}>
                    <Camera size={24} weight="duotone" color={color.tangerine} />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: space[3] }}>
                  <Text variant="body" style={{ fontFamily: 'DMSans_700Bold', color: color.midnight }}>
                    {deliveryPhoto ? 'Delivery photo attached' : 'Capture item photo'}
                  </Text>
                  <Text variant="caption" tone="ink2" style={{ marginTop: 2, lineHeight: 18 }}>
                    {deliveryPhoto
                      ? 'Tap to retake before entering the PIN.'
                      : 'Photograph the item before handover as proof.'}
                  </Text>
                </View>
                {deliveryPhotoBusy ? (
                  <ActivityIndicator size="small" color={color.tangerine} />
                ) : (
                  <Camera size={18} weight="bold" color={color.tangerine} />
                )}
              </PressableScale>

              {/* Arrived button if en route */}
              {task?.status !== 'arrived' && (
                <View style={{ marginTop: space[3] }}>
                  <Button
                    label={`I have arrived at ${dropoffName}`}
                    variant="secondary"
                    onPress={handleArrived}
                  />
                </View>
              )}

              {/* Ask requester to light up screen button */}
              <View style={{ marginTop: space[3] }}>
                <Button
                  label={`Ask ${requesterName} to light up screen`}
                  variant="primary"
                  onPress={() => {
                    tap();
                    hapticSuccess();
                    if (curTaskId) {
                      api.askBeacon(curTaskId).catch(() => {});
                    }
                    toast.show(`${requesterName}'s screen is flashing orange now. Look for it.`);
                  }}
                />
              </View>

              {/* Handover tools row: Call, Message, Enter PIN */}
              <View style={s.crowdToolsRow}>
                <PressableScale
                  style={s.toolBtn}
                  onPress={handleStartCall}
                >
                  <Phone size={18} weight="bold" color={color.midnight} />
                  <Text variant="caption" style={{ fontFamily: 'DMSans_600SemiBold', marginLeft: 4 }}>
                    Call
                  </Text>
                </PressableScale>

                <PressableScale
                  style={s.toolBtn}
                  onPress={() => {
                    tap();
                    setChatOpen(true);
                  }}
                >
                  <ChatCircleDots size={18} weight="bold" color={color.midnight} />
                  <Text variant="caption" style={{ fontFamily: 'DMSans_600SemiBold', marginLeft: 4 }}>
                    Message
                  </Text>
                  {unreadMessageCount > 0 && (
                    <View style={s.messageBadge}>
                      <Text variant="caption" style={s.messageBadgeText}>
                        {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                      </Text>
                    </View>
                  )}
                </PressableScale>

                <PressableScale
                  style={[s.toolBtn, s.toolBtnPin]}
                  onPress={() => setPinModalOpen(true)}
                >
                  <Text variant="caption" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.white }}>
                    Enter PIN
                  </Text>
                </PressableScale>
              </View>
            </View>
          </View>
        )}

        {/* ─────────────────────────────────────────────────────────────
           STAGE 5: CELEBRATION PAYOUT & CASH REFUND (SCREEN 15)
        ───────────────────────────────────────────────────────────── */}
        {stage === 'payout' && (
          <View style={s.payoutWrap}>
            <Coin size={100} />
            <Text variant="caption" tone="ink3" style={{ fontWeight: '600', textTransform: 'uppercase', marginTop: space[3] }}>
              You earned
            </Text>
            <Text variant="display" style={{ color: color.midnight, marginTop: 2 }}>
              {naira(payAmtDisplay)}
            </Text>

            <View style={s.payoutSplitCard}>
              {refAmtDisplay > 0 && (
                <View style={s.splitLine}>
                  <Text variant="caption" tone="ink2">Cash you spent, refunded</Text>
                  <Text variant="label" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold' }}>
                    {naira(refAmtDisplay)}
                  </Text>
                </View>
              )}

              <View style={[s.splitLine, refAmtDisplay > 0 && { borderTopWidth: 1, borderTopColor: color.lineSoft, paddingTop: space[2] }]}>
                <Text variant="caption" style={{ color: color.mintInk, fontWeight: '700' }}>Lands in your wallet</Text>
                <Text variant="h3" style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.mintInk }}>
                  {naira(totAmtDisplay)}
                </Text>
              </View>
            </View>

            <Text variant="caption" tone="ink2" align="center" style={{ marginTop: space[3], lineHeight: 18, maxWidth: 300 }}>
              {refAmtDisplay > 0
                ? `Your fee and the cash you fronted arrived together, the moment ${requesterName} gave you the PIN.`
                : `Your fee of ${naira(totAmtDisplay)} was safely credited to your wallet balance.`}
            </Text>

            <View style={{ width: '100%', marginTop: space[5] }}>
              <Button
                label="Back to my route"
                onPress={() => {
                  tap();
                  router.replace('/home');
                }}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* ─────────────────────────────────────────────────────────────
         MODAL: RUNNER PRICE ASK (COSTS MORE)
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={askPriceOpen} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text variant="h2" style={{ fontSize: 22 }}>Price is different?</Text>
            <Text variant="body" tone="ink2" style={{ marginTop: 2, lineHeight: 20 }}>
              Snap the price tag and type the real price. {requesterName} gets 2 minutes to answer.
            </Text>

            <PressableScale
              style={[s.rcptBtn, priceTagPhoto && s.rcptBtnActive, { marginTop: space[3] }]}
              onPress={() => {
                tap();
                setPriceTagPhoto(!priceTagPhoto);
              }}
            >
              <Camera size={18} weight="bold" color={priceTagPhoto ? color.mint : color.ink2} />
              <Text variant="label" style={{ fontFamily: 'DMSans_600SemiBold', marginLeft: space[2], color: color.midnight }}>
                {priceTagPhoto ? 'Price tag photo added' : 'Photo of the price tag'}
              </Text>
            </PressableScale>

            <Text variant="caption" tone="ink2" style={{ fontWeight: '700', marginTop: space[3] }}>
              Real price, each
            </Text>
            <View style={s.amtInputWrap}>
              <Text variant="h3" style={{ color: color.ink3 }}>₦</Text>
              <TextInput
                value={realPriceInput}
                onChangeText={setRealPriceInput}
                keyboardType="numeric"
                style={s.amtInput}
              />
            </View>

            <View style={{ marginTop: space[4], gap: space[2] }}>
              <Button
                label={`Ask ${requesterName}`}
                onPress={handleSendPriceAsk}
              />
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setAskPriceOpen(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
         MODAL: PIN KEYPAD ENTRY
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={pinModalOpen} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text variant="h2" style={{ fontSize: 22 }}>Enter Delivery PIN</Text>
            <Text variant="body" tone="ink2" style={{ marginTop: 2 }}>
              Ask {requesterName} for their 4-digit PIN to complete the errand.
            </Text>

            <TextInput
              value={pinCode}
              onChangeText={setPinCode}
              keyboardType="numeric"
              maxLength={4}
              placeholder="••••"
              placeholderTextColor={color.ink4}
              style={s.pinInput}
              autoFocus
            />

            <View style={{ marginTop: space[4], gap: space[2] }}>
              <Button
                label="Verify & Complete"
                onPress={handleVerifyPin}
                loading={verifyingPin}
                disabled={pinCode.length < 4}
              />
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setPinModalOpen(false)}
                disabled={verifyingPin}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
         IN-APP CHAT MODAL (RUNNER SIDE)
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={chatOpen} animationType="slide" transparent>
        <View style={s.chatBackdrop}>
          <View style={s.chatModalCard}>
            {/* Header */}
            <View style={s.chatHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={s.chatAvatar}>
                  <Text variant="caption" style={{ color: '#FFFFFF', fontWeight: '700' }}>
                    {requesterName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text variant="body" style={{ fontWeight: '700' }}>
                    {requesterName}
                  </Text>
                  <Text variant="caption" tone="ink3" style={{ fontSize: 11 }}>
                    {isBuyErrand ? 'Errand requester' : 'Sender'} · Masked chat
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
                  accessibilityLabel="Call requester"
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
                Never ask for the Handshake PIN in chat. The sender must read it to you in person.
              </Text>
            </View>

            {/* Messages list */}
            <ScrollView style={s.chatMessagesList} contentContainerStyle={{ paddingVertical: 6, gap: 6 }}>
              {messages.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: space[4] }}>
                  <Text variant="caption" tone="ink3">No messages yet. Send an update to {requesterName}.</Text>
                </View>
              ) : (
                messages.map((m) => (
                  <View
                    key={m.id}
                    style={[
                      s.chatBubble,
                      m.is_runner ? s.chatBubbleMe : s.chatBubbleThem,
                    ]}
                  >
                    <Text
                      variant="body"
                      tone={m.is_runner ? 'card' : 'midnight'}
                      style={{ fontSize: 14, lineHeight: 19 }}
                    >
                      {m.text}
                      {'  '}
                      <Text
                        style={{
                          fontSize: 9,
                          color: m.is_runner ? 'rgba(255,255,255,0.75)' : color.ink3,
                        }}
                      >
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Quick Chips */}
            <View style={s.quickChipsRow}>
              {(isBuyErrand
                ? [
                    "I'm at the shop now",
                    "Found your item",
                    "Paid & on my way to you",
                    "I've arrived at your location",
                  ]
                : [
                    "I'm at the pickup spot",
                    "Item picked up, heading your way",
                    "A few minutes away",
                    "I've arrived at your location",
                  ]
              ).map((chip, idx) => (
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
            </View>

            {/* Input Row */}
            <View style={s.chatInputRow}>
              <TextInput
                style={s.chatInput}
                placeholder={`Message ${requesterName}...`}
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
         MASKED CALL MODAL (RUNNER SIDE)
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={callOpen} animationType="fade" transparent>
        <View style={[s.modalOverlay, { backgroundColor: '#0F172A' }]}>
          {toast.node}
          <View style={s.callScreenInner}>
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <View style={s.callAvatarLarge}>
                <Text variant="h1" style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '700' }}>
                  {requesterName.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <Text variant="h2" style={{ color: '#FFFFFF', marginTop: space[3] }}>
                {requesterName}
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
                    : agoraStatus === 'error' ? 'Call unavailable' : 'Connecting…'}
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
  card: {
    backgroundColor: color.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: color.line,
    padding: space[4],
  },
  offerWrap: {
    marginTop: space[2],
  },
  offerTimerBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: color.line,
    overflow: 'hidden',
    marginBottom: space[3],
  },
  offerTimerFill: {
    height: '100%',
    backgroundColor: color.tangerine,
  },
  offerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offerMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: space[2],
  },
  earnBadge: {
    alignItems: 'flex-end',
    backgroundColor: color.mintSoft,
    paddingHorizontal: space[3],
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  factsCard: {
    backgroundColor: color.paper,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    padding: space[3],
    marginTop: space[3],
  },
  factLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupBullet: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: color.mint,
  },
  dropBullet: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: color.tangerine,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
    marginTop: space[3],
  },
  metaChip: {
    backgroundColor: color.paper,
    paddingHorizontal: space[2],
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.line,
  },
  metaChipText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: color.ink2,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space[3],
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
    backgroundColor: color.mint,
  },
  shopItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: space[3],
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
  },
  shopItemPhoto: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    marginTop: space[2],
    backgroundColor: color.paper,
  },
  chkBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  chkBoxActive: {
    backgroundColor: color.mint,
    borderColor: color.mint,
  },
  itemActionBtn: {
    backgroundColor: color.paper,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.pill,
    paddingHorizontal: space[3],
    paddingVertical: 4,
  },
  shopsRow: {
    flexDirection: 'row',
    gap: space[2],
    marginTop: space[2],
  },
  shopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.paper,
    borderRadius: radius.pill,
    paddingHorizontal: space[3],
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: color.line,
  },
  kindSwitch: {
    flexDirection: 'row',
    backgroundColor: color.sunken,
    borderRadius: radius.pill,
    padding: 3,
  },
  kindBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.pill,
    gap: 6,
  },
  kindBtnActive: {
    backgroundColor: color.card,
    ...shadow[1],
  },
  kindBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    color: color.ink3,
    fontSize: 14,
  },
  kindBtnTextActive: {
    color: color.midnight,
    fontFamily: 'DMSans_700Bold',
  },
  fieldInput: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: color.paper,
    borderWidth: 1.5,
    borderColor: color.line,
    paddingHorizontal: space[3],
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: color.midnight,
    marginTop: space[2],
  },
  fieldInputDisabled: {
    backgroundColor: color.sunken,
    color: color.ink3,
  },
  bankDropdownField: {
    position: 'relative',
  },
  bankDropdownInput: {
    paddingRight: 48,
  },
  bankDropdownButton: {
    position: 'absolute',
    right: 0,
    top: space[2],
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBank: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space[2],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.md,
    backgroundColor: color.tangerineSoft,
    borderWidth: 1.5,
    borderColor: color.tangerineEdge,
  },
  bankResults: {
    marginTop: space[2],
    maxHeight: 300,
    borderRadius: radius.md,
    backgroundColor: color.paper,
    borderWidth: 1.5,
    borderColor: color.line,
    overflow: 'hidden',
  },
  bankResult: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  receiptThumb: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginLeft: space[2],
  },
  resolveBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space[2],
  },
  resolvedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.mintSoft,
    padding: space[3],
    borderRadius: radius.md,
    marginTop: space[2],
  },
  amtInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: radius.md,
    backgroundColor: color.paper,
    borderWidth: 1.5,
    borderColor: color.line,
    paddingHorizontal: space[3],
    marginTop: space[2],
  },
  amtInput: {
    flex: 1,
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 22,
    color: color.midnight,
    marginLeft: space[2],
  },
  rcptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: color.paper,
    borderWidth: 1.5,
    borderColor: color.line,
    marginTop: space[3],
  },
  rcptBtnActive: {
    backgroundColor: color.mintSoft,
    borderColor: color.mint,
  },
  distBadge: {
    alignItems: 'flex-end',
    backgroundColor: color.tangerineSoft,
    paddingHorizontal: space[3],
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  seatCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.paper,
    borderRadius: radius.md,
    padding: space[3],
    marginTop: space[3],
    borderWidth: 1,
    borderColor: color.line,
  },
  deliveryPhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.paper,
    borderRadius: radius.md,
    padding: space[3],
    marginTop: space[3],
    borderWidth: 1.5,
    borderColor: color.line,
  },
  deliveryPhotoRowActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#A7F3D0',
  },
  deliveryPhotoThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: color.paper,
  },
  deliveryPhotoEmpty: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crowdToolsRow: {
    flexDirection: 'row',
    gap: space[2],
    marginTop: space[4],
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: radius.md,
    backgroundColor: color.paper,
    borderWidth: 1.5,
    borderColor: color.line,
  },
  toolBtnPin: {
    backgroundColor: color.midnight,
    borderColor: color.midnight,
  },
  payoutWrap: {
    alignItems: 'center',
    paddingVertical: space[6],
  },
  payoutSplitCard: {
    width: '100%',
    backgroundColor: color.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: color.line,
    padding: space[4],
    marginTop: space[4],
    gap: space[3],
  },
  splitLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  pinInput: {
    height: 64,
    borderRadius: radius.md,
    backgroundColor: color.paper,
    borderWidth: 2,
    borderColor: color.tangerine,
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 32,
    textAlign: 'center',
    letterSpacing: 16,
    color: color.midnight,
    marginTop: space[4],
  },
  topNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: color.roseInk,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: color.paper,
  },
  messageBadgeText: {
    color: color.white,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '700',
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
    paddingHorizontal: 12,
    paddingVertical: 7,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 6,
    paddingTop: space[2],
    paddingBottom: 4,
  },
  quickChip: {
    alignSelf: 'flex-start',
    backgroundColor: color.paper,
    paddingHorizontal: 12,
    paddingVertical: 6,
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

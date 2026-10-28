import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import {
  Check,
  Microphone,
  MicrophoneSlash,
  Phone,
  PhoneDisconnect,
  SpeakerHigh,
  X,
} from 'phosphor-react-native';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { api } from '@/api';
import { useAgoraCall } from '@/lib/agoraCall';
import { useIncomingCallRing } from '@/lib/incomingCallRing';
import { useCommunicationStore } from '@/store/communication';
import { color, radius, space } from '@/theme/tokens';

export function IncomingCallOverlay() {
  const incomingCall = useCommunicationStore((state) => state.incomingCall);
  const activeCall = useCommunicationStore((state) => state.activeCall);
  const answerCall = useCommunicationStore((state) => state.answerCall);
  const clearIncomingCall = useCommunicationStore((state) => state.clearIncomingCall);
  const clearActiveCall = useCommunicationStore((state) => state.clearActiveCall);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  const call = activeCall ?? incomingCall;
  const isActive = Boolean(activeCall);
  useIncomingCallRing(Boolean(incomingCall) && !activeCall);
  const { status, error, setMuted, setSpeaker } = useAgoraCall({
    visible: isActive,
    taskId: activeCall?.task_id,
    session: activeCall,
    muted: isMuted,
    speaker: isSpeaker,
    onRemoteLeft: () => {
      if (activeCall) {
        void endCall();
      }
    },
  });

  useEffect(() => {
    if (!isActive || status !== 'connected') {
      setCallSeconds(0);
      return;
    }

    const timer = setInterval(() => setCallSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [isActive, status]);

  if (!call) return null;

  const contactName = call.caller_name || call.contact_name || 'Waydrop User';

  const rejectCall = async () => {
    clearIncomingCall(call.call_session_id);
    try {
      await api.endCall(call.task_id, call.call_session_id || '');
    } catch {}
  };

  const endCall = async () => {
    clearActiveCall(call.call_session_id);
    try {
      await api.endCall(call.task_id, call.call_session_id || '');
    } catch {}
  };

  const answer = () => answerCall();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={isActive ? endCall : rejectCall}>
      <View style={s.backdrop}>
        <View style={s.card}>
          {!isActive ? (
            <>
              <View style={s.avatar}>
                <Phone size={30} weight="fill" color={color.white} />
              </View>
              <Text variant="caption" tone="ink3" style={s.eyebrow}>Incoming Waydrop call</Text>
              <Text variant="h2" style={s.name}>{contactName}</Text>
              <Text variant="body" tone="ink2" align="center" style={s.subtitle}>
                Calling about this errand
              </Text>
              <View style={s.actions}>
                <PressableScale style={s.rejectButton} onPress={rejectCall} accessibilityLabel="Reject call">
                  <PhoneDisconnect size={22} weight="fill" color={color.white} />
                  <Text variant="label" style={s.actionText}>Reject</Text>
                </PressableScale>
                <PressableScale style={s.answerButton} onPress={answer} accessibilityLabel="Answer call">
                  <Check size={22} weight="bold" color={color.white} />
                  <Text variant="label" style={s.actionText}>Answer</Text>
                </PressableScale>
              </View>
            </>
          ) : (
            <>
              <View style={[s.avatar, s.avatarActive]}>
                <Phone size={30} weight="fill" color={color.white} />
              </View>
              <Text variant="h2" style={s.name}>{contactName}</Text>
              <Text variant="caption" tone="mintInk" style={s.statusText}>
                {status === 'connected'
                  ? `${Math.floor(callSeconds / 60).toString().padStart(2, '0')}:${(callSeconds % 60).toString().padStart(2, '0')}`
                  : status === 'error' ? (error || 'Call unavailable') : 'Connecting…'}
              </Text>

              <View style={s.controls}>
                <PressableScale
                  style={[s.controlButton, isMuted && s.controlButtonActive]}
                  onPress={() => {
                    const next = !isMuted;
                    setIsMuted(next);
                    void setMuted(next);
                  }}
                  accessibilityLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? <MicrophoneSlash size={22} color={color.roseInk} /> : <Microphone size={22} color={color.midnight} />}
                </PressableScale>
                <PressableScale style={s.endButton} onPress={endCall} accessibilityLabel="End call">
                  <PhoneDisconnect size={24} weight="fill" color={color.white} />
                </PressableScale>
                <PressableScale
                  style={[s.controlButton, isSpeaker && s.controlButtonActive]}
                  onPress={() => {
                    const next = !isSpeaker;
                    setIsSpeaker(next);
                    void setSpeaker(next);
                  }}
                  accessibilityLabel="Toggle speaker"
                >
                  <SpeakerHigh size={22} color={isSpeaker ? color.mintInk : color.midnight} />
                </PressableScale>
              </View>
              <Button label="End call" variant="ghost" onPress={endCall} style={{ marginTop: space[3] }} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[5],
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: color.card,
    borderRadius: radius.xl,
    padding: space[5],
    alignItems: 'center',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: color.tangerine,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space[3],
  },
  avatarActive: { backgroundColor: color.mintInk },
  eyebrow: { textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.6 },
  name: { marginTop: 4, textAlign: 'center' },
  subtitle: { marginTop: 4 },
  statusText: { marginTop: 8, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: space[3], width: '100%', marginTop: space[5] },
  rejectButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: color.roseInk,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  answerButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: color.mintInk,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: { color: color.white, fontWeight: '700' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: space[5] },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonActive: { backgroundColor: color.mintSoft },
  endButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.roseInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

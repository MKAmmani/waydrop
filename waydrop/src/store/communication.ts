import { create } from 'zustand';
import type { CallSessionInfo } from '@/api';

export type IncomingCall = CallSessionInfo & {
  caller_id?: string;
  receiver_id?: string;
  caller_name?: string;
};

type CommunicationState = {
  incomingCall: IncomingCall | null;
  activeCall: IncomingCall | null;
  unreadMessagesByTask: Record<string, number>;
  countedMessageKeys: Record<string, true>;
  receiveCall: (call: IncomingCall) => void;
  answerCall: () => void;
  clearIncomingCall: (callSessionId?: string) => void;
  clearActiveCall: (callSessionId?: string) => void;
  incrementMessage: (taskId?: string | null, messageId?: string | null) => void;
  markMessagesRead: (taskId?: string | null) => void;
};

export const useCommunicationStore = create<CommunicationState>((set) => ({
  incomingCall: null,
  activeCall: null,
  unreadMessagesByTask: {},
  countedMessageKeys: {},

  receiveCall: (call) => set((state) => {
    if (!call.call_session_id) return state;
    if (state.activeCall?.call_session_id === call.call_session_id) return state;
    if (state.incomingCall?.call_session_id === call.call_session_id) return state;
    return { incomingCall: call };
  }),

  answerCall: () => set((state) => ({
    incomingCall: null,
    activeCall: state.incomingCall,
  })),

  clearIncomingCall: (callSessionId) => set((state) => (
    !callSessionId || state.incomingCall?.call_session_id === callSessionId
      ? { incomingCall: null }
      : state
  )),

  clearActiveCall: (callSessionId) => set((state) => (
    !callSessionId || state.activeCall?.call_session_id === callSessionId
      ? { activeCall: null }
      : state
  )),

  incrementMessage: (taskId, messageId) => set((state) => {
    if (!taskId) return state;
    const key = messageId ? `${taskId}:${messageId}` : null;
    if (key && state.countedMessageKeys[key]) return state;

    return {
      unreadMessagesByTask: {
        ...state.unreadMessagesByTask,
        [taskId]: (state.unreadMessagesByTask[taskId] ?? 0) + 1,
      },
      ...(key
        ? { countedMessageKeys: { ...state.countedMessageKeys, [key]: true } }
        : {}),
    };
  }),

  markMessagesRead: (taskId) => set((state) => {
    if (!taskId) return state;
    const prefix = `${taskId}:`;
    const hasUnread = state.unreadMessagesByTask[taskId] != null;
    const hasCounted = Object.keys(state.countedMessageKeys).some((key) => key.startsWith(prefix));
    if (!hasUnread && !hasCounted) return state;

    const unreadMessagesByTask = { ...state.unreadMessagesByTask };
    delete unreadMessagesByTask[taskId];

    const countedMessageKeys = { ...state.countedMessageKeys };
    for (const key of Object.keys(countedMessageKeys)) {
      if (key.startsWith(prefix)) delete countedMessageKeys[key];
    }

    return { unreadMessagesByTask, countedMessageKeys };
  }),
}));

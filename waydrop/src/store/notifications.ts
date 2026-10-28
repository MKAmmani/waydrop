/**
 * Global notifications store.
 *
 * Holds a queue of `ApiNotification` items that arrived via Ably while the
 * home screen was not the active screen (e.g. while the runner was on the
 * runner-shopping / payout screen).  The home screen drains this queue on
 * mount / focus and merges the items into its local list so that earnings
 * always appear in Notifications without requiring a full API refetch.
 */
import { create } from 'zustand';
import type { ApiNotification } from '@/api';

type NotificationsState = {
  /** Notifications received from Ably that haven't yet been consumed by home. */
  pending: ApiNotification[];
  /** Increment to signal home that it should re-fetch the full list. */
  refetchSignal: number;

  /** Called by _layout when a notification.created Ably event fires. */
  push: (notification: ApiNotification) => void;

  /**
   * Called by home to drain the queue.
   * Returns all pending items and clears the queue atomically.
   */
  drain: () => ApiNotification[];

  /** Called by home to request a full re-fetch (e.g. after task.accepted). */
  signalRefetch: () => void;
};

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  pending: [],
  refetchSignal: 0,

  push: (notification) =>
    set((state) => {
      // Deduplicate: ignore if already queued.
      if (state.pending.some((n) => n.id === notification.id)) return state;
      return { pending: [notification, ...state.pending] };
    }),

  drain: () => {
    const items = get().pending;
    set({ pending: [] });
    return items;
  },

  signalRefetch: () =>
    set((state) => ({ refetchSignal: state.refetchSignal + 1 })),
}));

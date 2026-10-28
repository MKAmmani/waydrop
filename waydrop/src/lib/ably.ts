import * as Ably from 'ably';
import { useEffect, useRef, useState } from 'react';
import { getAccessToken } from '@/store/session';
import type { HomeData } from '@/api';
import { getApiBaseUrl } from '@/api/baseUrl';

let ablyInstance: Ably.Realtime | null = null;
let tokenRequestPromise: Promise<Ably.TokenRequest | Ably.TokenDetails> | null = null;

function reportAblyError(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[Ably] ${scope}: ${message}`);
}

function watchConnection(
  client: Ably.Realtime,
  setConnected: (connected: boolean) => void
) {
  const onStateChange = (stateChange: Ably.ConnectionStateChange) => {
    setConnected(stateChange.current === 'connected');
  };

  client.connection.on(onStateChange);
  setConnected(client.connection.state === 'connected');

  return () => client.connection.off(onStateChange);
}

function subscribeSafely(
  channel: Ably.RealtimeChannel,
  listener: (message: Ably.Message) => void,
  channelName: string
) {
  void channel.subscribe(listener).catch((error: unknown) => {
    reportAblyError(`subscription unavailable for ${channelName}`, error);
  });
}

export function getAbly(): Ably.Realtime | null {
  try {
    if (!ablyInstance) {
      const baseUrl = getApiBaseUrl();
      ablyInstance = new Ably.Realtime({
        authCallback: (_data, callback) => {
          if (!tokenRequestPromise) {
            tokenRequestPromise = (async () => {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 8000);
              try {
                const token = getAccessToken();
                const res = await fetch(`${baseUrl}/realtime/token`, {
                  headers: {
                    Accept: 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                  signal: controller.signal,
                });
                if (!res.ok) {
                  throw new Error(`Ably token request failed: ${res.status}`);
                }
                return (await res.json()) as Ably.TokenRequest | Ably.TokenDetails;
              } finally {
                clearTimeout(timeoutId);
              }
            })().finally(() => {
              tokenRequestPromise = null;
            });
          }

          tokenRequestPromise
            .then((tokenRequest) => callback(null, tokenRequest))
            .catch((error: unknown) => {
              callback(error instanceof Error ? error.message : 'Ably token fetch error', null);
            });
        },
        autoConnect: true,
        httpRequestTimeout: 5000,
        disconnectedRetryTimeout: 15000,
        suspendedRetryTimeout: 30000,
      });

      ablyInstance.connection.on((stateChange) => {
        if (stateChange.current === 'failed') {
          reportAblyError('connection failed', stateChange.reason?.message ?? 'Unknown error');
        } else if (stateChange.current === 'suspended') {
          reportAblyError('connection suspended', stateChange.reason?.message ?? 'Retrying automatically');
        }
      });

    }
    return ablyInstance;
  } catch (err) {
    console.warn('[Ably] init error:', err);
    return null;
  }
}

/**
 * Real-time campus hook (useAblyCampus(siteId))
 * Subscribes to live campus radar updates via Ably WebSockets
 */
export function useAblyCampus(
  siteId?: string | null,
  onRadarUpdate?: (radar: Partial<HomeData>) => void
) {
  const [connected, setConnected] = useState(false);
  const callbackRef = useRef(onRadarUpdate);
  callbackRef.current = onRadarUpdate;

  useEffect(() => {
    if (!siteId) return;

    let client: Ably.Realtime | null = null;
    let channel: Ably.RealtimeChannel | null = null;
    let removeConnectionListener: (() => void) | null = null;

    try {
      client = getAbly();
      if (!client) return;

      removeConnectionListener = watchConnection(client, setConnected);

      channel = client.channels.get(`campus:${siteId}:radar`);
      subscribeSafely(channel, (message: Ably.Message) => {
        if (message.data && callbackRef.current) {
          const payload = typeof message.data === 'string' ? JSON.parse(message.data) : message.data;
          callbackRef.current(payload);
        }
      }, `campus:${siteId}:radar`);
    } catch (err) {
      console.warn('[Ably] subscription error:', err);
    }

    return () => {
      try {
        removeConnectionListener?.();
        channel?.unsubscribe();
      } catch {}
    };
  }, [siteId]);

  return { connected };
}

/**
 * Real-time campus open errands stream hook (useAblyErrands(siteId, onErrandEvent))
 * Subscribes to campus open errand stream (task.created, task.bounty_raised, task.taken, task.cancelled)
 */
export function useAblyErrands(
  siteId?: string | null,
  onErrandEvent?: (eventName: string, data: any) => void
) {
  const [connected, setConnected] = useState(false);
  const callbackRef = useRef(onErrandEvent);
  callbackRef.current = onErrandEvent;

  useEffect(() => {
    if (!siteId) return;

    let client: Ably.Realtime | null = null;
    let channel: Ably.RealtimeChannel | null = null;
    let removeConnectionListener: (() => void) | null = null;

    try {
      client = getAbly();
      if (!client) return;

      removeConnectionListener = watchConnection(client, setConnected);

      channel = client.channels.get(`campus:${siteId}:errands`);
      subscribeSafely(channel, (message: Ably.Message) => {
        if (callbackRef.current) {
          const payload = typeof message.data === 'string' ? JSON.parse(message.data) : message.data;
          callbackRef.current(message.name ?? '', payload);
        }
      }, `campus:${siteId}:errands`);
    } catch (err) {
      console.warn('[Ably] errands channel subscription error:', err);
    }

    return () => {
      try {
        removeConnectionListener?.();
        channel?.unsubscribe();
      } catch {}
    };
  }, [siteId]);

  return { connected };
}

/**
 * Real-time task hook (useAblyTask(taskId, onTaskEvent))
 * Subscribes to task-specific updates (task.accepted, task.updated, task.viewing, task.cancelled)
 */
export function useAblyTask(
  taskId?: string | null,
  onTaskEvent?: (eventName: string, data: any) => void
) {
  const [connected, setConnected] = useState(false);
  const callbackRef = useRef(onTaskEvent);
  callbackRef.current = onTaskEvent;

  useEffect(() => {
    if (!taskId) return;

    let client: Ably.Realtime | null = null;
    let channel: Ably.RealtimeChannel | null = null;
    let removeConnectionListener: (() => void) | null = null;

    try {
      client = getAbly();
      if (!client) return;

      removeConnectionListener = watchConnection(client, setConnected);

      channel = client.channels.get(`task:${taskId}`);
      subscribeSafely(channel, (message: Ably.Message) => {
        if (callbackRef.current) {
          const payload = typeof message.data === 'string' ? JSON.parse(message.data) : message.data;
          callbackRef.current(message.name ?? '', payload);
        }
      }, `task:${taskId}`);
    } catch (err) {
      console.warn('[Ably] task channel subscription error:', err);
    }

    return () => {
      try {
        removeConnectionListener?.();
        channel?.unsubscribe();
      } catch {}
    };
  }, [taskId]);

  return { connected };
}

/**
 * Real-time user hook (useAblyUser(userId, onUserEvent))
 * Subscribes to user personal channel (task.accepted, task.updated, wallet.updated)
 */
export function useAblyUser(
  userId?: string | null,
  onUserEvent?: (eventName: string, data: any) => void
) {
  const [connected, setConnected] = useState(false);
  const callbackRef = useRef(onUserEvent);
  callbackRef.current = onUserEvent;

  useEffect(() => {
    if (!userId) return;

    let client: Ably.Realtime | null = null;
    let channel: Ably.RealtimeChannel | null = null;
    let removeConnectionListener: (() => void) | null = null;

    try {
      client = getAbly();
      if (!client) return;

      removeConnectionListener = watchConnection(client, setConnected);

      channel = client.channels.get(`user:${userId}`);
      const listener = (message: Ably.Message) => {
        if (callbackRef.current) {
          const payload = typeof message.data === 'string' ? JSON.parse(message.data) : message.data;
          callbackRef.current(message.name ?? '', payload);
        }
      };
      subscribeSafely(channel, listener, `user:${userId}`);

      return () => {
        try {
          removeConnectionListener?.();
          channel?.unsubscribe(listener);
        } catch {}
      };
    } catch (err) {
      console.warn('[Ably] user channel subscription error:', err);
    }
  }, [userId]);

  return { connected };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import Constants from 'expo-constants';
import { api, type AgoraCallToken, type CallSessionInfo } from '@/api';

type CallStatus = 'idle' | 'joining' | 'connected' | 'error';

type CallCallbacks = {
  onJoined: () => void;
  onRemoteJoined: () => void;
  onRemoteLeft: () => void;
  onError: (message: string) => void;
  onTokenWillExpire: () => Promise<void>;
};

type CallConnection = {
  setMuted: (muted: boolean) => Promise<void>;
  setSpeaker: (enabled: boolean) => Promise<void>;
  renewToken: (token: string) => Promise<void>;
  leave: () => Promise<void>;
};

function assertAgoraResult(result: unknown, operation: string) {
  if (typeof result === 'number' && result < 0) {
    throw new Error(`Agora ${operation} failed (code ${result}).`);
  }
}

function isExpoGo(): boolean {
  // `appOwnership` is kept for backwards compatibility, while `expoGoConfig`
  // is supplied by current Expo Go clients. Use both because they are exposed
  // differently across Expo SDK versions.
  return Constants.appOwnership === 'expo' || Constants.expoGoConfig != null;
}

function hasAgoraNativeModule(): boolean {
  // Check React Native's module registry before importing `react-native-agora`.
  // The package creates a throwing proxy when its native code is absent, which
  // is exactly what happens in Expo Go (and in a development build that has not
  // been rebuilt after installing the package).
  const isTurboModuleEnabled = (globalThis as { __turboModuleProxy?: unknown })
    .__turboModuleProxy != null;

  return isTurboModuleEnabled
    ? TurboModuleRegistry.get('AgoraRtcNg') != null
    : NativeModules.AgoraRtcNg != null;
}

async function createNativeConnection(token: AgoraCallToken, callbacks: CallCallbacks): Promise<CallConnection> {
  // Expo Go cannot contain third-party native modules such as react-native-agora.
  // Avoid importing it at all: its missing native module is represented by a proxy that throws
  // when a property is read, which would otherwise show a red error screen.
  if (isExpoGo()) {
    throw new Error('In-app calls require the Waydrop Android development build. Expo Go can be used for the rest of the app.');
  }

  if (!hasAgoraNativeModule()) {
    throw new Error('Calling is unavailable in this app build. Rebuild the Waydrop development build after installing react-native-agora.');
  }

  let audio: typeof import('expo-audio');
  try {
    audio = await import('expo-audio');
  } catch {
    throw new Error('Calling is unavailable in this app build. Install the Waydrop development build to make calls.');
  }

  if (typeof audio.requestRecordingPermissionsAsync !== 'function') {
    throw new Error('Calling is unavailable in this app build. Install the Waydrop development build to make calls.');
  }

  const permission = await audio.requestRecordingPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Microphone permission is required to join the call.');
  }

  let agora: typeof import('react-native-agora');
  let engine: ReturnType<typeof import('react-native-agora').createAgoraRtcEngine>;
  try {
    agora = await import('react-native-agora');
    if (typeof agora.createAgoraRtcEngine !== 'function') {
      throw new Error('Agora native module is unavailable.');
    }
    engine = agora.createAgoraRtcEngine();
  } catch {
    throw new Error('Calling is unavailable in this app build. Install the Waydrop development build to make calls.');
  }

  const handler = {
    onJoinChannelSuccess: () => callbacks.onJoined(),
    onUserJoined: () => callbacks.onRemoteJoined(),
    onUserOffline: () => callbacks.onRemoteLeft(),
    onError: (errorCode: unknown, message: string) => callbacks.onError(
      message || `Agora could not start the call (code ${String(errorCode)}).`,
    ),
    onPermissionError: () => callbacks.onError('Microphone permission is required to join the call.'),
    onTokenPrivilegeWillExpire: () => {
      callbacks.onTokenWillExpire().catch(() => callbacks.onError('The call token could not be refreshed.'));
    },
  };

  try {
    assertAgoraResult(engine.initialize({ appId: token.app_id }), 'initialization');
    assertAgoraResult(engine.setChannelProfile(agora.ChannelProfileType.ChannelProfileCommunication), 'channel setup');
    assertAgoraResult(engine.enableAudio(), 'audio setup');
    assertAgoraResult(engine.setEnableSpeakerphone(false), 'speaker setup');
    engine.registerEventHandler(handler);
    assertAgoraResult(engine.joinChannel(token.token, token.channel, token.uid, {
      channelProfile: agora.ChannelProfileType.ChannelProfileCommunication,
      clientRoleType: agora.ClientRoleType.ClientRoleBroadcaster,
      publishMicrophoneTrack: true,
      publishCameraTrack: false,
      autoSubscribeAudio: true,
      autoSubscribeVideo: false,
    }), 'join');
  } catch (error) {
    engine.unregisterEventHandler(handler);
    engine.release();
    throw error;
  }

  return {
    setMuted: async (muted) => {
      engine.muteLocalAudioStream(muted);
    },
    setSpeaker: async (enabled) => {
      engine.setEnableSpeakerphone(enabled);
    },
    renewToken: async (nextToken) => {
      engine.renewToken(nextToken);
    },
    leave: async () => {
      engine.unregisterEventHandler(handler);
      engine.leaveChannel();
      engine.release();
    },
  };
}

async function createWebConnection(token: AgoraCallToken, callbacks: CallCallbacks): Promise<CallConnection> {
  const module = await import('agora-rtc-sdk-ng');
  // Metro can expose a CommonJS package either as `default` or as the
  // module namespace. Supporting both shapes avoids the generic
  // "undefined is not a function" error when starting a call on web.
  const AgoraRTC = module.default ?? module;
  if (
    typeof AgoraRTC.createClient !== 'function'
    || typeof AgoraRTC.createMicrophoneAudioTrack !== 'function'
  ) {
    throw new Error('In-app calling is unavailable on this platform.');
  }
  const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  const localTrack = await AgoraRTC.createMicrophoneAudioTrack();
  const onUserPublished = async (user: any, mediaType: 'audio' | 'video' | 'datachannel') => {
    if (mediaType !== 'audio') return;
    await client.subscribe(user, mediaType);
    user.audioTrack?.play();
    callbacks.onRemoteJoined();
  };
  const onUserLeft = () => callbacks.onRemoteLeft();

  client.on('user-published', onUserPublished);
  client.on('user-left', onUserLeft);

  try {
    await client.join(token.app_id, token.channel, token.token, token.uid);
    await client.publish(localTrack);
    callbacks.onJoined();
  } catch (error) {
    localTrack.close();
    client.off('user-published', onUserPublished);
    client.off('user-left', onUserLeft);
    throw error;
  }

  return {
    setMuted: async (muted) => {
      await localTrack.setMuted(muted);
    },
    setSpeaker: async () => {},
    renewToken: async (nextToken) => {
      await client.renewToken(nextToken);
    },
    leave: async () => {
      localTrack.close();
      client.off('user-published', onUserPublished);
      client.off('user-left', onUserLeft);
      await client.leave();
    },
  };
}

async function joinAgoraCall(token: AgoraCallToken, callbacks: CallCallbacks): Promise<CallConnection> {
  return Platform.OS === 'web'
    ? createWebConnection(token, callbacks)
    : createNativeConnection(token, callbacks);
}

export function useAgoraCall({
  visible,
  taskId,
  session,
  muted,
  speaker,
  onRemoteLeft,
}: {
  visible: boolean;
  taskId?: string;
  session: CallSessionInfo | null;
  muted: boolean;
  speaker: boolean;
  onRemoteLeft?: () => void;
}): { status: CallStatus; error: string | null; setMuted: (muted: boolean) => Promise<void>; setSpeaker: (enabled: boolean) => Promise<void> } {
  const connectionRef = useRef<CallConnection | null>(null);
  const onRemoteLeftRef = useRef(onRemoteLeft);
  onRemoteLeftRef.current = onRemoteLeft;
  const [status, setStatus] = useState<CallStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let remoteLeftTimer: ReturnType<typeof setTimeout> | null = null;
    const sessionId = session?.call_session_id;

    const clearRemoteLeftTimer = () => {
      if (remoteLeftTimer) {
        clearTimeout(remoteLeftTimer);
        remoteLeftTimer = null;
      }
    };

    if (!visible || !taskId || !sessionId) {
      setStatus('idle');
      return () => {
        cancelled = true;
      };
    }

    setStatus('joining');
    setError(null);

    void api.getCallToken(taskId, sessionId)
      .then((token) => joinAgoraCall(token, {
        onJoined: () => {
          if (!cancelled) setStatus('connected');
        },
        onRemoteJoined: () => {
          clearRemoteLeftTimer();
        },
        onRemoteLeft: () => {
          clearRemoteLeftTimer();
          remoteLeftTimer = setTimeout(() => {
            if (!cancelled) onRemoteLeftRef.current?.();
          }, 4000);
        },
        onError: (message) => {
          if (!cancelled) {
            setError(message);
            setStatus('error');
          }
        },
        onTokenWillExpire: async () => {
          const refreshed = await api.getCallToken(taskId, sessionId);
          await connectionRef.current?.renewToken(refreshed.token);
        },
      }))
      .then((connection) => {
        if (cancelled) {
          return connection.leave();
        }
        connectionRef.current = connection;
        return Promise.all([connection.setMuted(muted), connection.setSpeaker(speaker)]).then(() => undefined);
      })
      .catch((joinError: any) => {
        if (!cancelled) {
          setError(joinError?.message || 'The in-app call could not start.');
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
      clearRemoteLeftTimer();
      const connection = connectionRef.current;
      connectionRef.current = null;
      if (connection) void connection.leave();
    };
  }, [visible, taskId, session?.call_session_id]);

  const setMuted = useCallback(async (nextMuted: boolean) => {
    await connectionRef.current?.setMuted(nextMuted);
  }, []);

  const setSpeaker = useCallback(async (nextSpeaker: boolean) => {
    await connectionRef.current?.setSpeaker(nextSpeaker);
  }, []);

  return { status, error, setMuted, setSpeaker };
}

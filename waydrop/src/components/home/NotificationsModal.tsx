import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import {
  ArrowLeft,
  Bank,
  BellSlash,
  Coins,
  Gift,
  Lightning,
  Star,
} from 'phosphor-react-native';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { color, motion, radius, shadow, space } from '@/theme/tokens';
import { tap } from '@/lib/haptics';

export type NotificationItem = {
  id: string;
  type: 'money' | 'errand' | 'rating' | 'bank' | 'invite';
  title: string;
  desc: string;
  time: string;
  read: boolean;
  section: 'Today' | 'Earlier';
};

export type NotificationsModalProps = {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onPressItem: (id: string) => void;
};

export function NotificationsModal({
  open,
  onClose,
  notifications,
  onMarkAllRead,
  onPressItem,
}: NotificationsModalProps) {
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();

  const tx = useSharedValue(W);

  useEffect(() => {
    if (open) {
      tx.value = withSpring(0, motion.sheet);
    } else {
      tx.value = withTiming(W, { duration: 240 });
    }
  }, [open, W]);

  const pageAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  const todayNotes = notifications.filter((n) => n.section === 'Today');
  const earlierNotes = notifications.filter((n) => n.section === 'Earlier');
  const hasNotes = notifications.length > 0;
  const hasUnread = notifications.some((n) => !n.read);

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'money':
        return <Coins size={21} weight="duotone" color={color.mintInk} />;
      case 'errand':
        return <Lightning size={21} weight="duotone" color={color.tangerine} />;
      case 'rating':
        return <Star size={21} weight="fill" color="#A16207" />;
      case 'bank':
        return <Bank size={21} weight="duotone" color={color.ink2} />;
      case 'invite':
        return <Gift size={21} weight="duotone" color={color.midnight} />;
      default:
        return <Lightning size={21} weight="duotone" color={color.tangerine} />;
    }
  };

  const getIconBg = (type: NotificationItem['type']) => {
    switch (type) {
      case 'money':
        return color.mintSoft;
      case 'errand':
        return color.tangerineSoft;
      case 'rating':
        return color.butterSoft;
      case 'bank':
        return color.sunken;
      case 'invite':
        return '#EEE9FF';
      default:
        return color.paper;
    }
  };

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[st.page, pageAnim]}>
        {/* Top Bar */}
        <View style={[st.pageTop, { paddingTop: insets.top + 10 }]}>
          <PressableScale
            style={[st.backBtn, shadow[1]]}
            onPress={onClose}
            accessibilityLabel="Back to map"
          >
            <ArrowLeft size={18} weight="bold" color={color.midnight} />
          </PressableScale>

          <Text style={st.pageTitle}>Notifications</Text>

          {hasNotes && (
            <PressableScale
              style={st.markBtn}
              onPress={() => {
                tap();
                onMarkAllRead();
              }}
              accessibilityLabel="Mark all read"
            >
              <Text style={st.markText}>Mark all read</Text>
            </PressableScale>
          )}
        </View>

        {/* Body */}
        {hasNotes ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              st.pageBody,
              { paddingBottom: insets.bottom + 36 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {todayNotes.length > 0 && (
              <>
                <Text style={st.sectionHeader}>Today</Text>
                {todayNotes.map((note) => (
                  <NotificationCard
                    key={note.id}
                    note={note}
                    icon={getIcon(note.type)}
                    iconBg={getIconBg(note.type)}
                    onPress={() => onPressItem(note.id)}
                  />
                ))}
              </>
            )}

            {earlierNotes.length > 0 && (
              <>
                <Text style={[st.sectionHeader, { marginTop: 18 }]}>Earlier</Text>
                {earlierNotes.map((note) => (
                  <NotificationCard
                    key={note.id}
                    note={note}
                    icon={getIcon(note.type)}
                    iconBg={getIconBg(note.type)}
                    onPress={() => onPressItem(note.id)}
                  />
                ))}
              </>
            )}
          </ScrollView>
        ) : (
          <View style={st.empty}>
            <View style={st.emptyIconWrap}>
              <BellSlash size={48} weight="duotone" color={color.ink3} />
            </View>
            <Text style={st.emptyTitle}>All quiet</Text>
            <Text style={st.emptyDesc}>
              Runner updates, earnings and errands on your route will show up here.
            </Text>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

function NotificationCard({
  note,
  icon,
  iconBg,
  onPress,
}: {
  note: NotificationItem;
  icon: React.ReactNode;
  iconBg: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      style={[st.note, shadow[1], note.read && { opacity: 0.88 }]}
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityLabel={`${note.title}. ${note.desc}`}
    >
      <View style={[st.noteIcon, { backgroundColor: iconBg }]}>
        {icon}
      </View>

      <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
        <Text style={st.noteTitle} numberOfLines={2}>
          {note.title}
        </Text>
        <Text style={st.noteDesc} numberOfLines={3}>
          {note.desc}
        </Text>
        <Text style={st.noteTime}>{note.time}</Text>
      </View>

      {!note.read && <View style={st.unreadDot} />}
    </PressableScale>
  );
}

const st = StyleSheet.create({
  page: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.paper,
    zIndex: 60,
  },
  pageTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 24,
    letterSpacing: -0.5,
    color: color.midnight,
    flex: 1,
  },
  markBtn: {
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  markText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: color.tangerineInk,
  },
  pageBody: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  sectionHeader: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: color.ink3,
    marginBottom: 8,
    marginLeft: 4,
  },
  note: {
    backgroundColor: color.card,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    position: 'relative',
  },
  noteIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  noteTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: color.midnight,
  },
  noteDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 19,
    color: color.ink2,
    marginTop: 3,
  },
  noteTime: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: color.ink3,
    marginTop: 6,
  },
  unreadDot: {
    position: 'absolute',
    top: 18,
    right: 16,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: color.tangerine,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  emptyIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: color.sunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 22,
    color: color.midnight,
    letterSpacing: -0.3,
  },
  emptyDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: color.ink2,
    textAlign: 'center',
    marginTop: 8,
  },
});

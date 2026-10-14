import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/** Light tap for presses, tabs, chips. */
export const tap = () => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };
/** Success: accepted, verified, delivered. */
export const success = () => { if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); };
/** Error: wrong code, wrong PIN. */
export const error = () => { if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); };

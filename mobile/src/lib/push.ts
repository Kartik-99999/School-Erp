import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { DEV_FAKE_ROLE } from "../config";
import { api } from "../api/client";

// Show a banner even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let registered = false;

// Register this device for push and (best-effort) hand the token to the backend.
// Safe to call repeatedly. No-op on web and in dev-mock previews, and wrapped in
// try/catch so a missing EAS projectId / FCM config can never crash the app.
//
// TODO(native): for production Android push, add the expo-notifications config plugin and
// FCM credentials. The plugin lives in app.config.js, which is the white-label build config
// and intentionally untouched here — wire it up at build-config time.
export async function registerForPush(): Promise<void> {
  if (registered) return;
  if (Platform.OS === "web" || DEV_FAKE_ROLE) return; // preview / unsupported
  if (!Device.isDevice) return; // simulators/emulators can't get a push token
  registered = true;
  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;

    // Hand the Expo push token to the backend (POST /notifications/register-device).
    try {
      await api.post("/notifications/register-device", { expo_push_token: token });
    } catch {
      // best-effort; a transient failure shouldn't break sign-in
    }
  } catch {
    registered = false; // allow a later retry
  }
}

// TODO(deep-link): wire a navigation ref so tapping a notification opens the right screen
// (e.g. a specific notice). For now the listener is registered so taps are handled
// gracefully without crashing.
export function addNotificationTapListener(onTap: (data: any) => void) {
  const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
    onTap(resp.notification.request.content.data);
  });
  return () => sub.remove();
}

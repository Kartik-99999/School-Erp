// One codebase, one branded app per school. Each school's build sets these env vars
// (EXPO_PUBLIC_SCHOOL_CODE / NAME / API_URL) so the app name, icon scope, bundle id and
// the baked-in school are unique per school. The app is hard-locked to its school code.
const SCHOOL_CODE = process.env.EXPO_PUBLIC_SCHOOL_CODE || "demo";
const SCHOOL_NAME = process.env.EXPO_PUBLIC_SCHOOL_NAME || "Erpcore School";
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const safe = SCHOOL_CODE.replace(/[^a-z0-9]/gi, "").toLowerCase() || "demo";

module.exports = {
  expo: {
    name: SCHOOL_NAME,
    slug: "erpcore-" + safe,
    scheme: "erpcore" + safe,
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    ios: { supportsTablet: true, bundleIdentifier: "tech.erpcore." + safe },
    android: {
      package: "tech.erpcore." + safe,
      adaptiveIcon: {
        backgroundColor: "#F6F5F2",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: { favicon: "./assets/favicon.png" },
    plugins: ["expo-secure-store"],
    extra: { schoolCode: SCHOOL_CODE, schoolName: SCHOOL_NAME, apiUrl: API_URL, devFakeRole: process.env.EXPO_PUBLIC_DEV_FAKE_ROLE || null, devForce2fa: process.env.EXPO_PUBLIC_DEV_FORCE_2FA || null },
  },
};

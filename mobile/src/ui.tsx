import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, space } from "./theme";

export function Loader() {
  return (
    <View style={ui.center}>
      <ActivityIndicator color={colors.gold} />
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: space(12) }}>
      <Text style={{ color: colors.sub, fontSize: 14, textAlign: "center" }}>{text}</Text>
    </View>
  );
}

// Full-screen empty/error with an optional retry action.
export function StateView({
  icon = "cloud-offline-outline",
  text,
  onRetry,
}: {
  icon?: any;
  text: string;
  onRetry?: () => void;
}) {
  return (
    <View style={ui.center}>
      <View style={ui.badge}>
        <Ionicons name={icon} size={26} color={colors.sub} />
      </View>
      <Text style={ui.stateText}>{text}</Text>
      {onRetry ? (
        <TouchableOpacity style={ui.retry} onPress={onRetry} activeOpacity={0.85}>
          <Text style={ui.retryText}>Try again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[ui.card, style]}>{children}</View>;
}

const ui = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space(8), backgroundColor: colors.bg },
  badge: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", marginBottom: space(4) },
  stateText: { fontSize: 14, color: colors.sub, textAlign: "center", lineHeight: 20 },
  retry: { marginTop: space(5), borderWidth: 1, borderColor: colors.gold, borderRadius: radius.md, paddingHorizontal: space(6), paddingVertical: space(3) },
  retryText: { color: colors.goldDeep, fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space(5) },
});

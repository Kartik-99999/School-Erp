import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import { SCHOOL_NAME } from "../config";
import { colors, radius, space } from "../theme";

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rl}>{label}</Text>
      <Text style={styles.rv}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(5), paddingTop: insets.top + space(4) }}>
      <Text style={styles.h}>Profile</Text>
      <View style={styles.card}>
        <Row label="School" value={SCHOOL_NAME} />
        <Row label="Role" value={session?.role || "—"} />
        <Row label="Account" value={session?.userId ? session.userId.slice(0, 8) + "…" : "—"} last />
      </View>
      <TouchableOpacity style={styles.signout} onPress={signOut} activeOpacity={0.85}>
        <Text style={styles.signoutText}>Sign out</Text>
      </TouchableOpacity>
      <Text style={styles.foot}>Powered by Erpcore</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 22, fontWeight: "800", color: colors.ink, marginBottom: space(5) },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space(5) },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: space(4), borderBottomWidth: 1, borderBottomColor: colors.line },
  rl: { fontSize: 14, color: colors.sub },
  rv: { fontSize: 14, fontWeight: "700", color: colors.ink },
  signout: { marginTop: space(6), backgroundColor: "#FCEBE7", borderRadius: radius.md, paddingVertical: space(4), alignItems: "center" },
  signoutText: { color: colors.danger, fontSize: 15, fontWeight: "700" },
  foot: { textAlign: "center", color: colors.sub, fontSize: 12, marginTop: space(8) },
});

import React, { useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getStudentLeaves, setStudentLeaveStatus } from "../api/leaveApprovals";
import { useAsyncData } from "../lib/useAsyncData";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

export default function LeaveApprovalsScreen() {
  const { data, loading, refreshing, error, reload } = useAsyncData(() => getStudentLeaves("Pending"), []);
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, status: "Approved" | "Rejected") => {
    setBusy(id);
    try {
      await setStudentLeaveStatus(id, status);
      reload();
    } catch {
      Alert.alert("Couldn't update", "Please try again when you're online.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Loader />;
  if (error) return <StateView text="Couldn't load leave requests." onRetry={reload} />;
  const items = data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      {items.length === 0 ? (
        <Empty text="No pending leave requests." />
      ) : (
        items.map((l) => (
          <View key={l.id} style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.name}>{l.student_name}</Text>
              <Text style={styles.type}>{l.leave_type}</Text>
            </View>
            {l.admission_number ? <Text style={styles.adm}>{l.admission_number}</Text> : null}
            <Text style={styles.range}>
              {l.from_date} → {l.to_date}
            </Text>
            {l.reason ? (
              <Text style={styles.reason} numberOfLines={3}>
                {l.reason}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.btn, styles.reject]} disabled={busy === l.id} onPress={() => act(l.id, "Rejected")} activeOpacity={0.85}>
                <Text style={styles.rejectText}>{busy === l.id ? "…" : "Reject"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.approve]} disabled={busy === l.id} onPress={() => act(l.id, "Approved")} activeOpacity={0.85}>
                <Text style={styles.approveText}>{busy === l.id ? "…" : "Approve"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space(5), marginBottom: space(3) },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "800", color: colors.ink, flex: 1 },
  type: { fontSize: 11, fontWeight: "800", color: colors.goldDeep, backgroundColor: colors.goldSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  adm: { fontSize: 12, color: colors.sub, marginTop: 2 },
  range: { fontSize: 13, fontWeight: "600", color: colors.sub, marginTop: space(3) },
  reason: { fontSize: 14, color: colors.sub, marginTop: space(2), lineHeight: 20 },
  actions: { flexDirection: "row", gap: space(2), marginTop: space(4) },
  btn: { flex: 1, paddingVertical: space(3), borderRadius: radius.md, alignItems: "center" },
  reject: { borderWidth: 1, borderColor: colors.danger, backgroundColor: "#FCEBE7" },
  rejectText: { color: colors.danger, fontWeight: "700", fontSize: 14 },
  approve: { backgroundColor: colors.good },
  approveText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

import React from "react";
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getOverview } from "../api/overview";
import { useAsyncData } from "../lib/useAsyncData";
import { useChild } from "../child/ChildContext";
import { Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

const inr = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");

function initials(name?: string) {
  if (!name) return "?";
  const p = name.trim().split(" ");
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

function StatCard({ icon, label, value, tint }: { icon: any; label: string; value: string; tint?: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={tint || colors.goldDeep} />
      <Text style={[styles.statVal, tint ? { color: tint } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function OverviewScreen() {
  const { selected } = useChild();
  const { data, loading, refreshing, error, reload } = useAsyncData(
    () => getOverview(selected ? { studentId: selected.id, classId: selected.classId, sectionId: selected.sectionId } : undefined),
    [selected?.id]
  );

  if (loading) return <Loader />;
  if (error || !data) return <StateView text="Couldn't load the overview." onRetry={reload} />;

  const np = data.next_period;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      <View style={styles.header}>
        {data.photo_url ? (
          <Image source={{ uri: data.photo_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>{initials(data.name)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{data.name}</Text>
          {data.class_label ? <Text style={styles.cls}>Class {data.class_label}</Text> : null}
        </View>
      </View>

      <View style={styles.row}>
        <StatCard icon="calendar-outline" label="Attendance" value={`${data.attendance_pct}%`} />
        <StatCard icon="card-outline" label="Balance due" value={inr(data.balance)} tint={data.balance > 0 ? colors.danger : colors.good} />
      </View>

      <View style={styles.nextCard}>
        <Text style={styles.nextLabel}>NEXT PERIOD</Text>
        {np && np.subject ? (
          <>
            <Text style={styles.nextSubject}>{np.subject}</Text>
            <Text style={styles.nextMeta}>
              {[np.start_time, np.teacher].filter(Boolean).join(" · ") || "Today"}
            </Text>
          </>
        ) : (
          <Text style={styles.nextMeta}>No more periods today.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: space(3), marginBottom: space(6) },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 22, fontWeight: "800", color: colors.goldDeep },
  name: { fontSize: 20, fontWeight: "800", color: colors.ink },
  cls: { fontSize: 14, color: colors.sub, marginTop: 2 },
  row: { flexDirection: "row", gap: space(3), marginBottom: space(3) },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space(5) },
  statVal: { fontSize: 22, fontWeight: "800", color: colors.ink, marginTop: space(2) },
  statLabel: { fontSize: 12, color: colors.sub, marginTop: 2 },
  nextCard: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: space(5) },
  nextLabel: { fontSize: 11, fontWeight: "800", color: colors.goldSoft, letterSpacing: 1 },
  nextSubject: { fontSize: 20, fontWeight: "800", color: colors.white, marginTop: space(2) },
  nextMeta: { fontSize: 13, color: "#B9B8AE", marginTop: space(2) },
});

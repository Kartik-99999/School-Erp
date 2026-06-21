import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { getMyAttendance } from "../api/portal";
import { useAsyncData } from "../lib/useAsyncData";
import { useChild } from "../child/ChildContext";
import { ChildHeader } from "../components/child";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

function badge(status: string) {
  const m: Record<string, any> = {
    Present: { backgroundColor: "#E7F3EC", color: "#15803D" },
    Absent: { backgroundColor: "#FCEBE7", color: "#C2410C" },
    Late: { backgroundColor: "#FBF1DC", color: "#8C6B22" },
    "Half Day": { backgroundColor: "#EFEDF6", color: "#5B5390" },
  };
  return m[status] || { backgroundColor: colors.line, color: colors.sub };
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AttendanceScreen() {
  const { selected } = useChild();
  const { data, loading, refreshing, error, reload } = useAsyncData(
    () => getMyAttendance(selected?.id),
    [selected?.id]
  );

  if (loading) return <Loader />;
  if (error || !data) return <StateView text="Couldn't load attendance." onRetry={reload} />;
  const s = data.summary;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      <ChildHeader />
      <View style={styles.ring}>
        <Text style={styles.pct}>{s.percentage}%</Text>
        <Text style={styles.pctsub}>present</Text>
      </View>
      <View style={styles.row}>
        <Stat label="Present" value={s.present} />
        <Stat label="Absent" value={s.absent} />
        <Stat label="Late" value={s.late} />
        <Stat label="Total" value={s.total} />
      </View>
      <Text style={styles.h}>Recent</Text>
      {data.records.length === 0 ? (
        <Empty text="No attendance records yet." />
      ) : (
        data.records.slice(0, 30).map((r, i) => (
          <View key={i} style={styles.recRow}>
            <Text style={styles.recDate}>{r.date}</Text>
            <Text style={[styles.badge, badge(r.status)]}>{r.status}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ring: { alignItems: "center", justifyContent: "center", alignSelf: "center", width: 140, height: 140, borderRadius: 70, borderWidth: 8, borderColor: colors.goldSoft, marginVertical: space(4) },
  pct: { fontSize: 30, fontWeight: "800", color: colors.ink },
  pctsub: { fontSize: 12, color: colors.sub },
  row: { flexDirection: "row", gap: space(2), marginBottom: space(6) },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingVertical: space(3), alignItems: "center" },
  statVal: { fontSize: 18, fontWeight: "800", color: colors.ink },
  statLabel: { fontSize: 11, color: colors.sub, marginTop: 2 },
  h: { fontSize: 14, fontWeight: "800", color: colors.ink, marginBottom: space(3) },
  recRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space(4), paddingVertical: space(3), marginBottom: space(2) },
  recDate: { fontSize: 13, color: colors.ink },
  badge: { fontSize: 11, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
});

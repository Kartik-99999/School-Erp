import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { getExamResults } from "../api/exams";
import { useAsyncData } from "../lib/useAsyncData";
import { useChild } from "../child/ChildContext";
import { ChildHeader } from "../components/child";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

function statusStyle(status?: string) {
  if (status === "Fail") return { backgroundColor: "#FCEBE7", color: colors.danger };
  if (status === "Pass") return { backgroundColor: "#E7F3EC", color: colors.good };
  return { backgroundColor: colors.line, color: colors.sub };
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricVal}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export default function ExamsScreen() {
  const { selected } = useChild();
  const { data, loading, refreshing, error, reload } = useAsyncData(
    () => getExamResults(selected?.id),
    [selected?.id]
  );

  if (loading) return <Loader />;
  if (error) return <StateView text="Couldn't load results." onRetry={reload} />;
  const items = data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      <ChildHeader />
      {items.length === 0 ? (
        <Empty text="No published results yet." />
      ) : (
        items.map((r) => (
          <View key={r.exam_id} style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.name}>{r.exam_name}</Text>
              {r.status ? <Text style={[styles.badge, statusStyle(r.status)]}>{r.status}</Text> : null}
            </View>
            <View style={styles.row}>
              <Metric label="Score" value={`${r.obtained_marks}/${r.total_marks}`} />
              <Metric label="Percent" value={`${r.percentage}%`} />
              <Metric label="Grade" value={r.grade || "—"} />
              {r.rank ? <Metric label="Rank" value={`#${r.rank}`} /> : null}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space(5), marginBottom: space(3) },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space(4) },
  name: { fontSize: 16, fontWeight: "800", color: colors.ink, flex: 1 },
  badge: { fontSize: 11, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: "hidden", marginLeft: space(2) },
  row: { flexDirection: "row", gap: space(2) },
  metric: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: space(3), alignItems: "center" },
  metricVal: { fontSize: 16, fontWeight: "800", color: colors.ink },
  metricLabel: { fontSize: 11, color: colors.sub, marginTop: 2 },
});

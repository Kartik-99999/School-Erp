import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { getReportCard } from "../api/exams";
import { useAsyncData } from "../lib/useAsyncData";
import { Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.sumRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={styles.sumValue}>{value}</Text>
    </View>
  );
}

export default function ReportCardScreen({ route }: any) {
  const { examId, studentId } = route.params || {};
  const { data, loading, refreshing, error, reload } = useAsyncData(
    () => getReportCard(examId, studentId),
    [examId, studentId]
  );

  if (loading) return <Loader />;
  if (error || !data) return <StateView text="Couldn't load the report card." onRetry={reload} />;
  const s = data.summary;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      <Text style={styles.exam}>{data.exam.name}</Text>
      <Text style={styles.stu}>
        {data.student.name}
        {data.student.class_name ? ` · Class ${data.student.class_name}` : ""}
      </Text>

      <View style={styles.table}>
        <View style={[styles.row, styles.thead]}>
          <Text style={[styles.cSub, styles.th]}>Subject</Text>
          <Text style={[styles.cNum, styles.th]}>Max</Text>
          <Text style={[styles.cNum, styles.th]}>Got</Text>
          <Text style={[styles.cGrade, styles.th]}>Grade</Text>
        </View>
        {data.subjects.map((sub, i) => (
          <View key={sub.subject_id || String(i)} style={[styles.row, i === data.subjects.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={styles.cSub}>{sub.subject_name}</Text>
            <Text style={styles.cNum}>{sub.max_marks}</Text>
            <Text style={[styles.cNum, sub.is_absent && { color: colors.danger }]}>
              {sub.is_absent ? "AB" : sub.obtained ?? "—"}
            </Text>
            <Text style={styles.cGrade}>{sub.grade || "—"}</Text>
          </View>
        ))}
      </View>

      <View style={styles.summary}>
        <SummaryRow label="Total" value={`${s.obtained_marks} / ${s.total_marks}`} />
        <SummaryRow label="Percentage" value={`${s.percentage}%`} />
        {s.grade ? <SummaryRow label="Grade" value={s.grade} /> : null}
        {s.rank != null ? <SummaryRow label="Rank" value={`#${s.rank}`} /> : null}
        {s.status ? <SummaryRow label="Result" value={s.status} last /> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  exam: { fontSize: 20, fontWeight: "800", color: colors.ink },
  stu: { fontSize: 14, color: colors.sub, marginTop: 2, marginBottom: space(5) },
  table: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: "hidden", marginBottom: space(5) },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: space(4), paddingVertical: space(3), borderBottomWidth: 1, borderBottomColor: colors.line },
  thead: { backgroundColor: colors.bg },
  th: { fontSize: 11, fontWeight: "800", color: colors.sub, letterSpacing: 0.4 },
  cSub: { flex: 1, fontSize: 14, color: colors.ink, fontWeight: "600" },
  cNum: { width: 48, textAlign: "center", fontSize: 14, color: colors.ink },
  cGrade: { width: 52, textAlign: "center", fontSize: 14, fontWeight: "800", color: colors.goldDeep },
  summary: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space(5) },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: space(4), borderBottomWidth: 1, borderBottomColor: colors.line },
  sumLabel: { fontSize: 14, color: colors.sub },
  sumValue: { fontSize: 14, fontWeight: "800", color: colors.ink },
});

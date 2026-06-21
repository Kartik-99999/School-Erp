import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getSyllabus } from "../api/syllabus";
import { useAsyncData } from "../lib/useAsyncData";
import { useChild } from "../child/ChildContext";
import { ChildHeader } from "../components/child";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

function Bar({ percent }: { percent: number }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${percent}%` }]} />
    </View>
  );
}

export default function LessonPlannerScreen() {
  const { selected } = useChild();
  const { data, loading, refreshing, error, reload } = useAsyncData(
    () => getSyllabus(selected?.id),
    [selected?.id]
  );

  if (loading) return <Loader />;
  if (error || !data) return <StateView text="Couldn't load the syllabus." onRetry={reload} />;
  const subjects = data.subjects ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      <ChildHeader />
      {subjects.length === 0 ? (
        <Empty text="No syllabus published yet." />
      ) : (
        <>
          <View style={styles.overall}>
            <Text style={styles.overallPct}>{data.overall.percent}%</Text>
            <Text style={styles.overallSub}>
              {data.overall.completed} of {data.overall.total} chapters completed
            </Text>
            <Bar percent={data.overall.percent} />
          </View>
          {subjects.map((sub) => (
            <View key={sub.subject_id} style={styles.card}>
              <View style={styles.shead}>
                <Text style={styles.sname}>{sub.subject_name}</Text>
                <Text style={styles.spct}>{sub.percent}%</Text>
              </View>
              <Bar percent={sub.percent} />
              <View style={{ marginTop: space(3) }}>
                {sub.chapters.map((c) => (
                  <View key={c.id} style={styles.chRow}>
                    <Ionicons
                      name={c.completed ? "checkmark-circle" : "ellipse-outline"}
                      size={18}
                      color={c.completed ? colors.good : colors.sub}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.chName, c.completed && { color: colors.sub }]}>{c.chapter_name}</Text>
                      {c.description ? <Text style={styles.chDesc}>{c.description}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  overall: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: space(5), marginBottom: space(4) },
  overallPct: { fontSize: 30, fontWeight: "800", color: colors.white },
  overallSub: { fontSize: 13, color: "#B9B8AE", marginTop: 2, marginBottom: space(3) },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space(5), marginBottom: space(3) },
  shead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space(2) },
  sname: { fontSize: 16, fontWeight: "800", color: colors.ink },
  spct: { fontSize: 14, fontWeight: "800", color: colors.goldDeep },
  barTrack: { height: 8, borderRadius: 999, backgroundColor: colors.line, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 999, backgroundColor: colors.gold },
  chRow: { flexDirection: "row", alignItems: "flex-start", gap: space(2), paddingVertical: space(2) },
  chName: { fontSize: 14, fontWeight: "600", color: colors.ink },
  chDesc: { fontSize: 12, color: colors.sub, marginTop: 1 },
});

import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { getTimetable } from "../api/portal";
import { useAsyncData } from "../lib/useAsyncData";
import { useChild } from "../child/ChildContext";
import { ChildHeader } from "../components/child";
import { Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

export default function TimetableScreen() {
  const { selected } = useChild();
  const { data, loading, refreshing, error, reload } = useAsyncData(
    () => getTimetable(selected ? { classId: selected.classId, sectionId: selected.sectionId } : undefined),
    [selected?.id]
  );

  if (loading) return <Loader />;
  if (error) return <StateView text="Couldn't load the timetable." onRetry={reload} />;
  const days = data ?? [];
  if (days.length === 0) return <StateView icon="calendar-outline" text="No timetable published yet." onRetry={reload} />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      <ChildHeader />
      {days.map((d) => (
        <View key={d.day} style={{ marginBottom: space(6) }}>
          <Text style={styles.day}>{d.day}</Text>
          {d.periods.map((p, i) => (
            <View key={i} style={styles.row}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{String(p.period ?? i + 1)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.subj}>{p.subject || "—"}</Text>
                {p.teacher ? <Text style={styles.teacher}>{p.teacher}</Text> : null}
              </View>
              {p.start_time || p.end_time ? (
                <Text style={styles.time}>
                  {p.start_time}
                  {p.end_time ? `\n${p.end_time}` : ""}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  day: { fontSize: 13, fontWeight: "800", color: colors.gold, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: space(3) },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space(3), marginBottom: space(2), gap: space(3) },
  pill: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" },
  pillText: { fontSize: 13, fontWeight: "800", color: colors.goldDeep },
  subj: { fontSize: 14, fontWeight: "700", color: colors.ink },
  teacher: { fontSize: 12, color: colors.sub, marginTop: 1 },
  time: { fontSize: 11, color: colors.sub, textAlign: "right" },
});

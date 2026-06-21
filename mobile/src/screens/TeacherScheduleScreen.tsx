import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { getMySchedule, ScheduleDay } from "../api/teacher";
import { Empty, Loader } from "../ui";
import { colors, radius, space } from "../theme";

export default function TeacherScheduleScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setDays(await getMySchedule(session?.userId));
      } catch {
        setErr("Couldn't load your schedule.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loader />;
  if (err || days.length === 0) return <Empty text={err || "No schedule published yet."} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(5) }}>
      {days.map((d) => (
        <View key={d.day} style={{ marginBottom: space(6) }}>
          <Text style={styles.day}>{d.day}</Text>
          {d.entries.map((e, i) =>
            e.is_break ? (
              <View key={i} style={styles.breakRow}>
                <Text style={styles.breakText}>Break</Text>
                {e.start_time ? <Text style={styles.time}>{e.start_time}</Text> : null}
              </View>
            ) : (
              <View key={i} style={styles.row}>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{String(e.period_name || i + 1)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cls}>{[e.class_name, e.section_name].filter(Boolean).join("-") || "Class"}</Text>
                  {e.subject_name ? <Text style={styles.subj}>{e.subject_name}</Text> : null}
                </View>
                {e.start_time || e.end_time ? (
                  <Text style={styles.time}>
                    {e.start_time}
                    {e.end_time ? `\n${e.end_time}` : ""}
                  </Text>
                ) : null}
              </View>
            )
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  day: { fontSize: 13, fontWeight: "800", color: colors.gold, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: space(3) },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space(3), marginBottom: space(2), gap: space(3) },
  pill: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" },
  pillText: { fontSize: 12, fontWeight: "800", color: colors.goldDeep },
  cls: { fontSize: 14, fontWeight: "700", color: colors.ink },
  subj: { fontSize: 12, color: colors.sub, marginTop: 1 },
  time: { fontSize: 11, color: colors.sub, textAlign: "right" },
  breakRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: space(2), paddingHorizontal: space(3), marginBottom: space(2) },
  breakText: { fontSize: 12, fontWeight: "700", color: colors.sub, fontStyle: "italic" },
});

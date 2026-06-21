import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getSectionStudents, SectionStudent, submitAttendance } from "../api/teacher";
import { Empty, Loader } from "../ui";
import { colors, radius, space } from "../theme";

const STATUSES = ["Present", "Absent", "Late"];
const ON_COLOR: Record<string, string> = { Present: "#15803D", Absent: "#C2410C", Late: "#8C6B22" };

export default function MarkAttendanceScreen({ route, navigation }: any) {
  const { classId, sectionId, label } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<SectionStudent[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (navigation.setOptions) navigation.setOptions({ title: label || "Mark attendance" });
    (async () => {
      try {
        const list = await getSectionStudents(classId, sectionId);
        setStudents(list);
        const init: Record<string, string> = {};
        list.forEach((s) => (init[s.id] = "Present"));
        setMarks(init);
      } catch {
        setErr("Couldn't load students.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (id: string, st: string) => setMarks((p) => ({ ...p, [id]: st }));

  const save = async () => {
    setSaving(true);
    try {
      await submitAttendance(classId, sectionId, students.map((s) => ({ student_id: s.id, status: marks[s.id] || "Present" })));
      Alert.alert("Saved", `Attendance recorded for ${label || "the class"}.`);
      navigation.goBack();
    } catch {
      Alert.alert("Couldn't save", "Please try again when you're online.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (err || students.length === 0) return <Empty text={err || "No students in this section."} />;
  const present = Object.values(marks).filter((v) => v === "Present").length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space(5), paddingBottom: space(28) }}>
        <Text style={styles.summary}>{present}/{students.length} present</Text>
        {students.map((s) => (
          <View key={s.id} style={styles.card}>
            <View style={styles.head}>
              {s.roll ? <Text style={styles.roll}>{s.roll}</Text> : null}
              <Text style={styles.name}>{s.name}</Text>
            </View>
            <View style={styles.seg}>
              {STATUSES.map((st) => {
                const on = marks[s.id] === st;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[styles.segBtn, on && { backgroundColor: ON_COLOR[st], borderColor: ON_COLOR[st] }]}
                    onPress={() => set(s.id, st)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segText, on && { color: "#fff" }]}>{st}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.save, saving && { opacity: 0.7 }]} onPress={save} disabled={saving} activeOpacity={0.85}>
          <Text style={styles.saveText}>{saving ? "Saving…" : "Save attendance"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { fontSize: 13, fontWeight: "700", color: colors.sub, marginBottom: space(3) },
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space(4), marginBottom: space(2) },
  head: { flexDirection: "row", alignItems: "center", gap: space(2), marginBottom: space(3) },
  roll: { fontSize: 12, fontWeight: "800", color: colors.goldDeep, backgroundColor: colors.goldSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  name: { fontSize: 15, fontWeight: "700", color: colors.ink },
  seg: { flexDirection: "row", gap: space(2) },
  segBtn: { flex: 1, paddingVertical: space(2), borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, alignItems: "center", backgroundColor: colors.bg },
  segText: { fontSize: 13, fontWeight: "700", color: colors.sub },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: space(4), backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line },
  save: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: space(4), alignItems: "center" },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

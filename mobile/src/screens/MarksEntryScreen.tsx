import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import {
  ExamLite,
  ExamScheduleLite,
  getExamSchedules,
  getMarksRoster,
  getMyClasses,
  getTeacherExams,
  MarkInput,
  MarkSubmit,
  submitMarks,
} from "../api/teacher";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

export default function MarksEntryScreen() {
  const { session } = useAuth();
  const [exams, setExams] = useState<ExamLite[]>([]);
  const [exam, setExam] = useState<ExamLite | null>(null);
  const [schedules, setSchedules] = useState<ExamScheduleLite[]>([]);
  const [sched, setSched] = useState<ExamScheduleLite | null>(null);
  const [rows, setRows] = useState<MarkInput[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [rosterLoading, setRosterLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadExams = useCallback(async () => {
    setPhase("loading");
    try {
      const classes = await getMyClasses(session?.userId);
      const ids = Array.from(new Set(classes.map((c) => c.class_id)));
      setExams(await getTeacherExams(ids));
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }, [session?.userId]);
  useEffect(() => {
    loadExams();
  }, [loadExams]);

  useEffect(() => {
    if (!exam) {
      setSchedules([]);
      setSched(null);
      return;
    }
    let active = true;
    (async () => {
      try {
        const s = await getExamSchedules(exam.id);
        if (active) {
          setSchedules(s);
          setSched(null);
          setRows([]);
        }
      } catch {
        if (active) setSchedules([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [exam?.id]);

  useEffect(() => {
    if (!exam || !sched) {
      setRows([]);
      return;
    }
    let active = true;
    setRosterLoading(true);
    (async () => {
      try {
        const r = await getMarksRoster(exam.class_id, sched.id);
        if (active) setRows(r);
      } catch {
        if (active) setRows([]);
      } finally {
        if (active) setRosterLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [exam?.id, sched?.id]);

  const setMark = (id: string, v: string) =>
    setRows((p) => p.map((r) => (r.student_id === id ? { ...r, marks_obtained: v } : r)));
  const toggleAbsent = (id: string) =>
    setRows((p) =>
      p.map((r) =>
        r.student_id === id ? { ...r, is_absent: !r.is_absent, marks_obtained: !r.is_absent ? "" : r.marks_obtained } : r
      )
    );

  const save = async () => {
    if (!sched) return;
    const max = sched.max_marks;
    for (const r of rows) {
      if (r.is_absent || r.marks_obtained === "") continue;
      const n = Number(r.marks_obtained);
      if (isNaN(n) || n < 0 || n > max) {
        Alert.alert("Check marks", `${r.name}: enter a number between 0 and ${max}.`);
        return;
      }
    }
    const payload: MarkSubmit[] = rows.map((r) => ({
      student_id: r.student_id,
      marks_obtained: r.is_absent || r.marks_obtained === "" ? null : Number(r.marks_obtained),
      is_absent: r.is_absent,
    }));
    setSaving(true);
    try {
      await submitMarks(sched.id, payload);
      Alert.alert("Saved", "Marks have been submitted.");
    } catch {
      Alert.alert("Couldn't save", "Please try again when you're online.");
    } finally {
      setSaving(false);
    }
  };

  if (phase === "loading") return <Loader />;
  if (phase === "error") return <StateView text="Couldn't load exams." onRetry={loadExams} />;
  if (exams.length === 0) return <Empty text="No exams for your classes yet." />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space(5), paddingBottom: sched && rows.length > 0 ? space(28) : space(5) }}>
        <Text style={styles.label}>Exam</Text>
        <View style={styles.wrap}>
          {exams.map((e) => {
            const on = e.id === exam?.id;
            return (
              <TouchableOpacity key={e.id} style={[styles.chip, on && styles.chipOn]} onPress={() => setExam(e)} activeOpacity={0.85}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{e.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {exam ? (
          <>
            <Text style={styles.label}>Subject</Text>
            {schedules.length === 0 ? (
              <Text style={styles.muted}>No subjects scheduled for this exam.</Text>
            ) : (
              <View style={styles.wrap}>
                {schedules.map((s) => {
                  const on = s.id === sched?.id;
                  return (
                    <TouchableOpacity key={s.id} style={[styles.chip, on && styles.chipOn]} onPress={() => setSched(s)} activeOpacity={0.85}>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{s.subject_name || "Subject"}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        ) : null}

        {sched ? (
          rosterLoading ? (
            <Text style={styles.muted}>Loading students…</Text>
          ) : rows.length === 0 ? (
            <Empty text="No students in this class." />
          ) : (
            <>
              <Text style={styles.hint}>
                Out of {sched.max_marks} · pass {sched.passing_marks}
              </Text>
              {rows.map((r) => (
                <View key={r.student_id} style={styles.row}>
                  <View style={styles.who}>
                    {r.roll ? <Text style={styles.roll}>{r.roll}</Text> : null}
                    <Text style={styles.name} numberOfLines={1}>
                      {r.name}
                    </Text>
                  </View>
                  <TouchableOpacity style={[styles.absent, r.is_absent && styles.absentOn]} onPress={() => toggleAbsent(r.student_id)} activeOpacity={0.85}>
                    <Text style={[styles.absentText, r.is_absent && styles.absentTextOn]}>AB</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.mark, r.is_absent && { opacity: 0.4 }]}
                    editable={!r.is_absent}
                    value={r.is_absent ? "" : r.marks_obtained}
                    onChangeText={(v) => setMark(r.student_id, v.replace(/[^0-9.]/g, ""))}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={colors.sub}
                  />
                </View>
              ))}
            </>
          )
        ) : null}
      </ScrollView>

      {sched && rows.length > 0 ? (
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.save, saving && { opacity: 0.7 }]} onPress={save} disabled={saving} activeOpacity={0.85}>
            <Text style={styles.saveText}>{saving ? "Saving…" : "Submit marks"}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "800", color: colors.sub, marginBottom: space(2), marginTop: space(3), letterSpacing: 0.5 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  chip: { paddingHorizontal: space(4), paddingVertical: space(2), borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.sub },
  chipTextOn: { color: colors.goldDeep },
  muted: { fontSize: 13, color: colors.sub, paddingVertical: space(2) },
  hint: { fontSize: 12, fontWeight: "700", color: colors.sub, marginTop: space(4), marginBottom: space(3) },
  row: { flexDirection: "row", alignItems: "center", gap: space(2), backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space(3), paddingVertical: space(2), marginBottom: space(2) },
  who: { flex: 1, flexDirection: "row", alignItems: "center", gap: space(2) },
  roll: { fontSize: 12, fontWeight: "800", color: colors.goldDeep, backgroundColor: colors.goldSoft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  name: { fontSize: 14, fontWeight: "600", color: colors.ink, flexShrink: 1 },
  absent: { width: 36, height: 34, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  absentOn: { backgroundColor: colors.danger, borderColor: colors.danger },
  absentText: { fontSize: 12, fontWeight: "800", color: colors.sub },
  absentTextOn: { color: "#fff" },
  mark: { width: 56, height: 38, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg, textAlign: "center", fontSize: 15, fontWeight: "700", color: colors.ink },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: space(4), backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line },
  save: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: space(4), alignItems: "center" },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

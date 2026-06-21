import React, { useCallback, useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { createHomework, getClassHomework, getHomeworkMeta, getMyClasses, HomeworkMeta, TeacherClass } from "../api/teacher";
import { useAsyncData } from "../lib/useAsyncData";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

const today = () => new Date().toISOString().slice(0, 10);

export default function TeacherHomeworkScreen() {
  const { session } = useAuth();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [sel, setSel] = useState<TeacherClass | null>(null);
  const [clsLoading, setClsLoading] = useState(true);
  const [clsErr, setClsErr] = useState(false);
  const [meta, setMeta] = useState<HomeworkMeta | null>(null);

  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(today());
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const loadClasses = useCallback(async () => {
    setClsLoading(true);
    setClsErr(false);
    try {
      const c = await getMyClasses(session?.userId);
      setClasses(c);
      setSel((prev) => prev ?? c[0] ?? null);
    } catch {
      setClsErr(true);
    } finally {
      setClsLoading(false);
    }
  }, [session?.userId]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // Supporting data (subjects/teacher/year) for the selected class.
  useEffect(() => {
    let active = true;
    if (!sel) return;
    (async () => {
      try {
        const m = await getHomeworkMeta(sel.class_id, session?.userId);
        if (!active) return;
        setMeta(m);
        setSubjectId((prev) => prev || m.subjects[0]?.id || "");
      } catch {
        /* form can still open; subject picker may just be empty */
      }
    })();
    return () => {
      active = false;
    };
  }, [sel?.class_id, session?.userId]);

  const { data: hw, loading, refreshing, error, reload } = useAsyncData(
    () => (sel ? getClassHomework(sel.class_id, sel.section_id) : Promise.resolve([])),
    [sel?.class_id, sel?.section_id]
  );

  const subjectName = (id?: string) => meta?.subjects.find((s) => s.id === id)?.name;

  const save = async () => {
    if (!sel) return;
    if (!title.trim()) return Alert.alert("Add a title", "Please enter a homework title.");
    if (!subjectId) return Alert.alert("Pick a subject", "Please choose a subject.");
    setSaving(true);
    try {
      await createHomework(
        { class_id: sel.class_id, section_id: sel.section_id, subject_id: subjectId, title: title.trim(), description: desc.trim(), due_date: due },
        meta ?? { teacherId: "", academicYearId: "", subjects: [] }
      );
      Alert.alert("Posted", "Homework has been posted to the class.");
      setOpen(false);
      setTitle("");
      setDesc("");
      reload();
    } catch {
      Alert.alert("Couldn't post", "Please try again when you're online.");
    } finally {
      setSaving(false);
    }
  };

  if (clsLoading) return <Loader />;
  if (clsErr) return <StateView text="Couldn't load your classes." onRetry={loadClasses} />;
  if (classes.length === 0) return <Empty text="No classes assigned to you." />;
  const items = hw ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2) }} style={{ marginBottom: space(4) }}>
        {classes.map((c) => {
          const on = sel?.class_id === c.class_id && sel?.section_id === c.section_id;
          return (
            <TouchableOpacity key={`${c.class_id}-${c.section_id}`} onPress={() => setSel(c)} activeOpacity={0.85} style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.newBtn} onPress={() => setOpen((v) => !v)} activeOpacity={0.85}>
        <Text style={styles.newBtnText}>{open ? "Cancel" : "Add homework"}</Text>
      </TouchableOpacity>

      {open ? (
        <View style={styles.form}>
          <Text style={styles.label}>Subject</Text>
          <View style={styles.subjects}>
            {(meta?.subjects ?? []).map((s) => {
              const on = s.id === subjectId;
              return (
                <TouchableOpacity key={s.id} style={[styles.chip, on && styles.chipOn]} onPress={() => setSubjectId(s.id)} activeOpacity={0.85}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{s.name}</Text>
                </TouchableOpacity>
              );
            })}
            {(meta?.subjects ?? []).length === 0 ? <Text style={styles.muted}>No subjects mapped to this class.</Text> : null}
          </View>
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Algebra — Exercise 4.3" placeholderTextColor={colors.sub} />
          <Text style={styles.label}>Due date</Text>
          <TextInput style={styles.input} value={due} onChangeText={setDue} placeholder="YYYY-MM-DD" placeholderTextColor={colors.sub} autoCapitalize="none" autoCorrect={false} />
          <Text style={styles.label}>Details</Text>
          <TextInput style={[styles.input, styles.multi]} value={desc} onChangeText={setDesc} placeholder="Instructions for students" placeholderTextColor={colors.sub} multiline />
          <TouchableOpacity style={[styles.submit, saving && { opacity: 0.7 }]} onPress={save} disabled={saving} activeOpacity={0.85}>
            <Text style={styles.submitText}>{saving ? "Posting…" : "Post homework"}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.h}>Assigned</Text>
      {loading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : error ? (
        <StateView text="Couldn't load homework." onRetry={reload} />
      ) : items.length === 0 ? (
        <Empty text="No homework for this class yet." />
      ) : (
        items.map((h, i) => (
          <View key={h.id || String(i)} style={styles.card}>
            <View style={styles.top}>
              {subjectName(h.subject_id) ? <Text style={styles.tag}>{subjectName(h.subject_id)!.toUpperCase()}</Text> : <View />}
              {h.due_date ? <Text style={styles.due}>Due {h.due_date}</Text> : null}
            </View>
            <Text style={styles.title}>{h.title}</Text>
            {h.description ? (
              <Text style={styles.desc} numberOfLines={3}>
                {h.description}
              </Text>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: space(4), paddingVertical: space(2), borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.sub },
  chipTextOn: { color: colors.goldDeep },
  newBtn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: space(3), alignItems: "center", marginBottom: space(4) },
  newBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  form: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space(5), marginBottom: space(6) },
  label: { fontSize: 12, fontWeight: "700", color: colors.sub, marginBottom: space(2), marginTop: space(2) },
  subjects: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: space(3), paddingVertical: space(3), fontSize: 14, color: colors.ink },
  multi: { minHeight: 72, textAlignVertical: "top" },
  submit: { backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: space(4), alignItems: "center", marginTop: space(4) },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  muted: { fontSize: 13, color: colors.sub, paddingVertical: space(2) },
  h: { fontSize: 14, fontWeight: "800", color: colors.ink, marginBottom: space(3) },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space(5), marginBottom: space(3) },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  tag: { fontSize: 10, fontWeight: "800", color: colors.gold, letterSpacing: 0.6 },
  due: { fontSize: 12, fontWeight: "700", color: colors.danger },
  title: { fontSize: 16, fontWeight: "700", color: colors.ink },
  desc: { fontSize: 14, color: colors.sub, marginTop: 6, lineHeight: 20 },
});

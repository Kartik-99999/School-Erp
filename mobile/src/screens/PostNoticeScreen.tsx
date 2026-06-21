import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { createNotice } from "../api/notices";
import { getMyClasses, TeacherClass } from "../api/teacher";
import { colors, radius, space } from "../theme";

const CATEGORIES = ["Notice", "Circular"];
const AUDIENCES = ["All", "Students", "Parents", "Teachers"];

function Chips({ options, value, onPick }: { options: string[]; value: string; onPick: (v: string) => void }) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => {
        const on = o === value;
        return (
          <TouchableOpacity key={o} style={[styles.chip, on && styles.chipOn]} onPress={() => onPick(o)} activeOpacity={0.85}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function PostNoticeScreen({ navigation }: any) {
  const { session } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Notice");
  const [audience, setAudience] = useState("All");
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setClasses(await getMyClasses(session?.userId));
      } catch {
        /* class targeting is optional */
      }
    })();
  }, [session?.userId]);

  // Unique classes (a teacher may take several sections of the same class).
  const classOptions = useMemo(() => {
    const seen: Record<string, string> = {};
    for (const c of classes) if (!seen[c.class_id]) seen[c.class_id] = c.name;
    return Object.entries(seen).map(([id, name]) => ({ id, name }));
  }, [classes]);

  const submit = async () => {
    if (!title.trim()) return Alert.alert("Add a title", "Please enter a title.");
    if (!body.trim()) return Alert.alert("Add a message", "Please enter the notice text.");
    setSaving(true);
    try {
      await createNotice({ title: title.trim(), body: body.trim(), category, target_audience: audience, target_class_id: classId });
      Alert.alert("Posted", "Your notice has been published.");
      navigation.goBack();
    } catch {
      Alert.alert("Couldn't post", "Please try again when you're online.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(5) }}>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Notice title" placeholderTextColor={colors.sub} />

      <Text style={styles.label}>Message</Text>
      <TextInput style={[styles.input, styles.multi]} value={body} onChangeText={setBody} placeholder="Write the notice…" placeholderTextColor={colors.sub} multiline />

      <Text style={styles.label}>Type</Text>
      <Chips options={CATEGORIES} value={category} onPick={setCategory} />

      <Text style={styles.label}>Audience</Text>
      <Chips options={AUDIENCES} value={audience} onPick={setAudience} />

      {classOptions.length > 0 ? (
        <>
          <Text style={styles.label}>Target class (optional)</Text>
          <View style={styles.wrap}>
            <TouchableOpacity style={[styles.chip, classId === null && styles.chipOn]} onPress={() => setClassId(null)} activeOpacity={0.85}>
              <Text style={[styles.chipText, classId === null && styles.chipTextOn]}>Whole school</Text>
            </TouchableOpacity>
            {classOptions.map((c) => {
              const on = c.id === classId;
              return (
                <TouchableOpacity key={c.id} style={[styles.chip, on && styles.chipOn]} onPress={() => setClassId(c.id)} activeOpacity={0.85}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : null}

      <TouchableOpacity style={[styles.submit, saving && { opacity: 0.7 }]} onPress={submit} disabled={saving} activeOpacity={0.85}>
        <Text style={styles.submitText}>{saving ? "Posting…" : "Publish notice"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "800", color: colors.sub, marginBottom: space(2), marginTop: space(4), letterSpacing: 0.5 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3), fontSize: 15, color: colors.ink },
  multi: { minHeight: 120, textAlignVertical: "top" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  chip: { paddingHorizontal: space(4), paddingVertical: space(2), borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.sub },
  chipTextOn: { color: colors.goldDeep },
  submit: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: space(4), alignItems: "center", marginTop: space(6) },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

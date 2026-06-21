import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import { getMyClasses, getSectionStudents, TeacherClass } from "../api/teacher";
import { useAsyncData } from "../lib/useAsyncData";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

export default function TeacherRosterScreen({ navigation }: any) {
  const { session } = useAuth();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [sel, setSel] = useState<TeacherClass | null>(null);
  const [clsLoading, setClsLoading] = useState(true);
  const [clsErr, setClsErr] = useState(false);

  const loadClasses = useCallback(async () => {
    setClsLoading(true);
    setClsErr(false);
    try {
      const c = await getMyClasses(session?.userId);
      setClasses(c);
      setSel((p) => p ?? c[0] ?? null);
    } catch {
      setClsErr(true);
    } finally {
      setClsLoading(false);
    }
  }, [session?.userId]);
  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const { data, loading, refreshing, error, reload } = useAsyncData(
    () => (sel ? getSectionStudents(sel.class_id, sel.section_id) : Promise.resolve([])),
    [sel?.class_id, sel?.section_id]
  );

  if (clsLoading) return <Loader />;
  if (clsErr) return <StateView text="Couldn't load your classes." onRetry={loadClasses} />;
  if (classes.length === 0) return <Empty text="No classes assigned to you." />;
  const items = data ?? [];

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

      {loading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : error ? (
        <StateView text="Couldn't load students." onRetry={reload} />
      ) : items.length === 0 ? (
        <Empty text="No students in this section." />
      ) : (
        <>
          <Text style={styles.count}>{items.length} students</Text>
          {items.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.row}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("StudentDetail", { studentId: s.id, name: s.name })}
            >
              {s.roll ? <Text style={styles.roll}>{s.roll}</Text> : null}
              <Text style={styles.name} numberOfLines={1}>
                {s.name}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.sub} />
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: space(4), paddingVertical: space(2), borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.sub },
  chipTextOn: { color: colors.goldDeep },
  muted: { fontSize: 13, color: colors.sub, paddingVertical: space(2) },
  count: { fontSize: 12, fontWeight: "700", color: colors.sub, marginBottom: space(3) },
  row: { flexDirection: "row", alignItems: "center", gap: space(3), backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space(4), paddingVertical: space(3), marginBottom: space(2) },
  roll: { fontSize: 12, fontWeight: "800", color: colors.goldDeep, backgroundColor: colors.goldSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  name: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.ink },
});

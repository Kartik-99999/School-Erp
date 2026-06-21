import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getSubjects } from "../api/portal";
import { useAsyncData } from "../lib/useAsyncData";
import { useChild } from "../child/ChildContext";
import { ChildHeader } from "../components/child";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

export default function SubjectsScreen() {
  const { selected } = useChild();
  const { data, loading, refreshing, error, reload } = useAsyncData(
    () => getSubjects(selected ? { classId: selected.classId, sectionId: selected.sectionId } : undefined),
    [selected?.id]
  );

  if (loading) return <Loader />;
  if (error) return <StateView text="Couldn't load subjects." onRetry={reload} />;
  const items = data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      <ChildHeader />
      {items.length === 0 ? (
        <Empty text="No subjects found in the timetable yet." />
      ) : (
        items.map((s, i) => (
          <View key={i} style={styles.row}>
            <View style={styles.icon}>
              <Ionicons name="book-outline" size={18} color={colors.goldDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{s.subject}</Text>
              {s.teacher ? <Text style={styles.teacher}>{s.teacher}</Text> : null}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space(3), backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space(4), marginBottom: space(2) },
  icon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "700", color: colors.ink },
  teacher: { fontSize: 13, color: colors.sub, marginTop: 2 },
});

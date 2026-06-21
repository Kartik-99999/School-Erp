import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { getHomework } from "../api/portal";
import { useAsyncData } from "../lib/useAsyncData";
import { useChild } from "../child/ChildContext";
import { ChildHeader } from "../components/child";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

function fmt(s?: string) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  } catch {
    return s;
  }
}

export default function HomeworkScreen() {
  const { selected } = useChild();
  const { data, loading, refreshing, error, reload } = useAsyncData(
    () => getHomework(selected ? { classId: selected.classId, sectionId: selected.sectionId } : undefined),
    [selected?.id]
  );

  if (loading) return <Loader />;
  if (error) return <StateView text="Couldn't load homework." onRetry={reload} />;
  const items = data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      <ChildHeader />
      {items.length === 0 ? (
        <Empty text="No homework assigned. Enjoy!" />
      ) : (
        items.map((h, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.top}>
              {h.subject ? <Text style={styles.tag}>{h.subject}</Text> : <View />}
              {h.due_date ? <Text style={styles.due}>Due {fmt(h.due_date)}</Text> : null}
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
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space(5), marginBottom: space(3) },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  tag: { fontSize: 10, fontWeight: "800", color: colors.gold, letterSpacing: 0.6, textTransform: "uppercase" },
  due: { fontSize: 12, fontWeight: "700", color: colors.danger },
  title: { fontSize: 16, fontWeight: "700", color: colors.ink },
  desc: { fontSize: 14, color: colors.sub, marginTop: 6, lineHeight: 20 },
});

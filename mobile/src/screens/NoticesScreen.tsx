import React from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getNotices } from "../api/portal";
import { useAsyncData } from "../lib/useAsyncData";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

function relative(s?: string) {
  if (!s) return "";
  try {
    const diff = Date.now() - new Date(s).getTime();
    const day = 86400000;
    if (diff < day) return "Today";
    if (diff < 2 * day) return "Yesterday";
    if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
    return new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return s;
  }
}

export default function NoticesScreen() {
  const insets = useSafeAreaInsets();
  const { data, loading, refreshing, error, reload } = useAsyncData(getNotices, []);

  if (loading) return <Loader />;
  if (error) return <StateView text="Couldn't load notices." onRetry={reload} />;
  const items = data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + space(2) }}>
      <Text style={styles.h}>Notices</Text>
      <FlatList
        data={items}
        keyExtractor={(n, i) => n.id || String(i)}
        contentContainerStyle={{ padding: space(5), paddingTop: space(3) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
        ListEmptyComponent={<Empty text="No notices yet." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.notice_type ? <Text style={styles.tag}>{item.notice_type.toUpperCase()}</Text> : null}
            <Text style={styles.title}>{item.title}</Text>
            {item.content ? (
              <Text style={styles.body} numberOfLines={4}>
                {item.content}
              </Text>
            ) : null}
            {item.created_at ? <Text style={styles.date}>{relative(item.created_at)}</Text> : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 22, fontWeight: "800", color: colors.ink, paddingHorizontal: space(5) },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space(5), marginBottom: space(3) },
  tag: { fontSize: 10, fontWeight: "800", color: colors.gold, letterSpacing: 0.8, marginBottom: 6 },
  title: { fontSize: 16, fontWeight: "700", color: colors.ink },
  body: { fontSize: 14, color: colors.sub, marginTop: 6, lineHeight: 20 },
  date: { fontSize: 12, color: colors.sub, marginTop: 10 },
});

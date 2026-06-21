import React, { useMemo, useState } from "react";
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getNotices, Notice } from "../api/portal";
import { getResources } from "../api/resources";
import { getEvents } from "../api/events";
import { useAsyncData } from "../lib/useAsyncData";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

type Kind = "Circular" | "Resource" | "Event";
interface Item {
  id: string;
  kind: Kind;
  title: string;
  subtitle?: string;
  date?: string;
  notice?: Notice;
  url?: string;
}

const FILTERS = ["All", "Circulars", "Resources", "Events", "Planners", "Polls"] as const;
type Filter = (typeof FILTERS)[number];
const KIND_ICON: Record<Kind, any> = {
  Circular: "notifications-outline",
  Resource: "folder-open-outline",
  Event: "calendar-clear-outline",
};

// Merge the existing communication reads into one newest-first feed.
async function loadTimeline(): Promise<Item[]> {
  const [notices, resources, events] = await Promise.all([getNotices(), getResources(), getEvents()]);
  const items: Item[] = [];
  for (const n of notices) items.push({ id: "n" + n.id, kind: "Circular", title: n.title, subtitle: n.content, date: n.created_at, notice: n });
  for (const r of resources) items.push({ id: "r" + r.id, kind: "Resource", title: r.title, subtitle: r.description || undefined, date: r.created_at, url: r.external_url || r.file_url || undefined });
  for (const e of events) items.push({ id: "e" + e.id, kind: "Event", title: e.title, subtitle: e.description || undefined, date: e.start_date });
  items.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return items;
}

export default function TimelineScreen({ navigation }: any) {
  const { data, loading, refreshing, error, reload } = useAsyncData(loadTimeline, []);
  const [filter, setFilter] = useState<Filter>("All");

  const items = useMemo(() => {
    const all = data ?? [];
    if (filter === "All") return all;
    if (filter === "Circulars") return all.filter((i) => i.kind === "Circular");
    if (filter === "Resources") return all.filter((i) => i.kind === "Resource");
    if (filter === "Events") return all.filter((i) => i.kind === "Event");
    return []; // Planners / Polls — backend pending
  }, [data, filter]);

  const onPress = (it: Item) => {
    if (it.kind === "Circular" && it.notice) {
      navigation.navigate("Notices", { screen: "NoticeDetail", params: { notice: it.notice } });
    } else if (it.kind === "Resource" && it.url) {
      Linking.openURL(it.url).catch(() => Alert.alert("Couldn't open", "Unable to open this resource."));
    }
  };

  if (loading) return <Loader />;
  if (error) return <StateView text="Couldn't load the timeline." onRetry={reload} />;
  const pending = filter === "Planners" || filter === "Polls";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2), paddingHorizontal: space(4), alignItems: "center" }} style={styles.chipsBar}>
        {FILTERS.map((f) => {
          const on = f === filter;
          return (
            <TouchableOpacity key={f} style={[styles.chip, on && styles.chipOn]} onPress={() => setFilter(f)} activeOpacity={0.85}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView
        contentContainerStyle={{ padding: space(5), paddingTop: space(2) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
      >
        {pending ? (
          <Empty text={`${filter} aren't available yet — coming soon.`} />
        ) : items.length === 0 ? (
          <Empty text="Nothing here yet." />
        ) : (
          items.map((it) => (
            <TouchableOpacity key={it.id} style={styles.card} activeOpacity={it.kind === "Event" ? 1 : 0.85} onPress={() => onPress(it)}>
              <View style={styles.top}>
                <View style={styles.kind}>
                  <Ionicons name={KIND_ICON[it.kind]} size={13} color={colors.goldDeep} />
                  <Text style={styles.kindText}>{it.kind}</Text>
                </View>
                {it.date ? <Text style={styles.date}>{it.date}</Text> : null}
              </View>
              <Text style={styles.title}>{it.title}</Text>
              {it.subtitle ? (
                <Text style={styles.sub} numberOfLines={2}>
                  {it.subtitle}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chipsBar: { height: 56, flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.bg },
  chip: { paddingHorizontal: space(4), paddingVertical: space(2), borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.sub },
  chipTextOn: { color: colors.goldDeep },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space(5), marginBottom: space(3) },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  kind: { flexDirection: "row", alignItems: "center", gap: 5 },
  kindText: { fontSize: 10, fontWeight: "800", color: colors.gold, letterSpacing: 0.6 },
  date: { fontSize: 12, color: colors.sub },
  title: { fontSize: 16, fontWeight: "700", color: colors.ink },
  sub: { fontSize: 14, color: colors.sub, marginTop: 6, lineHeight: 20 },
});

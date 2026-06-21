import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { getEvents } from "../api/events";
import { useAsyncData } from "../lib/useAsyncData";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

function chip(s: string) {
  try {
    const d = new Date(s);
    return { day: String(d.getDate()), mon: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase() };
  } catch {
    return { day: "•", mon: "" };
  }
}
function fmt(s?: string) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  } catch {
    return s;
  }
}

export default function EventsScreen() {
  const { data, loading, refreshing, error, reload } = useAsyncData(getEvents, []);

  if (loading) return <Loader />;
  if (error) return <StateView text="Couldn't load events." onRetry={reload} />;
  const items = data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      {items.length === 0 ? (
        <Empty text="No upcoming events." />
      ) : (
        items.map((e) => {
          const c = chip(e.start_date);
          const range = !!e.end_date && e.end_date !== e.start_date;
          return (
            <View key={e.id} style={styles.row}>
              <View style={styles.date}>
                <Text style={styles.day}>{c.day}</Text>
                <Text style={styles.mon}>{c.mon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.top}>
                  {e.event_type ? <Text style={styles.tag}>{e.event_type.toUpperCase()}</Text> : <View />}
                  {range ? <Text style={styles.range}>till {fmt(e.end_date)}</Text> : null}
                </View>
                <Text style={styles.title}>{e.title}</Text>
                {e.description ? (
                  <Text style={styles.desc} numberOfLines={2}>
                    {e.description}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space(3), backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space(4), marginBottom: space(3) },
  date: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" },
  day: { fontSize: 20, fontWeight: "800", color: colors.goldDeep, lineHeight: 22 },
  mon: { fontSize: 10, fontWeight: "800", color: colors.goldDeep, letterSpacing: 0.5 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tag: { fontSize: 10, fontWeight: "800", color: colors.gold, letterSpacing: 0.6 },
  range: { fontSize: 11, fontWeight: "600", color: colors.sub },
  title: { fontSize: 15, fontWeight: "700", color: colors.ink, marginTop: 2 },
  desc: { fontSize: 13, color: colors.sub, marginTop: 3, lineHeight: 18 },
});

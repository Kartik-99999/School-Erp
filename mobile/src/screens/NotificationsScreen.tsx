import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppNotification, getNotifications, markNotificationRead } from "../api/notifications";
import { useAsyncData } from "../lib/useAsyncData";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

const ICON: Record<string, any> = {
  notice: "notifications-outline",
  fee: "card-outline",
  absence: "calendar-outline",
  general: "information-circle-outline",
};

function relative(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const day = 86400000;
    if (diff < 3600000) return "Just now";
    if (diff < day) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

export default function NotificationsScreen({ navigation }: any) {
  const { data, loading, refreshing, error, reload } = useAsyncData(getNotifications, []);
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (data) setItems(data);
  }, [data]);

  const open = (n: AppNotification) => {
    if (!n.is_read) {
      markNotificationRead(n.id).catch(() => {});
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    // Deep-link to the related area.
    if (n.type === "notice") navigation.navigate("Notices");
    else if (n.type === "fee") navigation.navigate("Fees");
    else if (n.type === "absence") navigation.navigate("Attendance");
  };

  if (loading) return <Loader />;
  if (error) return <StateView text="Couldn't load notifications." onRetry={reload} />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      {items.length === 0 ? (
        <Empty text="No notifications yet." />
      ) : (
        items.map((n) => (
          <TouchableOpacity key={n.id} style={[styles.row, !n.is_read && styles.unread]} activeOpacity={0.85} onPress={() => open(n)}>
            <View style={styles.icon}>
              <Ionicons name={ICON[n.type] || ICON.general} size={18} color={colors.goldDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.top}>
                <Text style={[styles.title, !n.is_read && { fontWeight: "800" }]} numberOfLines={1}>
                  {n.title}
                </Text>
                <Text style={styles.time}>{relative(n.created_at)}</Text>
              </View>
              {n.body ? (
                <Text style={styles.body} numberOfLines={2}>
                  {n.body}
                </Text>
              ) : null}
            </View>
            {!n.is_read ? <View style={styles.dot} /> : null}
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space(3), backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space(4), marginBottom: space(2) },
  unread: { borderColor: colors.gold, backgroundColor: "#FFFDF7" },
  icon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 14, fontWeight: "600", color: colors.ink, flex: 1 },
  time: { fontSize: 11, color: colors.sub, marginLeft: space(2) },
  body: { fontSize: 13, color: colors.sub, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
});

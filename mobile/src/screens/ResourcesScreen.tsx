import React from "react";
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getResources, Resource } from "../api/resources";
import { useAsyncData } from "../lib/useAsyncData";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

function iconFor(r: Resource): any {
  if (r.external_url) return "link-outline";
  const t = (r.file_type || "").toLowerCase();
  if (t.includes("pdf")) return "document-text-outline";
  if (t.includes("image") || t.includes("png") || t.includes("jpg")) return "image-outline";
  return "document-outline";
}

export default function ResourcesScreen() {
  const { data, loading, refreshing, error, reload } = useAsyncData(() => getResources(), []);

  const open = (r: Resource) => {
    const url = r.external_url || r.file_url;
    if (!url) {
      Alert.alert("Unavailable", "This resource has no file or link yet.");
      return;
    }
    Linking.openURL(url).catch(() => Alert.alert("Couldn't open", "Unable to open this resource."));
  };

  if (loading) return <Loader />;
  if (error) return <StateView text="Couldn't load resources." onRetry={reload} />;
  const items = data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      {items.length === 0 ? (
        <Empty text="No resources shared yet." />
      ) : (
        items.map((r) => (
          <TouchableOpacity key={r.id} style={styles.card} activeOpacity={0.85} onPress={() => open(r)}>
            <View style={styles.icon}>
              <Ionicons name={iconFor(r)} size={20} color={colors.goldDeep} />
            </View>
            <View style={{ flex: 1 }}>
              {r.category ? <Text style={styles.tag}>{r.category.toUpperCase()}</Text> : null}
              <Text style={styles.title}>{r.title}</Text>
              {r.description ? (
                <Text style={styles.desc} numberOfLines={2}>
                  {r.description}
                </Text>
              ) : null}
            </View>
            <Ionicons name="open-outline" size={18} color={colors.sub} />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: space(3), backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space(4), marginBottom: space(3) },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" },
  tag: { fontSize: 10, fontWeight: "800", color: colors.gold, letterSpacing: 0.6 },
  title: { fontSize: 15, fontWeight: "700", color: colors.ink, marginTop: 2 },
  desc: { fontSize: 13, color: colors.sub, marginTop: 3, lineHeight: 18 },
});

import React from "react";
import { Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getGalleries } from "../api/galleries";
import { useAsyncData } from "../lib/useAsyncData";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

export default function GalleriesScreen({ navigation }: any) {
  const { data, loading, refreshing, error, reload } = useAsyncData(getGalleries, []);

  if (loading) return <Loader />;
  if (error) return <StateView text="Couldn't load galleries." onRetry={reload} />;
  const items = data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      {items.length === 0 ? (
        <Empty text="No photo albums yet." />
      ) : (
        <View style={styles.grid}>
          {items.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("GalleryDetail", { galleryId: g.id, title: g.title })}
            >
              {g.cover_url ? (
                <Image source={{ uri: g.cover_url }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverFallback]}>
                  <Ionicons name="images-outline" size={28} color={colors.sub} />
                </View>
              )}
              <Text style={styles.title} numberOfLines={1}>
                {g.title}
              </Text>
              <Text style={styles.count}>
                {g.photo_count} photo{g.photo_count === 1 ? "" : "s"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space(3) },
  card: { width: "47.5%", backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  cover: { width: "100%", height: 110, backgroundColor: colors.line },
  coverFallback: { alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontWeight: "700", color: colors.ink, paddingHorizontal: space(3), paddingTop: space(3) },
  count: { fontSize: 12, color: colors.sub, paddingHorizontal: space(3), paddingBottom: space(3), paddingTop: 2 },
});

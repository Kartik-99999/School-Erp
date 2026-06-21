import React, { useEffect, useState } from "react";
import { Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getGallery, GalleryPhoto } from "../api/galleries";
import { useAsyncData } from "../lib/useAsyncData";
import { Empty, Loader, StateView } from "../ui";
import { colors, space } from "../theme";

export default function GalleryDetailScreen({ route, navigation }: any) {
  const { galleryId, title } = route.params || {};
  const { data, loading, refreshing, error, reload } = useAsyncData(() => getGallery(galleryId), [galleryId]);
  const [viewer, setViewer] = useState<GalleryPhoto | null>(null);

  useEffect(() => {
    if (title && navigation?.setOptions) navigation.setOptions({ title });
  }, [title, navigation]);

  if (loading) return <Loader />;
  if (error || !data) return <StateView text="Couldn't load this album." onRetry={reload} />;
  const photos = data.photos ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(4) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      {data.description ? <Text style={styles.desc}>{data.description}</Text> : null}
      {photos.length === 0 ? (
        <Empty text="No photos in this album." />
      ) : (
        <View style={styles.grid}>
          {photos.map((p) => (
            <TouchableOpacity key={p.id} style={styles.thumbWrap} activeOpacity={0.85} onPress={() => setViewer(p)}>
              <Image source={{ uri: p.image_url }} style={styles.thumb} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewer(null)}>
          {viewer ? <Image source={{ uri: viewer.image_url }} style={styles.full} resizeMode="contain" /> : null}
          {viewer?.caption ? <Text style={styles.caption}>{viewer.caption}</Text> : null}
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  desc: { fontSize: 14, color: colors.sub, marginBottom: space(4), lineHeight: 20, paddingHorizontal: space(1) },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  thumbWrap: { width: "31.7%", aspectRatio: 1, borderRadius: 10, overflow: "hidden", backgroundColor: colors.line },
  thumb: { width: "100%", height: "100%" },
  viewer: { flex: 1, backgroundColor: "rgba(0,0,0,0.94)", alignItems: "center", justifyContent: "center", padding: space(4) },
  full: { width: "100%", height: "80%" },
  caption: { color: "#fff", fontSize: 14, marginTop: space(4), textAlign: "center" },
});

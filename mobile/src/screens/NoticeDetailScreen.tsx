import React from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Notice } from "../api/portal";
import { colors, radius, space } from "../theme";

function fmt(s?: string) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return s;
  }
}

export default function NoticeDetailScreen({ route }: any) {
  const notice = (route.params?.notice || {}) as Notice;

  const openAttachment = () => {
    if (!notice.attachment_url) return;
    Linking.openURL(notice.attachment_url).catch(() => Alert.alert("Couldn't open", "Unable to open the attachment."));
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(5) }}>
      {notice.notice_type ? <Text style={styles.tag}>{notice.notice_type.toUpperCase()}</Text> : null}
      <Text style={styles.title}>{notice.title}</Text>
      {notice.created_at ? <Text style={styles.date}>{fmt(notice.created_at)}</Text> : null}
      <Text style={styles.body}>{notice.content || "No further details."}</Text>
      {notice.attachment_url ? (
        <TouchableOpacity style={styles.attach} onPress={openAttachment} activeOpacity={0.85}>
          <Ionicons name="attach-outline" size={18} color={colors.goldDeep} />
          <Text style={styles.attachText}>Open attachment</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tag: { fontSize: 11, fontWeight: "800", color: colors.gold, letterSpacing: 0.8, marginBottom: space(2) },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink, lineHeight: 28 },
  date: { fontSize: 13, color: colors.sub, marginTop: space(2), marginBottom: space(4) },
  body: { fontSize: 15, color: colors.ink, lineHeight: 23 },
  attach: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", marginTop: space(6), borderWidth: 1, borderColor: colors.gold, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3) },
  attachText: { color: colors.goldDeep, fontWeight: "700", fontSize: 14 },
});

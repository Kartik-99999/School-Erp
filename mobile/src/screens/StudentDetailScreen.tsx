import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { getStudentProfile } from "../api/profile";
import { useAsyncData } from "../lib/useAsyncData";
import { Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

function initials(name?: string) {
  if (!name) return "?";
  const p = name.trim().split(" ");
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rl}>{label}</Text>
      <Text style={styles.rv}>{value}</Text>
    </View>
  );
}

export default function StudentDetailScreen({ route }: any) {
  const { studentId } = route.params || {};
  const { data, loading, error, reload } = useAsyncData(() => getStudentProfile(studentId), [studentId]);

  if (loading) return <Loader />;
  if (error || !data) return <StateView text="Couldn't load the student." onRetry={reload} />;
  const cls = [data.class_name, data.section_name].filter(Boolean).join("-");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(5) }}>
      <View style={styles.idCard}>
        {data.photo_url ? (
          <Image source={{ uri: data.photo_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>{initials(data.name)}</Text>
          </View>
        )}
        <Text style={styles.name}>{data.name}</Text>
        {cls ? <Text style={styles.sub}>Class {cls}</Text> : null}
      </View>
      <View style={styles.card}>
        {data.admission_number ? <Row label="Admission no." value={data.admission_number} /> : null}
        {data.roll_number != null ? <Row label="Roll no." value={String(data.roll_number)} /> : null}
        {cls ? <Row label="Class" value={cls} /> : null}
        {data.blood_group ? <Row label="Blood group" value={data.blood_group} last /> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  idCard: { alignItems: "center", marginBottom: space(5) },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: space(3) },
  avatarFallback: { backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 30, fontWeight: "800", color: colors.goldDeep },
  name: { fontSize: 20, fontWeight: "800", color: colors.ink },
  sub: { fontSize: 14, color: colors.sub, marginTop: 2 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space(5) },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: space(4), borderBottomWidth: 1, borderBottomColor: colors.line },
  rl: { fontSize: 14, color: colors.sub },
  rv: { fontSize: 14, fontWeight: "700", color: colors.ink },
});

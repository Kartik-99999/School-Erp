import React from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import { useChild } from "../child/ChildContext";
import { getStudentProfile } from "../api/profile";
import { useAsyncData } from "../lib/useAsyncData";
import { SCHOOL_NAME } from "../config";
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

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { selected } = useChild();
  const insets = useSafeAreaInsets();
  const role = session?.role || "Student";
  const isStudentSide = role === "Student" || role === "Parent";

  const { data: profile, loading } = useAsyncData(
    () => (isStudentSide ? getStudentProfile(selected?.id) : Promise.resolve(null)),
    [selected?.id, role]
  );

  const cls = profile ? [profile.class_name, profile.section_name].filter(Boolean).join("-") : "";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(5), paddingTop: insets.top + space(4) }}>
      <Text style={styles.h}>Profile</Text>

      {isStudentSide && profile ? (
        <View style={styles.idCard}>
          {profile.photo_url ? (
            <Image source={{ uri: profile.photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{initials(profile.name)}</Text>
            </View>
          )}
          <Text style={styles.name}>{profile.name}</Text>
          {cls ? <Text style={styles.sub}>Class {cls}</Text> : null}
        </View>
      ) : null}

      {isStudentSide && profile ? (
        <View style={styles.card}>
          {profile.admission_number ? <Row label="Admission no." value={profile.admission_number} /> : null}
          {profile.roll_number != null ? <Row label="Roll no." value={String(profile.roll_number)} /> : null}
          {cls ? <Row label="Class" value={cls} /> : null}
          {profile.blood_group ? <Row label="Blood group" value={profile.blood_group} /> : null}
          <Row label="School" value={SCHOOL_NAME} last />
        </View>
      ) : (
        <View style={styles.card}>
          <Row label="School" value={SCHOOL_NAME} />
          <Row label="Role" value={role} />
          <Row label="Account" value={session?.userId ? session.userId.slice(0, 8) + "…" : "—"} last />
        </View>
      )}

      {isStudentSide && loading && !profile ? <Text style={styles.note}>Loading profile…</Text> : null}

      <TouchableOpacity style={styles.signout} onPress={signOut} activeOpacity={0.85}>
        <Text style={styles.signoutText}>Sign out</Text>
      </TouchableOpacity>
      <Text style={styles.foot}>Powered by Erpcore</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 22, fontWeight: "800", color: colors.ink, marginBottom: space(5) },
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
  note: { fontSize: 13, color: colors.sub, textAlign: "center", marginTop: space(4) },
  signout: { marginTop: space(6), backgroundColor: "#FCEBE7", borderRadius: radius.md, paddingVertical: space(4), alignItems: "center" },
  signoutText: { color: colors.danger, fontSize: 15, fontWeight: "700" },
  foot: { textAlign: "center", color: colors.sub, fontSize: 12, marginTop: space(8) },
});

import React, { useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { applyStaffLeave, getMyStaffLeaves, getStaffLeaveTypes } from "../api/teacher";
import { useAsyncData } from "../lib/useAsyncData";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

const today = () => new Date().toISOString().slice(0, 10);

function statusStyle(status: string) {
  if (status === "Approved") return { backgroundColor: "#E7F3EC", color: colors.good };
  if (status === "Rejected") return { backgroundColor: "#FCEBE7", color: colors.danger };
  return { backgroundColor: colors.goldSoft, color: colors.goldDeep }; // Pending
}

export default function TeacherLeaveScreen() {
  const { data, loading, refreshing, error, reload } = useAsyncData(async () => {
    const [types, leaves] = await Promise.all([getStaffLeaveTypes(), getMyStaffLeaves()]);
    return { types, leaves };
  }, []);
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const types = data?.types ?? [];
  const leaves = data?.leaves ?? [];
  const typeName = (id: string) => types.find((t) => t.id === id)?.name ?? "Leave";
  const effectiveTypeId = typeId ?? types[0]?.id ?? null;

  const submit = async () => {
    if (!effectiveTypeId) return Alert.alert("Pick a type", "Please choose a leave type.");
    if (!from || !to) return Alert.alert("Missing dates", "Please enter both dates (YYYY-MM-DD).");
    if (to < from) return Alert.alert("Invalid dates", "End date can't be before start date.");
    if (!reason.trim()) return Alert.alert("Add a reason", "Please give a short reason.");
    setSubmitting(true);
    try {
      await applyStaffLeave({ leave_type_id: effectiveTypeId, start_date: from, end_date: to, reason: reason.trim() });
      Alert.alert("Submitted", "Your leave application was submitted.");
      setOpen(false);
      setReason("");
      setTypeId(null);
      setFrom(today());
      setTo(today());
      reload();
    } catch {
      Alert.alert("Couldn't submit", "Please try again when you're online.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <StateView text="Couldn't load your leaves." onRetry={reload} />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      <TouchableOpacity style={styles.newBtn} onPress={() => setOpen((v) => !v)} activeOpacity={0.85}>
        <Text style={styles.newBtnText}>{open ? "Cancel" : "Apply for leave"}</Text>
      </TouchableOpacity>

      {open ? (
        <View style={styles.form}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.types}>
            {types.map((t) => {
              const on = t.id === effectiveTypeId;
              return (
                <TouchableOpacity key={t.id} style={[styles.chip, on && styles.chipOn]} onPress={() => setTypeId(t.id)} activeOpacity={0.85}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.dates}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>From</Text>
              <TextInput style={styles.input} value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" placeholderTextColor={colors.sub} autoCapitalize="none" autoCorrect={false} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>To</Text>
              <TextInput style={styles.input} value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" placeholderTextColor={colors.sub} autoCapitalize="none" autoCorrect={false} />
            </View>
          </View>
          <Text style={styles.label}>Reason</Text>
          <TextInput style={[styles.input, styles.reason]} value={reason} onChangeText={setReason} placeholder="Short reason" placeholderTextColor={colors.sub} multiline />
          <TouchableOpacity style={[styles.submit, submitting && { opacity: 0.7 }]} onPress={submit} disabled={submitting} activeOpacity={0.85}>
            <Text style={styles.submitText}>{submitting ? "Submitting…" : "Submit application"}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.h}>My applications</Text>
      {leaves.length === 0 ? (
        <Empty text="No leave applications yet." />
      ) : (
        leaves.map((l) => (
          <View key={l.id} style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.type}>{typeName(l.leave_type_id)}</Text>
              <Text style={[styles.badge, statusStyle(l.status)]}>{l.status}</Text>
            </View>
            <Text style={styles.range}>{l.start_date} → {l.end_date}</Text>
            {l.reason ? <Text style={styles.reasonText} numberOfLines={3}>{l.reason}</Text> : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  newBtn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: space(3), alignItems: "center", marginBottom: space(4) },
  newBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  form: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space(5), marginBottom: space(6) },
  label: { fontSize: 12, fontWeight: "700", color: colors.sub, marginBottom: space(2), marginTop: space(2) },
  types: { flexDirection: "row", gap: space(2), flexWrap: "wrap" },
  chip: { paddingHorizontal: space(4), paddingVertical: space(2), borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg },
  chipOn: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.sub },
  chipTextOn: { color: colors.goldDeep },
  dates: { flexDirection: "row", gap: space(3) },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: space(3), paddingVertical: space(3), fontSize: 14, color: colors.ink },
  reason: { minHeight: 72, textAlignVertical: "top" },
  submit: { backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: space(4), alignItems: "center", marginTop: space(4) },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  h: { fontSize: 14, fontWeight: "800", color: colors.ink, marginBottom: space(3) },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space(5), marginBottom: space(3) },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  type: { fontSize: 15, fontWeight: "800", color: colors.ink },
  badge: { fontSize: 11, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  range: { fontSize: 13, fontWeight: "600", color: colors.sub, marginTop: space(3) },
  reasonText: { fontSize: 14, color: colors.sub, marginTop: space(2), lineHeight: 20 },
});

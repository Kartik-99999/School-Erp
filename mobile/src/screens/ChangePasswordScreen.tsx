import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { changePassword } from "../api/auth";
import { colors, radius, space } from "../theme";

export default function ChangePasswordScreen({ navigation }: any) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!current) return Alert.alert("Missing", "Enter your current password.");
    if (next.length < 8) return Alert.alert("Too short", "New password must be at least 8 characters.");
    if (next !== confirm) return Alert.alert("Mismatch", "New password and confirmation don't match.");
    setSaving(true);
    try {
      await changePassword(current, next);
      Alert.alert("Done", "Your password has been changed.");
      navigation.goBack();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Couldn't change your password. Please try again.";
      Alert.alert("Couldn't change password", String(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(5) }}>
      <Text style={styles.label}>Current password</Text>
      <TextInput style={styles.input} value={current} onChangeText={setCurrent} secureTextEntry placeholder="Current password" placeholderTextColor={colors.sub} autoCapitalize="none" />
      <Text style={styles.label}>New password</Text>
      <TextInput style={styles.input} value={next} onChangeText={setNext} secureTextEntry placeholder="At least 8 characters" placeholderTextColor={colors.sub} autoCapitalize="none" />
      <Text style={styles.label}>Confirm new password</Text>
      <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Re-enter new password" placeholderTextColor={colors.sub} autoCapitalize="none" />
      <TouchableOpacity style={[styles.btn, saving && { opacity: 0.7 }]} onPress={submit} disabled={saving} activeOpacity={0.85}>
        <Text style={styles.btnText}>{saving ? "Saving…" : "Update password"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "800", color: colors.sub, marginTop: space(4), marginBottom: space(2), letterSpacing: 0.5 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3), fontSize: 15, color: colors.ink },
  btn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: space(4), alignItems: "center", marginTop: space(6) },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

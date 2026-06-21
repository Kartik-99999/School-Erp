import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getMyMessages, sendMessage } from "../api/messages";
import { useAsyncData } from "../lib/useAsyncData";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

export default function MessagesScreen() {
  const { data, loading, refreshing, error, reload } = useAsyncData(getMyMessages, []);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await sendMessage(body);
      setText("");
      reload();
    } catch {
      Alert.alert("Couldn't send", "Please try again when you're online.");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <StateView text="Couldn't load messages." onRetry={reload} />;
  const items = data ?? [];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: space(5) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
      >
        {items.length === 0 ? (
          <Empty text="No messages yet. Start the conversation below." />
        ) : (
          items.map((m) => {
            const mine = m.sender === "Parent";
            return (
              <View key={m.id} style={[styles.bubbleRow, mine ? styles.right : styles.left]}>
                <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <Text style={[styles.body, mine && { color: "#fff" }]}>{m.body}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message the school…"
          placeholderTextColor={colors.sub}
          multiline
        />
        <TouchableOpacity style={[styles.send, (!text.trim() || sending) && { opacity: 0.5 }]} onPress={send} disabled={!text.trim() || sending} activeOpacity={0.85}>
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubbleRow: { flexDirection: "row", marginBottom: space(2) },
  left: { justifyContent: "flex-start" },
  right: { justifyContent: "flex-end" },
  bubble: { maxWidth: "82%", borderRadius: radius.lg, paddingHorizontal: space(4), paddingVertical: space(3) },
  mine: { backgroundColor: colors.gold, borderTopRightRadius: 4 },
  theirs: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderTopLeftRadius: 4 },
  body: { fontSize: 14, color: colors.ink, lineHeight: 20 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: space(2), padding: space(3), borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card },
  input: { flex: 1, maxHeight: 120, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, paddingHorizontal: space(4), paddingVertical: space(3), fontSize: 14, color: colors.ink },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" },
});

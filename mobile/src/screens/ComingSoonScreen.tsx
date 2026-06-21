import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, space } from "../theme";

export default function ComingSoonScreen({ route }: any) {
  const title = route?.params?.title || "Coming soon";
  const note = route?.params?.note as string | undefined;
  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        <Ionicons name="construct-outline" size={26} color={colors.goldDeep} />
      </View>
      <Text style={styles.h}>{title}</Text>
      <Text style={styles.sub}>This part of the app is on the way.</Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: space(8) },
  badge: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center", marginBottom: space(4) },
  h: { fontSize: 18, fontWeight: "800", color: colors.ink },
  sub: { color: colors.sub, marginTop: 8, textAlign: "center" },
  note: { color: colors.sub, marginTop: space(4), textAlign: "center", fontSize: 12, lineHeight: 18, fontStyle: "italic" },
});

import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useChild } from "../child/ChildContext";
import { colors, radius, space } from "../theme";

// Child switcher shown on the parent Home.
export function ChildBar() {
  const { children, selected, select } = useChild();
  if (children.length === 0) return null;
  if (children.length === 1) {
    return (
      <View style={s.single}>
        <Ionicons name="person-circle-outline" size={18} color={colors.goldDeep} />
        <Text style={s.singleText}>{children[0].name} · {children[0].classLabel}</Text>
      </View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2) }} style={{ marginBottom: space(5) }}>
      {children.map((c) => {
        const on = c.id === selected?.id;
        return (
          <TouchableOpacity key={c.id} onPress={() => select(c.id)} activeOpacity={0.85} style={[s.chip, on && s.chipOn]}>
            <Text style={[s.chipText, on && s.chipTextOn]}>{c.name.split(" ")[0]}</Text>
            <Text style={[s.chipSub, on && s.chipSubOn]}>{c.classLabel}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// Small "which child" indicator shown atop the parent's data screens.
export function ChildHeader() {
  const { selected } = useChild();
  if (!selected) return null;
  return (
    <View style={s.header}>
      <Ionicons name="person-circle-outline" size={16} color={colors.goldDeep} />
      <Text style={s.headerText}>{selected.name} · {selected.classLabel}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  single: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: space(5) },
  singleText: { fontSize: 13, fontWeight: "700", color: colors.sub },
  chip: { paddingHorizontal: space(4), paddingVertical: space(2), borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, minWidth: 76 },
  chipOn: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  chipText: { fontSize: 13, fontWeight: "800", color: colors.ink },
  chipTextOn: { color: colors.goldDeep },
  chipSub: { fontSize: 11, color: colors.sub, marginTop: 1 },
  chipSubOn: { color: colors.goldDeep },
  header: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: space(4) },
  headerText: { fontSize: 13, fontWeight: "700", color: colors.sub },
});

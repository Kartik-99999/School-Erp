import React, { useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AcademicYear, getAcademicYears, getActiveYear, setActiveYear } from "../api/academicYears";
import { useAsyncData } from "../lib/useAsyncData";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

async function load(): Promise<{ years: AcademicYear[]; active: string | null }> {
  const [years, active] = await Promise.all([getAcademicYears(), getActiveYear()]);
  return { years, active };
}

export default function AcademicYearScreen() {
  const { data, loading, refreshing, error, reload } = useAsyncData(load, []);
  const [active, setActive] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (data) setActive(data.active);
  }, [data]);

  const pick = async (id: string) => {
    if (id === active) return;
    setBusy(id);
    try {
      await setActiveYear(id);
      setActive(id);
    } catch {
      Alert.alert("Couldn't switch", "Please try again when you're online.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Loader />;
  if (error || !data) return <StateView text="Couldn't load academic years." onRetry={reload} />;
  const years = data.years;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      <Text style={styles.hint}>Choose the academic year to view.</Text>
      {years.length === 0 ? (
        <Empty text="No academic years yet." />
      ) : (
        years.map((y) => {
          const on = y.id === active;
          return (
            <TouchableOpacity
              key={y.id}
              style={[styles.row, on && styles.rowOn]}
              activeOpacity={0.85}
              onPress={() => pick(y.id)}
              disabled={busy === y.id}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{y.name}</Text>
                {y.start_date ? (
                  <Text style={styles.sub}>
                    {y.start_date} → {y.end_date}
                  </Text>
                ) : null}
              </View>
              {on ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.gold} />
              ) : busy === y.id ? (
                <Text style={styles.sub}>…</Text>
              ) : null}
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: colors.sub, marginBottom: space(4) },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space(4), marginBottom: space(2) },
  rowOn: { borderColor: colors.gold, backgroundColor: colors.goldSoft },
  name: { fontSize: 15, fontWeight: "700", color: colors.ink },
  sub: { fontSize: 12, color: colors.sub, marginTop: 2 },
});

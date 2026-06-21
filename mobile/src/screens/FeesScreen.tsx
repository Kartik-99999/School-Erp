import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { getMyFees } from "../api/portal";
import { useAsyncData } from "../lib/useAsyncData";
import { useChild } from "../child/ChildContext";
import { ChildHeader } from "../components/child";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

const inr = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");

export default function FeesScreen() {
  const { selected } = useChild();
  const { data, loading, refreshing, error, reload } = useAsyncData(() => getMyFees(selected?.id), [selected?.id]);

  if (loading) return <Loader />;
  if (error || !data) return <StateView text="Couldn't load fees." onRetry={reload} />;
  const s = data.summary;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      <ChildHeader />
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>BALANCE DUE</Text>
        <Text style={styles.heroVal}>{inr(s.balance)}</Text>
        <View style={styles.heroRow}>
          <Text style={styles.heroSub}>Billed {inr(s.total_due)}</Text>
          <Text style={styles.heroSub}>Paid {inr(s.total_paid)}</Text>
        </View>
      </View>
      <Text style={styles.h}>Dues</Text>
      {data.dues.length === 0 ? (
        <Empty text="Nothing due — you're all paid up." />
      ) : (
        data.dues.map((d, i) => (
          <View key={i} style={styles.drow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dtitle}>{d.head || d.fee_head || "Fee"}</Text>
              {d.due_date ? <Text style={styles.dsub}>Due {d.due_date}</Text> : null}
            </View>
            <Text style={styles.damt}>{inr(d.balance)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: space(6), marginBottom: space(6) },
  heroLabel: { color: colors.goldSoft, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  heroVal: { color: colors.white, fontSize: 34, fontWeight: "800", marginTop: 6 },
  heroRow: { flexDirection: "row", justifyContent: "space-between", marginTop: space(4) },
  heroSub: { color: "#B9B8AE", fontSize: 13 },
  h: { fontSize: 14, fontWeight: "800", color: colors.ink, marginBottom: space(3) },
  drow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space(4), marginBottom: space(2) },
  dtitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  dsub: { fontSize: 12, color: colors.sub, marginTop: 2 },
  damt: { fontSize: 15, fontWeight: "800", color: colors.ink },
});

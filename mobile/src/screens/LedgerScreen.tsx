import React, { useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { getMyFees } from "../api/portal";
import { useAsyncData } from "../lib/useAsyncData";
import { useChild } from "../child/ChildContext";
import { ChildHeader } from "../components/child";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

const inr = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");

type Entry = { date?: string; label: string; charge: number; payment: number };

export default function LedgerScreen() {
  const { selected } = useChild();
  const { data, loading, refreshing, error, reload } = useAsyncData(() => getMyFees(selected?.id), [selected?.id]);

  // Assemble a chronological ledger from charges (dues) and payments (receipts).
  const entries = useMemo<Entry[]>(() => {
    if (!data) return [];
    const list: Entry[] = [];
    for (const d of data.dues) {
      list.push({ date: d.due_date || undefined, label: d.head || d.fee_head || "Fee", charge: d.net_due_amount || 0, payment: 0 });
    }
    for (const r of data.receipts ?? []) {
      list.push({ date: r.payment_date, label: r.payment_mode ? `Payment · ${r.payment_mode}` : "Payment", charge: 0, payment: r.total_amount || 0 });
    }
    list.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
    return list;
  }, [data]);

  if (loading) return <Loader />;
  if (error || !data) return <StateView text="Couldn't load the ledger." onRetry={reload} />;

  let running = 0;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      <ChildHeader />
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>CURRENT BALANCE</Text>
        <Text style={styles.heroVal}>{inr(data.summary.balance)}</Text>
      </View>
      {entries.length === 0 ? (
        <Empty text="No fee activity yet." />
      ) : (
        entries.map((e, i) => {
          running += e.charge - e.payment;
          const isPay = e.payment > 0;
          return (
            <View key={i} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{e.label}</Text>
                {e.date ? <Text style={styles.date}>{e.date}</Text> : null}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.amt, { color: isPay ? colors.good : colors.danger }]}>
                  {isPay ? "−" : "+"}
                  {inr(isPay ? e.payment : e.charge)}
                </Text>
                <Text style={styles.run}>Bal {inr(running)}</Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: space(5), marginBottom: space(5) },
  heroLabel: { color: colors.goldSoft, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  heroVal: { color: colors.white, fontSize: 28, fontWeight: "800", marginTop: 6 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space(4), marginBottom: space(2) },
  label: { fontSize: 14, fontWeight: "700", color: colors.ink },
  date: { fontSize: 12, color: colors.sub, marginTop: 2 },
  amt: { fontSize: 15, fontWeight: "800" },
  run: { fontSize: 11, color: colors.sub, marginTop: 2 },
});

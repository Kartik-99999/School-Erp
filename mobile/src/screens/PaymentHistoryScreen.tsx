import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getMyFees } from "../api/portal";
import { useAsyncData } from "../lib/useAsyncData";
import { useChild } from "../child/ChildContext";
import { ChildHeader } from "../components/child";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

const inr = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");

export default function PaymentHistoryScreen({ navigation }: any) {
  const { selected } = useChild();
  const { data, loading, refreshing, error, reload } = useAsyncData(() => getMyFees(selected?.id), [selected?.id]);

  if (loading) return <Loader />;
  if (error || !data) return <StateView text="Couldn't load payment history." onRetry={reload} />;
  const receipts = data.receipts ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      <ChildHeader />
      {receipts.length === 0 ? (
        <Empty text="No payments recorded yet." />
      ) : (
        receipts.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={styles.row}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("Receipt", { receiptId: r.id, receiptNumber: r.receipt_number })}
          >
            <View style={styles.icon}>
              <Ionicons name="receipt-outline" size={18} color={colors.goldDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.amt}>{inr(r.total_amount)}</Text>
              <Text style={styles.meta}>
                {[r.payment_date, r.payment_mode].filter(Boolean).join(" · ")}
              </Text>
              {r.receipt_number ? <Text style={styles.rno}>{r.receipt_number}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.sub} />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space(3), backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space(4), marginBottom: space(2) },
  icon: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" },
  amt: { fontSize: 16, fontWeight: "800", color: colors.ink },
  meta: { fontSize: 13, color: colors.sub, marginTop: 2 },
  rno: { fontSize: 11, color: colors.sub, marginTop: 2 },
});

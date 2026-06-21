import React from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getMyFees } from "../api/portal";
import { useAsyncData } from "../lib/useAsyncData";
import { useChild } from "../child/ChildContext";
import { ChildHeader } from "../components/child";
import { DEV_FAKE_ROLE } from "../config";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

const inr = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");

export default function FeesScreen({ navigation }: any) {
  const { selected } = useChild();
  const { data, loading, refreshing, error, reload } = useAsyncData(() => getMyFees(selected?.id), [selected?.id]);

  // Refresh dues when returning to this screen (e.g. after a payment); skip the first focus.
  React.useEffect(() => {
    if (!navigation?.addListener) return;
    let first = true;
    const unsub = navigation.addListener("focus", () => {
      if (first) {
        first = false;
        return;
      }
      reload();
    });
    return unsub;
  }, [navigation, reload]);

  const pay = () => {
    if (!data || data.summary.balance <= 0) return;
    if (DEV_FAKE_ROLE) {
      Alert.alert("Demo checkout", "Razorpay opens here in the app. Payment is simulated as successful in preview.");
      return;
    }
    const studentId = selected?.id || data.student_id;
    if (!studentId) {
      Alert.alert("Unavailable", "Couldn't determine the student for this payment.");
      return;
    }
    const allocations = data.dues
      .filter((d) => d.balance > 0 && d.id)
      .map((d) => ({ fee_schedule_id: d.id as string, amount: d.balance }));
    if (allocations.length === 0) {
      Alert.alert("Nothing to pay", "There are no payable dues right now.");
      return;
    }
    const amount = allocations.reduce((t, a) => t + a.amount, 0);
    navigation.navigate("Payment", { amount, studentId, allocations });
  };

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
      {s.balance > 0 ? (
        <TouchableOpacity style={styles.pay} onPress={pay} activeOpacity={0.85}>
          <Text style={styles.payText}>Pay {inr(s.balance)} now</Text>
        </TouchableOpacity>
      ) : null}
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
  pay: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: space(4), alignItems: "center", marginBottom: space(6) },
  payText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});

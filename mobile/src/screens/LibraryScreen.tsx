import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { getMyLibrary } from "../api/library";
import { useAsyncData } from "../lib/useAsyncData";
import { useChild } from "../child/ChildContext";
import { ChildHeader } from "../components/child";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

const inr = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");

function statusStyle(status: string) {
  if (status === "Overdue") return { backgroundColor: "#FCEBE7", color: colors.danger };
  if (status === "Returned") return { backgroundColor: colors.line, color: colors.sub };
  return { backgroundColor: "#E7F3EC", color: colors.good };
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statVal, danger && { color: colors.danger }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function LibraryScreen() {
  const { selected } = useChild();
  const { data, loading, refreshing, error, reload } = useAsyncData(
    () => getMyLibrary(selected?.id),
    [selected?.id]
  );

  if (loading) return <Loader />;
  if (error || !data) return <StateView text="Couldn't load the library." onRetry={reload} />;
  const s = data.summary;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      <ChildHeader />
      <View style={styles.row}>
        <Stat label="On loan" value={String(s.active)} />
        <Stat label="Issued" value={String(s.total)} />
        <Stat label="Fines" value={inr(s.total_fine)} danger={s.total_fine > 0} />
      </View>
      <Text style={styles.h}>Issued books</Text>
      {data.issues.length === 0 ? (
        <Empty text="No books issued yet." />
      ) : (
        data.issues.map((b) => (
          <View key={b.id} style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.title}>{b.book_title}</Text>
              <Text style={[styles.badge, statusStyle(b.status)]}>{b.status}</Text>
            </View>
            {b.author ? <Text style={styles.author}>{b.author}</Text> : null}
            <View style={styles.metaRow}>
              {b.due_date ? <Text style={styles.meta}>Due {b.due_date}</Text> : null}
              {b.fine_amount > 0 ? <Text style={[styles.meta, { color: colors.danger }]}>Fine {inr(b.fine_amount)}</Text> : null}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space(2), marginBottom: space(6) },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingVertical: space(3), alignItems: "center" },
  statVal: { fontSize: 18, fontWeight: "800", color: colors.ink },
  statLabel: { fontSize: 11, color: colors.sub, marginTop: 2 },
  h: { fontSize: 14, fontWeight: "800", color: colors.ink, marginBottom: space(3) },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space(5), marginBottom: space(3) },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 15, fontWeight: "700", color: colors.ink, flex: 1 },
  badge: { fontSize: 11, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: "hidden", marginLeft: space(2) },
  author: { fontSize: 13, color: colors.sub, marginTop: 4 },
  metaRow: { flexDirection: "row", gap: space(4), marginTop: space(3) },
  meta: { fontSize: 12, fontWeight: "600", color: colors.sub },
});

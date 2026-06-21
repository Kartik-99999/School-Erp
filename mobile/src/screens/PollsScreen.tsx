import React, { useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getPolls, Poll, votePoll } from "../api/polls";
import { useAsyncData } from "../lib/useAsyncData";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

function pct(votes: number, total: number) {
  if (!total) return 0;
  return Math.round((votes / total) * 100);
}

export default function PollsScreen() {
  const { data, loading, refreshing, error, reload } = useAsyncData(getPolls, []);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (data) setPolls(data);
  }, [data]);

  const vote = async (poll: Poll, optionId: string) => {
    if (poll.my_option_id || busy) return;
    setBusy(poll.id);
    try {
      await votePoll(poll.id, optionId);
      setPolls((prev) =>
        prev.map((p) =>
          p.id === poll.id
            ? {
                ...p,
                my_option_id: optionId,
                total_votes: p.total_votes + 1,
                options: p.options.map((o) => (o.id === optionId ? { ...o, votes: o.votes + 1 } : o)),
              }
            : p
        )
      );
    } catch {
      Alert.alert("Couldn't vote", "Please try again when you're online.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Loader />;
  if (error) return <StateView text="Couldn't load polls." onRetry={reload} />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      {polls.length === 0 ? (
        <Empty text="No active polls right now." />
      ) : (
        polls.map((p) => {
          const voted = !!p.my_option_id;
          return (
            <View key={p.id} style={styles.card}>
              <Text style={styles.q}>{p.question}</Text>
              {p.options.map((o) => {
                const mine = o.id === p.my_option_id;
                if (voted) {
                  const percentage = pct(o.votes, p.total_votes);
                  return (
                    <View key={o.id} style={styles.resultRow}>
                      <View style={[styles.bar, { width: `${percentage}%` }, mine && styles.barMine]} />
                      <View style={styles.resultText}>
                        <Text style={[styles.optText, mine && { fontWeight: "800", color: colors.goldDeep }]}>
                          {o.text}
                          {mine ? "  ✓" : ""}
                        </Text>
                        <Text style={styles.pct}>{percentage}%</Text>
                      </View>
                    </View>
                  );
                }
                return (
                  <TouchableOpacity
                    key={o.id}
                    style={[styles.opt, busy === p.id && { opacity: 0.6 }]}
                    activeOpacity={0.85}
                    onPress={() => vote(p, o.id)}
                    disabled={busy === p.id}
                  >
                    <Text style={styles.optText}>{o.text}</Text>
                  </TouchableOpacity>
                );
              })}
              <Text style={styles.total}>{p.total_votes} vote{p.total_votes === 1 ? "" : "s"}{voted ? "" : " · tap to vote"}</Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space(5), marginBottom: space(3) },
  q: { fontSize: 16, fontWeight: "800", color: colors.ink, marginBottom: space(4) },
  opt: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: space(3), paddingHorizontal: space(4), marginBottom: space(2), backgroundColor: colors.bg },
  optText: { fontSize: 14, fontWeight: "600", color: colors.ink },
  resultRow: { height: 40, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, marginBottom: space(2), justifyContent: "center", overflow: "hidden" },
  bar: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: colors.line },
  barMine: { backgroundColor: colors.goldSoft },
  resultText: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: space(4) },
  pct: { fontSize: 13, fontWeight: "800", color: colors.sub },
  total: { fontSize: 12, color: colors.sub, marginTop: space(2) },
});

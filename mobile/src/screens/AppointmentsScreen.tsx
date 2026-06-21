import React, { useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Appointment, bookAppointment, getMyAppointments, getOpenSlots, Slot } from "../api/appointments";
import { useAsyncData } from "../lib/useAsyncData";
import { Empty, Loader, StateView } from "../ui";
import { colors, radius, space } from "../theme";

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

async function load(): Promise<{ slots: Slot[]; mine: Appointment[] }> {
  const [slots, mine] = await Promise.all([getOpenSlots(), getMyAppointments()]);
  return { slots, mine };
}

export default function AppointmentsScreen() {
  const { data, loading, refreshing, error, reload } = useAsyncData(load, []);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [mine, setMine] = useState<Appointment[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setSlots(data.slots);
      setMine(data.mine);
    }
  }, [data]);

  const book = async (slot: Slot) => {
    if (busy) return;
    setBusy(slot.id);
    try {
      await bookAppointment(slot.id);
      setSlots((prev) => prev.filter((s) => s.id !== slot.id));
      setMine((prev) => [
        { id: "local-" + slot.id, teacher_name: slot.teacher_name, start_time: slot.start_time, end_time: slot.end_time, status: "Booked" },
        ...prev,
      ]);
      Alert.alert("Booked", `Appointment with ${slot.teacher_name} is confirmed.`);
    } catch (e: any) {
      const msg = e?.response?.status === 409 ? "That slot was just taken — please pick another." : "Couldn't book the appointment.";
      Alert.alert("Couldn't book", msg);
      reload();
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Loader />;
  if (error) return <StateView text="Couldn't load appointments." onRetry={reload} />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.gold} />}
    >
      <Text style={styles.h}>My appointments</Text>
      {mine.length === 0 ? (
        <Empty text="No appointments booked yet." />
      ) : (
        mine.map((a) => (
          <View key={a.id} style={styles.card}>
            <Text style={styles.teacher}>{a.teacher_name}</Text>
            <Text style={styles.when}>{fmt(a.start_time)}</Text>
            {a.note ? <Text style={styles.note}>{a.note}</Text> : null}
            <Text style={[styles.badge, a.status === "Booked" ? styles.booked : styles.cancelled]}>{a.status}</Text>
          </View>
        ))
      )}

      <Text style={[styles.h, { marginTop: space(6) }]}>Open slots</Text>
      {slots.length === 0 ? (
        <Empty text="No open slots right now." />
      ) : (
        slots.map((s) => (
          <View key={s.id} style={styles.slot}>
            <View style={{ flex: 1 }}>
              <Text style={styles.teacher}>{s.teacher_name}</Text>
              <Text style={styles.when}>{fmt(s.start_time)}</Text>
            </View>
            <TouchableOpacity style={[styles.bookBtn, busy === s.id && { opacity: 0.6 }]} onPress={() => book(s)} disabled={busy === s.id} activeOpacity={0.85}>
              <Text style={styles.bookText}>{busy === s.id ? "…" : "Book"}</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 14, fontWeight: "800", color: colors.ink, marginBottom: space(3) },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space(5), marginBottom: space(2) },
  teacher: { fontSize: 15, fontWeight: "700", color: colors.ink },
  when: { fontSize: 13, color: colors.sub, marginTop: 2 },
  note: { fontSize: 13, color: colors.sub, marginTop: space(2) },
  badge: { alignSelf: "flex-start", marginTop: space(3), fontSize: 11, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: "hidden" },
  booked: { backgroundColor: "#E7F3EC", color: colors.good },
  cancelled: { backgroundColor: "#FCEBE7", color: colors.danger },
  slot: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space(4), marginBottom: space(2) },
  bookBtn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingHorizontal: space(5), paddingVertical: space(2) },
  bookText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});

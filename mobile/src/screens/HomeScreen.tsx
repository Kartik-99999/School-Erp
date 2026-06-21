import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import { SCHOOL_NAME } from "../config";
import { ChildBar } from "../components/child";
import { colors, radius, space } from "../theme";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

type Tile = { label: string; icon: any; route: string; params?: any };
const TILES: Record<string, Tile[]> = {
  Parent: [
    { label: "Overview", icon: "grid-outline", route: "Overview" },
    { label: "Attendance", icon: "calendar-outline", route: "Attendance" },
    { label: "Fees", icon: "card-outline", route: "Fees" },
    { label: "Payments", icon: "receipt-outline", route: "PaymentHistory" },
    { label: "Ledger", icon: "list-outline", route: "Ledger" },
    { label: "Exams", icon: "school-outline", route: "Exams" },
    { label: "Library", icon: "library-outline", route: "Library" },
    { label: "Leaves", icon: "document-text-outline", route: "Leaves" },
    { label: "Resources", icon: "folder-open-outline", route: "Resources" },
    { label: "Events", icon: "calendar-clear-outline", route: "Events" },
    { label: "Notices", icon: "notifications-outline", route: "Notices" },
    { label: "Timeline", icon: "newspaper-outline", route: "Timeline" },
    { label: "Subjects", icon: "reader-outline", route: "Subjects" },
    { label: "Timetable", icon: "time-outline", route: "Timetable" },
  ],
  Student: [
    { label: "Overview", icon: "grid-outline", route: "Overview" },
    { label: "Attendance", icon: "calendar-outline", route: "Attendance" },
    { label: "Fees", icon: "card-outline", route: "Fees" },
    { label: "Payments", icon: "receipt-outline", route: "PaymentHistory" },
    { label: "Ledger", icon: "list-outline", route: "Ledger" },
    { label: "Homework", icon: "book-outline", route: "Homework" },
    { label: "Exams", icon: "school-outline", route: "Exams" },
    { label: "Library", icon: "library-outline", route: "Library" },
    { label: "Leaves", icon: "document-text-outline", route: "Leaves" },
    { label: "Resources", icon: "folder-open-outline", route: "Resources" },
    { label: "Events", icon: "calendar-clear-outline", route: "Events" },
    { label: "Timeline", icon: "newspaper-outline", route: "Timeline" },
    { label: "Subjects", icon: "reader-outline", route: "Subjects" },
    { label: "Timetable", icon: "time-outline", route: "Timetable" },
  ],
  Teacher: [
    { label: "Mark attendance", icon: "checkbox-outline", route: "TeacherClasses" },
    { label: "My classes", icon: "people-outline", route: "TeacherRoster" },
    { label: "Homework", icon: "book-outline", route: "TeacherHomework" },
    { label: "Marks", icon: "create-outline", route: "MarksEntry" },
    { label: "Notices", icon: "notifications-outline", route: "Notices" },
    { label: "Post notice", icon: "megaphone-outline", route: "PostNotice" },
    { label: "Leave requests", icon: "checkmark-done-outline", route: "LeaveApprovals" },
    { label: "Schedule", icon: "time-outline", route: "TeacherSchedule" },
  ],
};

export default function HomeScreen({ navigation }: any) {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const role = typeof session?.role === "string" && session.role ? session.role : "Student";
  const tiles = TILES[role] ?? TILES.Student;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5), paddingTop: insets.top + space(4) }}
    >
      <Text style={styles.eyebrow}>{SCHOOL_NAME.toUpperCase()}</Text>
      <Text style={styles.hi}>{greeting()}</Text>
      <Text style={styles.role}>Signed in as {role}</Text>

      <ChildBar />

      <View style={styles.grid}>
        {tiles.map((t) => (
          <TouchableOpacity
            key={t.label}
            style={styles.tile}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(t.route, t.params)}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={t.icon} size={20} color={colors.goldDeep} />
            </View>
            <Text style={styles.tileText}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, fontWeight: "800", color: colors.gold, letterSpacing: 1.2 },
  hi: { fontSize: 26, fontWeight: "800", color: colors.ink, marginTop: 6 },
  role: { fontSize: 14, color: colors.sub, marginTop: 4, marginBottom: space(6) },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space(3) },
  tile: {
    width: "47.5%",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space(5),
    minHeight: 108,
    justifyContent: "space-between",
  },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" },
  tileText: { fontSize: 15, fontWeight: "700", color: colors.ink, marginTop: space(4) },
});

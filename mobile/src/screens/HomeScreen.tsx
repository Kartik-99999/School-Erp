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
type Section = { title: string; data: Tile[] };

const ParentSections: Section[] = [
  {
    title: "Academics",
    data: [
      { label: "Attendance", icon: "calendar-outline", route: "Attendance" },
      { label: "Timetable", icon: "time-outline", route: "Timetable" },
      { label: "Subjects", icon: "reader-outline", route: "Subjects" },
      { label: "Exams", icon: "school-outline", route: "Exams" },
      { label: "Planner", icon: "calendar-number-outline", route: "LessonPlanner" },
    ]
  },
  {
    title: "Fees",
    data: [
      { label: "Fees", icon: "card-outline", route: "Fees" },
      { label: "Payments", icon: "receipt-outline", route: "PaymentHistory" },
      { label: "Ledger", icon: "list-outline", route: "Ledger" },
    ]
  },
  {
    title: "Communication",
    data: [
      { label: "Notices", icon: "notifications-outline", route: "Notices" },
      { label: "Messages", icon: "chatbubbles-outline", route: "Messages" },
      { label: "Timeline", icon: "newspaper-outline", route: "Timeline" },
      { label: "Events", icon: "calendar-clear-outline", route: "Events" },
      { label: "Polls", icon: "bar-chart-outline", route: "Polls" },
      { label: "Galleries", icon: "images-outline", route: "Galleries" },
      { label: "Notifications", icon: "notifications-circle-outline", route: "Notifications" },
    ]
  },
  {
    title: "School life",
    data: [
      { label: "Library", icon: "library-outline", route: "Library" },
      { label: "Leaves", icon: "document-text-outline", route: "Leaves" },
      { label: "Appointments", icon: "person-add-outline", route: "Appointments" },
      { label: "Resources", icon: "folder-open-outline", route: "Resources" },
    ]
  }
];

const StudentSections: Section[] = [
  {
    title: "Academics",
    data: [
      { label: "Attendance", icon: "calendar-outline", route: "Attendance" },
      { label: "Timetable", icon: "time-outline", route: "Timetable" },
      { label: "Subjects", icon: "reader-outline", route: "Subjects" },
      { label: "Homework", icon: "book-outline", route: "Homework" },
      { label: "Exams", icon: "school-outline", route: "Exams" },
      { label: "Planner", icon: "calendar-number-outline", route: "LessonPlanner" },
    ]
  },
  {
    title: "Fees",
    data: [
      { label: "Fees", icon: "card-outline", route: "Fees" },
      { label: "Payments", icon: "receipt-outline", route: "PaymentHistory" },
      { label: "Ledger", icon: "list-outline", route: "Ledger" },
    ]
  },
  {
    title: "Communication",
    data: [
      { label: "Timeline", icon: "newspaper-outline", route: "Timeline" },
      { label: "Events", icon: "calendar-clear-outline", route: "Events" },
      { label: "Polls", icon: "bar-chart-outline", route: "Polls" },
      { label: "Galleries", icon: "images-outline", route: "Galleries" },
      { label: "Notifications", icon: "notifications-circle-outline", route: "Notifications" },
    ]
  },
  {
    title: "School life",
    data: [
      { label: "Library", icon: "library-outline", route: "Library" },
      { label: "Leaves", icon: "document-text-outline", route: "Leaves" },
      { label: "Appointments", icon: "person-add-outline", route: "Appointments" },
      { label: "Resources", icon: "folder-open-outline", route: "Resources" },
    ]
  }
];

const TeacherSections: Section[] = [
  {
    title: "Instruction",
    data: [
      { label: "Schedule", icon: "time-outline", route: "TeacherSchedule" },
      { label: "My classes", icon: "people-outline", route: "TeacherRoster" },
      { label: "Mark attendance", icon: "checkbox-outline", route: "TeacherClasses" },
      { label: "Homework", icon: "book-outline", route: "TeacherHomework" },
      { label: "Marks", icon: "create-outline", route: "MarksEntry" },
    ]
  },
  {
    title: "Communication",
    data: [
      { label: "Notices", icon: "notifications-outline", route: "Notices" },
      { label: "Post notice", icon: "megaphone-outline", route: "PostNotice" },
    ]
  },
  {
    title: "Administration",
    data: [
      { label: "Leave requests", icon: "checkmark-done-outline", route: "LeaveApprovals" },
    ]
  }
];

const SECTIONS_BY_ROLE: Record<string, Section[]> = {
  Parent: ParentSections,
  Student: StudentSections,
  Teacher: TeacherSections,
};

function OverviewStrip({ navigation }: { navigation: any }) {
  return (
    <TouchableOpacity
      style={styles.overviewStrip}
      activeOpacity={0.8}
      onPress={() => navigation.navigate("Overview")}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space(3) }}>
        <View style={styles.overviewIconWrap}>
          <Ionicons name="grid-outline" size={20} color={colors.goldDeep} />
        </View>
        <View>
          <Text style={styles.overviewTitle}>Overview Dashboard</Text>
          <Text style={styles.overviewSub}>Tap to view full summary</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.sub} />
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }: any) {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const role = typeof session?.role === "string" && session.role ? session.role : "Student";
  const sections = SECTIONS_BY_ROLE[role] ?? StudentSections;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(5), paddingTop: insets.top + space(4), paddingBottom: insets.bottom + space(10) }}
    >
      <Text style={styles.eyebrow}>{SCHOOL_NAME.toUpperCase()}</Text>
      <Text style={styles.hi}>{greeting()}</Text>
      <Text style={styles.role}>Signed in as {role}</Text>

      <ChildBar />

      {role !== "Teacher" && <OverviewStrip navigation={navigation} />}

      {sections.map((section) => (
        <View key={section.title} style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>{section.title}</Text>
          <View style={styles.grid}>
            {section.data.map((t) => (
              <TouchableOpacity
                key={t.label}
                style={styles.tile}
                activeOpacity={0.8}
                onPress={() => navigation.navigate(t.route, t.params)}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={t.icon} size={18} color={colors.goldDeep} />
                </View>
                <Text style={styles.tileText}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, fontWeight: "800", color: colors.gold, letterSpacing: 1.2 },
  hi: { fontSize: 26, fontWeight: "800", color: colors.ink, marginTop: 6 },
  role: { fontSize: 14, color: colors.sub, marginTop: 4, marginBottom: space(6) },
  overviewStrip: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space(4),
    marginBottom: space(6),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overviewIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center"
  },
  overviewTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  overviewSub: { fontSize: 13, color: colors.sub, marginTop: 2 },
  sectionContainer: { marginBottom: space(6) },
  sectionHeader: { fontSize: 16, fontWeight: "700", color: colors.ink, marginBottom: space(3), marginLeft: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space(3) },
  tile: {
    width: "48%",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space(3),
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
  },
  iconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  tileText: { fontSize: 14, fontWeight: "600", color: colors.ink, flexShrink: 1 },
});

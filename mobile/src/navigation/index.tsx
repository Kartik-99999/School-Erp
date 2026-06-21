import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import { addNotificationTapListener, registerForPush } from "../lib/push";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import OverviewScreen from "../screens/OverviewScreen";
import NoticesScreen from "../screens/NoticesScreen";
import NoticeDetailScreen from "../screens/NoticeDetailScreen";
import AttendanceScreen from "../screens/AttendanceScreen";
import FeesScreen from "../screens/FeesScreen";
import PaymentHistoryScreen from "../screens/PaymentHistoryScreen";
import ReceiptScreen from "../screens/ReceiptScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ComingSoonScreen from "../screens/ComingSoonScreen";
import TimetableScreen from "../screens/TimetableScreen";
import SubjectsScreen from "../screens/SubjectsScreen";
import HomeworkScreen from "../screens/HomeworkScreen";
import ExamsScreen from "../screens/ExamsScreen";
import LibraryScreen from "../screens/LibraryScreen";
import LeavesScreen from "../screens/LeavesScreen";
import PaymentScreen from "../screens/PaymentScreen";
import ResourcesScreen from "../screens/ResourcesScreen";
import EventsScreen from "../screens/EventsScreen";
import TeacherClassesScreen from "../screens/TeacherClassesScreen";
import MarkAttendanceScreen from "../screens/MarkAttendanceScreen";
import TeacherScheduleScreen from "../screens/TeacherScheduleScreen";
import TeacherHomeworkScreen from "../screens/TeacherHomeworkScreen";
import MarksEntryScreen from "../screens/MarksEntryScreen";
import TeacherRosterScreen from "../screens/TeacherRosterScreen";
import StudentDetailScreen from "../screens/StudentDetailScreen";
import PostNoticeScreen from "../screens/PostNoticeScreen";
import LeaveApprovalsScreen from "../screens/LeaveApprovalsScreen";
import { colors } from "../theme";

const RootStack = createNativeStackNavigator();
const HomeNav = createNativeStackNavigator();
const NoticesNav = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const stackOpts = {
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.ink,
  headerTitleStyle: { fontWeight: "800" as const },
  contentStyle: { backgroundColor: colors.bg },
};

function HomeStack() {
  return (
    <HomeNav.Navigator screenOptions={stackOpts}>
      <HomeNav.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      <HomeNav.Screen name="Overview" component={OverviewScreen} options={{ title: "Overview" }} />
      <HomeNav.Screen name="Attendance" component={AttendanceScreen} />
      <HomeNav.Screen name="Fees" component={FeesScreen} />
      <HomeNav.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: "Payment history" }} />
      <HomeNav.Screen name="Receipt" component={ReceiptScreen} options={{ title: "Receipt" }} />
      <HomeNav.Screen name="Timetable" component={TimetableScreen} />
      <HomeNav.Screen name="Subjects" component={SubjectsScreen} />
      <HomeNav.Screen name="Homework" component={HomeworkScreen} />
      <HomeNav.Screen name="Exams" component={ExamsScreen} options={{ title: "Exams & Results" }} />
      <HomeNav.Screen name="Library" component={LibraryScreen} />
      <HomeNav.Screen name="Leaves" component={LeavesScreen} />
      <HomeNav.Screen name="Payment" component={PaymentScreen} options={{ title: "Payment" }} />
      <HomeNav.Screen name="Resources" component={ResourcesScreen} />
      <HomeNav.Screen name="Events" component={EventsScreen} />
      <HomeNav.Screen name="TeacherClasses" component={TeacherClassesScreen} options={{ title: "My classes" }} />
      <HomeNav.Screen name="MarkAttendance" component={MarkAttendanceScreen} />
      <HomeNav.Screen name="TeacherSchedule" component={TeacherScheduleScreen} options={{ title: "My schedule" }} />
      <HomeNav.Screen name="TeacherHomework" component={TeacherHomeworkScreen} options={{ title: "Homework" }} />
      <HomeNav.Screen name="MarksEntry" component={MarksEntryScreen} options={{ title: "Marks entry" }} />
      <HomeNav.Screen name="TeacherRoster" component={TeacherRosterScreen} options={{ title: "My classes" }} />
      <HomeNav.Screen name="StudentDetail" component={StudentDetailScreen} options={{ title: "Student" }} />
      <HomeNav.Screen name="PostNotice" component={PostNoticeScreen} options={{ title: "Post notice" }} />
      <HomeNav.Screen name="LeaveApprovals" component={LeaveApprovalsScreen} options={{ title: "Leave requests" }} />
      <HomeNav.Screen
        name="ComingSoon"
        component={ComingSoonScreen}
        options={({ route }: any) => ({ title: route?.params?.title || "Coming soon" })}
      />
    </HomeNav.Navigator>
  );
}

function NoticesStack() {
  return (
    <NoticesNav.Navigator screenOptions={stackOpts}>
      <NoticesNav.Screen name="NoticesList" component={NoticesScreen} options={{ headerShown: false }} />
      <NoticesNav.Screen name="NoticeDetail" component={NoticeDetailScreen} options={{ title: "Notice" }} />
    </NoticesNav.Navigator>
  );
}

const TAB_ICONS: Record<string, any> = { Home: "home", Notices: "notifications", Profile: "person" };

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.sub,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line, paddingTop: 4, height: 88 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name] || "ellipse"} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Notices" component={NoticesStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { session } = useAuth();

  // Register this device for push once signed in (no-op on web / dev-mock).
  React.useEffect(() => {
    if (session) registerForPush();
  }, [session]);

  // Handle notification taps (deep-linking is a documented TODO in lib/push).
  React.useEffect(() => {
    const unsub = addNotificationTapListener(() => {});
    return unsub;
  }, []);

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {session ? (
        <RootStack.Screen name="Main" component={MainTabs} />
      ) : (
        <RootStack.Screen name="Login" component={LoginScreen} />
      )}
    </RootStack.Navigator>
  );
}

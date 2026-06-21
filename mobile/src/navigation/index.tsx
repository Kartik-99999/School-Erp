import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import NoticesScreen from "../screens/NoticesScreen";
import NoticeDetailScreen from "../screens/NoticeDetailScreen";
import AttendanceScreen from "../screens/AttendanceScreen";
import FeesScreen from "../screens/FeesScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ComingSoonScreen from "../screens/ComingSoonScreen";
import TimetableScreen from "../screens/TimetableScreen";
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
      <HomeNav.Screen name="Attendance" component={AttendanceScreen} />
      <HomeNav.Screen name="Fees" component={FeesScreen} />
      <HomeNav.Screen name="Timetable" component={TimetableScreen} />
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

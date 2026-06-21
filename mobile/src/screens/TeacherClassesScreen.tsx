import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import { getMyClasses, TeacherClass } from "../api/teacher";
import { Empty, Loader } from "../ui";
import { colors, radius, space } from "../theme";

export default function TeacherClassesScreen({ navigation }: any) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setClasses(await getMyClasses(session?.userId));
      } catch {
        setErr("Couldn't load your classes.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loader />;
  if (err || classes.length === 0) return <Empty text={err || "No classes assigned to you."} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(5) }}>
      <Text style={styles.hint}>Pick a class to take attendance.</Text>
      {classes.map((c) => (
        <TouchableOpacity
          key={`${c.class_id}-${c.section_id}`}
          style={styles.row}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("MarkAttendance", { classId: c.class_id, sectionId: c.section_id, label: c.name })}
        >
          <View style={styles.icon}>
            <Ionicons name="people-outline" size={20} color={colors.goldDeep} />
          </View>
          <Text style={styles.name}>{c.name}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.sub} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: colors.sub, marginBottom: space(4) },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space(4), marginBottom: space(2), gap: space(3) },
  icon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" },
  name: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.ink },
});

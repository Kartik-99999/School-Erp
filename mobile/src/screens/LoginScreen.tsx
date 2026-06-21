import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../auth/AuthContext";
import { lookupSchool, SchoolBrand } from "../api/auth";
import { SCHOOL_NAME } from "../config";
import { colors, radius, space } from "../theme";

export default function LoginScreen() {
  const { signIn, verifyTwoFactor } = useAuth();
  const [brand, setBrand] = useState<SchoolBrand | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState<"login" | "2fa">("login");
  const [mfaToken, setMfaToken] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    lookupSchool().then(setBrand);
  }, []);
  const name = brand?.name || SCHOOL_NAME;

  const onSubmit = async () => {
    if (!username || !password) {
      setError("Enter your username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await signIn(username, password);
      if (r.twoFactor) {
        setMfaToken(r.twoFactor);
        setStage("2fa");
      }
    } catch (e: any) {
      setError(e?.message || e?.response?.data?.detail || "Could not sign in. Check your details.");
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (otp.trim().length < 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await verifyTwoFactor(mfaToken, otp);
    } catch (e: any) {
      setError(e?.message || e?.response?.data?.detail || "That code didn't work. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = () => {
    setStage("login");
    setOtp("");
    setError("");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brandWrap}>
          {brand?.logo_url ? (
            <Image source={{ uri: brand.logo_url }} style={styles.logo} resizeMode="cover" />
          ) : (
            <View style={styles.monogram}>
              <Text style={styles.monogramText}>{name.slice(0, 2).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.school}>{name}</Text>
          <Text style={styles.sub}>PARENT · STUDENT · TEACHER</Text>
        </View>

        <View style={styles.card}>
          {error ? (
            <View style={styles.errBox}>
              <Text style={styles.errText}>{error}</Text>
            </View>
          ) : null}

          {stage === "login" ? (
            <>
              <Text style={styles.h}>Sign in</Text>
              <Text style={styles.label}>Username</Text>
              <TextInput style={styles.input} autoCapitalize="none" autoCorrect={false} placeholder="Email, admission no. or employee ID" placeholderTextColor={colors.sub} value={username} onChangeText={setUsername} />
              <Text style={styles.label}>Password</Text>
              <TextInput style={styles.input} secureTextEntry placeholder="Your password" placeholderTextColor={colors.sub} value={password} onChangeText={setPassword} />
              <TouchableOpacity style={[styles.btn, loading && { opacity: 0.7 }]} onPress={onSubmit} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>Sign in</Text>}
              </TouchableOpacity>
              <Text style={styles.lock}>This app signs in only to {name}.</Text>
            </>
          ) : (
            <>
              <Text style={styles.h}>Two-factor code</Text>
              <Text style={styles.hint}>Enter the 6-digit code from your authenticator app.</Text>
              <TextInput style={[styles.input, styles.otp]} keyboardType="number-pad" autoFocus maxLength={6} placeholder="••••••" placeholderTextColor={colors.sub} value={otp} onChangeText={setOtp} />
              <TouchableOpacity style={[styles.btn, loading && { opacity: 0.7 }]} onPress={onVerify} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>Verify</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={backToLogin}>
                <Text style={styles.back}>← Use a different account</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: space(6) },
  brandWrap: { alignItems: "center", marginBottom: space(8) },
  logo: { width: 84, height: 84, borderRadius: 20, marginBottom: space(4) },
  monogram: { width: 84, height: 84, borderRadius: 20, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center", marginBottom: space(4), borderWidth: 1, borderColor: colors.gold },
  monogramText: { color: colors.goldDeep, fontSize: 28, fontWeight: "800" },
  school: { fontSize: 22, fontWeight: "800", color: colors.ink, textAlign: "center" },
  sub: { fontSize: 11, color: colors.sub, marginTop: 6, letterSpacing: 1.5 },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: space(6), borderWidth: 1, borderColor: colors.line, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 2 },
  h: { fontSize: 18, fontWeight: "800", color: colors.ink, marginBottom: space(2) },
  hint: { fontSize: 13, color: colors.sub, marginBottom: space(2) },
  label: { fontSize: 11, fontWeight: "700", color: colors.sub, marginBottom: 6, marginTop: space(4), textTransform: "uppercase", letterSpacing: 0.6 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3), fontSize: 15, color: colors.ink, backgroundColor: "#FBFAF7" },
  otp: { marginTop: space(4), textAlign: "center", fontSize: 24, letterSpacing: 8, fontWeight: "800" },
  btn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: space(4), alignItems: "center", marginTop: space(6) },
  btnText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  lock: { fontSize: 12, color: colors.sub, textAlign: "center", marginTop: space(5) },
  back: { fontSize: 13, color: colors.sub, textAlign: "center", marginTop: space(5), fontWeight: "600" },
  errBox: { backgroundColor: "#FEF2EC", borderColor: "#F3C7B3", borderWidth: 1, borderRadius: radius.md, padding: space(3), marginBottom: space(2) },
  errText: { color: colors.danger, fontSize: 13 },
});

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { getItem } from "../lib/storage";
import { API_URL, DEV_FAKE_ROLE } from "../config";
import { SESSION_KEY } from "../api/client";
import { Card, Loader, StateView } from "../ui";
import { colors, space } from "../theme";

// Opens the authenticated receipt PDF. WebView lets us attach the Bearer token (Linking
// can't). NOTE: iOS WebView renders PDFs inline; Android WebView does not render PDFs
// natively — a share/download or a server-rendered HTML receipt would be more robust there.
export default function ReceiptScreen({ route }: any) {
  const { receiptId, receiptNumber } = route.params || {};
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await getItem(SESSION_KEY);
        const s = raw ? JSON.parse(raw) : null;
        setToken(s?.token ?? null);
      } catch {
        /* no session */
      }
      setReady(true);
    })();
  }, []);

  if (DEV_FAKE_ROLE) {
    return (
      <View style={styles.center}>
        <Card style={{ alignItems: "center" }}>
          <Text style={styles.h}>Receipt {receiptNumber || ""}</Text>
          <Text style={styles.note}>Receipt PDF preview is available with a live backend.</Text>
        </Card>
      </View>
    );
  }
  if (!ready) return <Loader />;
  if (!receiptId || !token) return <StateView text="Couldn't open the receipt." />;

  const uri = `${API_URL}/fees/receipts/${receiptId}/pdf`;
  return (
    <View style={styles.fill}>
      <WebView source={{ uri, headers: { Authorization: `Bearer ${token}` } }} startInLoadingState originWhitelist={["*"]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space(6), backgroundColor: colors.bg },
  h: { fontSize: 16, fontWeight: "800", color: colors.ink, marginBottom: space(2) },
  note: { fontSize: 13, color: colors.sub, textAlign: "center", lineHeight: 19 },
});

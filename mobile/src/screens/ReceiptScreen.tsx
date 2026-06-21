import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { getReceiptHtml } from "../api/fees";
import { DEV_FAKE_ROLE } from "../config";
import { Card, Loader, StateView } from "../ui";
import { colors, space } from "../theme";

// Renders the server-built HTML receipt in a WebView. HTML renders inline on both iOS and
// Android (unlike a PDF), and auth is handled by the shared axios client when fetching.
export default function ReceiptScreen({ route }: any) {
  const { receiptId, receiptNumber } = route.params || {};
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (DEV_FAKE_ROLE) return;
    let active = true;
    (async () => {
      try {
        const h = await getReceiptHtml(receiptId);
        if (active) setHtml(h);
      } catch {
        if (active) setError(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [receiptId]);

  if (DEV_FAKE_ROLE) {
    return (
      <View style={styles.center}>
        <Card style={{ alignItems: "center" }}>
          <Text style={styles.h}>Receipt {receiptNumber || ""}</Text>
          <Text style={styles.note}>The full receipt opens here with a live backend.</Text>
        </Card>
      </View>
    );
  }
  if (error) return <StateView text="Couldn't open the receipt." />;
  if (!html) return <Loader />;

  return (
    <View style={styles.fill}>
      <WebView originWhitelist={["*"]} source={{ html }} startInLoadingState />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space(6), backgroundColor: colors.bg },
  h: { fontSize: 16, fontWeight: "800", color: colors.ink, marginBottom: space(2) },
  note: { fontSize: 13, color: colors.sub, textAlign: "center", lineHeight: 19 },
});

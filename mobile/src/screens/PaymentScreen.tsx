import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { initiateOnlinePayment, PaymentAllocation, verifyOnlinePayment } from "../api/fees";
import { SCHOOL_NAME } from "../config";
import { Loader, StateView } from "../ui";
import { colors } from "../theme";

// Hosted Razorpay checkout in a WebView. We initiate the order (server stamps the intent),
// load checkout.js with the school's key_id + order id, and on the success callback verify
// server-side. NOTE: react-native-webview is a native module — a device build needs
// `npm run android` after install. Web/dev previews never reach this screen (the Fees
// screen simulates success when DEV_FAKE_ROLE is set).
function buildCheckoutHtml(key: string, orderId: string, amountPaise: number, currency: string) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;background:#F6F5F2">
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  var options = {
    key: ${JSON.stringify(key)},
    order_id: ${JSON.stringify(orderId)},
    amount: ${JSON.stringify(amountPaise)},
    currency: ${JSON.stringify(currency)},
    name: ${JSON.stringify(SCHOOL_NAME)},
    description: "Fee payment",
    theme: { color: "#B0892F" },
    handler: function (r) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "success", razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature }));
    },
    modal: { ondismiss: function () { window.ReactNativeWebView.postMessage(JSON.stringify({ type: "dismiss" })); } }
  };
  try {
    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function (resp) { window.ReactNativeWebView.postMessage(JSON.stringify({ type: "error", message: (resp.error && resp.error.description) || "Payment failed" })); });
    rzp.open();
  } catch (e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "error", message: String(e) }));
  }
</script>
</body></html>`;
}

export default function PaymentScreen({ route, navigation }: any) {
  const { amount, studentId, allocations } = (route.params || {}) as {
    amount: number;
    studentId: string;
    allocations: PaymentAllocation[];
  };
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { order, key_id } = await initiateOnlinePayment(amount, studentId, allocations);
        setHtml(buildCheckoutHtml(key_id || "", order.id, order.amount, order.currency || "INR"));
      } catch {
        setError(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMessage = async (e: any) => {
    let msg: any;
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === "success") {
      setVerifying(true);
      try {
        await verifyOnlinePayment({
          razorpay_order_id: msg.razorpay_order_id,
          razorpay_payment_id: msg.razorpay_payment_id,
          razorpay_signature: msg.razorpay_signature,
          student_id: studentId,
        });
        Alert.alert("Payment successful", "Your fees have been paid. Thank you!");
        navigation.navigate("Fees", { paid: Date.now() });
      } catch {
        Alert.alert("Verification pending", "If money was deducted, it will be reconciled automatically.");
        navigation.goBack();
      } finally {
        setVerifying(false);
      }
    } else if (msg.type === "dismiss") {
      navigation.goBack();
    } else if (msg.type === "error") {
      Alert.alert("Payment failed", msg.message || "Please try again.");
      navigation.goBack();
    }
  };

  if (error) return <StateView text="Couldn't start the payment." onRetry={() => navigation.goBack()} />;
  if (!html || verifying) return <Loader />;

  return (
    <View style={styles.fill}>
      <WebView originWhitelist={["*"]} source={{ html }} onMessage={onMessage} startInLoadingState javaScriptEnabled />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
});

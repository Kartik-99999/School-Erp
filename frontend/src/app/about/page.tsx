import type { Metadata } from "next";
import DocPage, { H2 } from "../../components/landing/DocPage";

export const metadata: Metadata = {
  title: "About · Erpcore",
  description: "Why Erpcore exists — the operating system for Indian schools.",
};

export default function AboutPage() {
  return (
    <DocPage title="About Erpcore">
      <p>Erpcore is the operating system for your school — one platform for admissions, attendance, fees, examinations and communication, built specifically for how schools in India actually run.</p>
      <H2>Why we exist</H2>
      <p>Most schools run on a patchwork of registers, spreadsheets and disconnected tools. Fee records live in one place, attendance in another, marks in a third — and parents are left guessing. Erpcore brings the whole school day onto one screen, so staff spend less time reconciling and more time teaching.</p>
      <H2>Built for India</H2>
      <p>Rupee-native billing, CBSE-aware report cards, Aadhaar/APAAR/PEN handling, Razorpay payments and WhatsApp notifications are built in — not bolted on. Every school&apos;s data is fully isolated, encrypted, and never shared with anyone else.</p>
      <H2>Our promise</H2>
      <p>We&apos;re a young, India-built product, and we answer our own email. If you run a school and something&apos;s missing, tell us — it shapes what we build next.</p>
      <p>Get in touch at <a href="mailto:kartik@erpcore.tech" className="text-gold hover:underline">kartik@erpcore.tech</a>.</p>
    </DocPage>
  );
}

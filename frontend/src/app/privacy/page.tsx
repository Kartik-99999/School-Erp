import type { Metadata } from "next";
import DocPage, { H2 } from "../../components/landing/DocPage";

export const metadata: Metadata = {
  title: "Privacy · Erpcore",
  description: "How Erpcore protects school and student data.",
};

export default function PrivacyPage() {
  return (
    <DocPage title="Privacy Policy" updated="June 2026">
      <p>Erpcore is trusted with sensitive information about children, and we treat that as the foundation of the product. This page summarises how we handle data. A full Data Processing Agreement is available to schools on request.</p>
      <H2>Who controls the data</H2>
      <p>Your school is the data controller. Erpcore acts as a data processor — we store and process student and staff information only to provide the service to your school, under your instructions.</p>
      <H2>What we collect</H2>
      <p>Information your school enters to run day-to-day operations: student and guardian details, attendance, fees, marks and communications. We also collect basic account and usage data needed to operate and secure the platform.</p>
      <H2>How we protect it</H2>
      <p>Every school&apos;s data is isolated at the database level using Postgres row-level security — one school can never read another&apos;s. Personal identifiers such as Aadhaar, APAAR and PEN are encrypted at rest and masked on screen. Sessions are signed with RS256 and can be protected with two-factor authentication.</p>
      <H2>What we never do</H2>
      <p>We do not sell your data, and we do not use student information for advertising. We share data only with the processors needed to run the service (for example, Razorpay for payments), under appropriate safeguards.</p>
      <H2>Your rights</H2>
      <p>Schools and individuals may request access, correction or deletion of personal data. We aim to support obligations under India&apos;s Digital Personal Data Protection Act. Write to us and we&apos;ll help.</p>
      <H2>Contact</H2>
      <p>Questions or data requests: <a href="mailto:kartik@erpcore.tech" className="text-gold hover:underline">kartik@erpcore.tech</a>.</p>
    </DocPage>
  );
}

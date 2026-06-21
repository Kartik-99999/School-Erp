import type { Metadata } from "next";
import DocPage, { H2 } from "../../components/landing/DocPage";

export const metadata: Metadata = {
  title: "Terms · Erpcore",
  description: "The terms for using Erpcore.",
};

export default function TermsPage() {
  return (
    <DocPage title="Terms of Service" updated="June 2026">
      <p>These terms govern your school&apos;s use of Erpcore. By creating an account or using the platform, you agree to them.</p>
      <H2>The service</H2>
      <p>Erpcore provides a multi-tenant school management platform. We work to keep it available and secure, and we may improve or change features over time.</p>
      <H2>Accounts and access</H2>
      <p>Your school is responsible for the accounts it creates and for keeping login credentials secure. Each role sees only the data its permissions allow. Tell us immediately if you suspect unauthorised access.</p>
      <H2>Acceptable use</H2>
      <p>Use Erpcore only for legitimate school operations and in line with applicable law. Don&apos;t attempt to breach isolation between tenants, disrupt the service, or access data that isn&apos;t yours.</p>
      <H2>Payments</H2>
      <p>Paid plans are billed per student. Payments are processed through Razorpay into your school&apos;s own account where applicable. Fees, once due, are non-refundable except where required by law.</p>
      <H2>Availability and liability</H2>
      <p>We provide the service on a commercially reasonable, best-effort basis. To the extent permitted by law, Erpcore is not liable for indirect or consequential losses. Nothing here limits liability that cannot be limited by law.</p>
      <H2>Changes and contact</H2>
      <p>We may update these terms; we&apos;ll note the date above when we do. Questions: <a href="mailto:kartik@erpcore.tech" className="text-gold hover:underline">kartik@erpcore.tech</a>.</p>
    </DocPage>
  );
}

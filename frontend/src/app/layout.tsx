import type { Metadata } from "next";
// Fonts are self-hosted from npm (@fontsource-variable/*) instead of next/font/google,
// so the build never fetches from Google Fonts (which broke Vercel builds).
// The --font-* CSS variables these feed are defined in globals.css.
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import AuthProvider from "@/components/providers/AuthProvider";

export const metadata: Metadata = {
  title: "Erpcore — the operating system for your school",
  description:
    "Admissions, attendance, fees, exams, and communication — one precise grid that runs your entire school. Built for Indian schools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-surface text-ink">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

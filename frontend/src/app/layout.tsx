import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/providers/AuthProvider";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

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
    <html
      lang="en"
      className={`${jakarta.variable} ${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body className="font-sans antialiased bg-surface text-ink">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

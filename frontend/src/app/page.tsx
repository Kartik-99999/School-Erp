import Link from "next/link";
import { headers } from "next/headers";
import { ArrowRight, BookOpen, Users, BarChart3, Shield } from "lucide-react";
import SchoolForm from "./login/SchoolForm";

export default function LandingPage() {
  const headersList = headers();
  const host = headersList.get("host") || "";
  const hostname = host.split(":")[0];
  const isBaseDomain =
    hostname === "localhost" ||
    (hostname.split(".").length === 2 && !hostname.endsWith("localhost"));

  if (!isBaseDomain) {
    return <SchoolForm />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface dark:bg-slate-950">
      {/* Navbar */}
      <header className="px-6 lg:px-14 h-20 flex items-center border-b border-border dark:border-slate-800 bg-surface-card/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <Link className="flex items-center justify-center gap-2" href="#">
          <div className="bg-primary-600 p-2 rounded-xl">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-ink dark:text-white">
            EduCore ERP
          </span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link
            className="text-sm font-medium hover:text-primary-600 transition-colors text-ink-muted dark:text-ink-faint"
            href="#features"
          >
            Features
          </Link>
          <Link
            className="text-sm font-medium hover:text-primary-600 transition-colors text-ink-muted dark:text-ink-faint"
            href="#pricing"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="hidden sm:inline-flex text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors px-5 py-2.5 rounded-full shadow-sm hover:shadow-md"
          >
            Admin Dashboard
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center">
        <section className="w-full py-20 md:py-32 lg:py-48 xl:py-56 px-6 lg:px-14 flex flex-col items-center justify-center text-center overflow-hidden relative">
          {/* Background Gradients */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-30 dark:opacity-20 pointer-events-none blur-3xl rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500" />

          <div className="relative z-10 max-w-4xl mx-auto space-y-8">
            <div className="inline-flex items-center rounded-full border border-border dark:border-slate-800 bg-surface-card/50 dark:bg-slate-900/50 backdrop-blur-sm px-3 py-1 text-sm font-medium text-ink-muted dark:text-ink-faint shadow-sm mb-4">
              <span className="flex h-2 w-2 rounded-full bg-primary-600 mr-2 animate-pulse"></span>
              Next Generation School Management
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-ink dark:text-white">
              The complete operating system for{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                modern schools
              </span>
            </h1>

            <p className="mx-auto max-w-[700px] text-lg md:text-xl text-ink-muted dark:text-ink-faint leading-relaxed">
              Elevate your institution with our multi-tenant SaaS platform. Manage fees, academics,
              and communication in one beautiful, unified workspace.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-primary-600 px-8 py-4 text-base font-medium text-white shadow-lg hover:bg-primary-700 hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all duration-200"
              >
                Access Portal
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center rounded-full bg-surface-card dark:bg-slate-900 px-8 py-4 text-base font-medium text-ink dark:text-white border border-border dark:border-slate-800 shadow-sm hover:bg-surface dark:hover:bg-slate-800 transition-all duration-200"
              >
                Explore Features
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section
          id="features"
          className="w-full py-24 bg-surface-card dark:bg-slate-900/50 border-t border-border dark:border-slate-800 px-6 lg:px-14"
        >
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-ink dark:text-white">
                Everything you need to run your school
              </h2>
              <p className="text-lg text-ink-muted dark:text-ink-faint max-w-2xl mx-auto">
                Built specifically for the needs of modern educational institutions with role-based
                access for everyone.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: "Student Management",
                  description: "Attendance tracking, and comprehensive student profiles.",
                  icon: Users,
                  color: "bg-blue-500",
                },
                {
                  title: "Academic Operations",
                  description:
                    "Manage classes, subjects, exam scheduling, and automated report card generation.",
                  icon: BookOpen,
                  color: "bg-indigo-500",
                },
                {
                  title: "Financial Control",
                  description:
                    "Streamlined fee collection, automated receipts, payroll management, and accounting.",
                  icon: BarChart3,
                  color: "bg-emerald-500",
                },
                {
                  title: "Enterprise Security",
                  description:
                    "Multi-tenant architecture with Row-Level Security ensuring strict data isolation.",
                  icon: Shield,
                  color: "bg-purple-500",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="group p-8 rounded-card bg-surface dark:bg-slate-900 border border-border dark:border-slate-800 hover:border-primary-100 dark:hover:border-indigo-900/50 hover:shadow-xl hover:shadow-sm/50 dark:hover:shadow-indigo-900/20 transition-all duration-300"
                >
                  <div
                    className={`h-12 w-12 rounded-card ${feature.color} flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-ink dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-ink-muted dark:text-ink-faint leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border dark:border-slate-800 py-10 px-6 lg:px-14 bg-surface-card dark:bg-slate-950 text-center">
        <p className="text-ink-muted dark:text-ink-faint">
          © 2026 EduCore ERP. Built with Next.js and FastAPI.
        </p>
      </footer>
    </div>
  );
}

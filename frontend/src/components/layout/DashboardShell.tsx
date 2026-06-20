"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { clearTokenCache } from "@/lib/axios";
import { GraduationCap, Bell, Search, Menu, X, LogOut, ChevronRight, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}
export interface NavGroup {
  label?: string;
  items: NavItem[];
}
interface DashboardShellProps {
  brand: string;
  roleLabel: string;
  nav: NavGroup[];
  settingsHref?: string;
  children: React.ReactNode;
}

const isActivePath = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + "/");

export default function DashboardShell({
  brand,
  roleLabel,
  nav,
  settingsHref,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const email = session?.user?.email || "";
  const name = session?.user?.name || email || roleLabel;
  const subdomain = (session?.user as any)?.subdomain || "School";
  const initial = (name || roleLabel).charAt(0).toUpperCase();

  // Sign out without letting NextAuth resolve the redirect (it would default to
  // :3000 / the base domain). Navigate on the current origin so the user stays
  // on the same host & subdomain (e.g. springfield.erpcore.tech/login).
  const handleLogout = () => {
    clearTokenCache();
    signOut({ redirect: false }).then(() => {
      window.location.href = "/login";
    });
  };

  const allItems = nav.flatMap((g) => g.items);
  const active = allItems.find((i) => isActivePath(pathname, i.href));

  return (
    <div className="h-screen flex overflow-hidden bg-surface text-ink">
      {/* Mobile overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-surface-card border-r border-border flex flex-col
          transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="h-16 shrink-0 flex items-center gap-3 px-5 border-b border-border">
          <div className="w-9 h-9 rounded-btn bg-primary-600 flex items-center justify-center text-white shadow-sm">
            <GraduationCap size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink text-[15px] leading-tight truncate">{brand}</p>
            <p className="text-[11px] text-ink-faint uppercase tracking-wide truncate">
              {subdomain}
            </p>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="lg:hidden text-ink-faint hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-5 pt-4">
          <span className="inline-flex items-center rounded-badge bg-primary-50 text-primary-700 text-[11px] font-semibold px-2.5 py-0.5">
            {roleLabel}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {nav.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const act = isActivePath(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={`group flex items-center gap-3 px-3 py-2 rounded-btn text-sm font-medium transition-colors duration-150
                        ${act ? "bg-primary-50 text-primary-600 font-semibold" : "text-ink-muted hover:bg-surface hover:text-ink"}`}
                    >
                      <Icon
                        size={18}
                        className={act ? "text-primary-600" : "text-ink-faint group-hover:text-ink"}
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-border p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-sm shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink truncate">{name}</p>
            <p className="text-xs text-ink-muted truncate">{roleLabel}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-2 rounded-btn text-ink-faint hover:text-danger-text hover:bg-danger-bg transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 shrink-0 bg-surface-card border-b border-border flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 rounded-btn text-ink-muted hover:bg-surface"
            >
              <Menu size={20} />
            </button>
            <nav className="flex items-center gap-1.5 text-sm min-w-0">
              <span className="text-ink-muted hidden sm:inline">{roleLabel}</span>
              <ChevronRight size={14} className="text-ink-faint hidden sm:inline" />
              <span className="font-semibold text-ink truncate">{active?.name || "Dashboard"}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative hidden md:block">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                type="text"
                placeholder="Search..."
                className="w-[260px] rounded-input border border-border bg-surface pl-9 pr-3 py-2 text-sm text-ink placeholder:text-ink-faint
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
              />
            </div>

            <button
              className="relative p-2 rounded-btn text-ink-muted hover:bg-surface transition-colors"
              title="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-text rounded-full ring-2 ring-surface-card" />
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-9 h-9 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-sm hover:ring-2 hover:ring-primary-100 transition"
              >
                {initial}
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 rounded-card border border-border bg-surface-card shadow-dropdown z-50 origin-top-right animate-fade-in overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-ink truncate">{name}</p>
                      <p className="text-xs text-ink-muted truncate">{email || roleLabel}</p>
                    </div>
                    {settingsHref && (
                      <Link
                        href={settingsHref}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-muted hover:bg-surface hover:text-ink transition-colors"
                      >
                        <Settings size={16} /> Settings
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-danger-text hover:bg-danger-bg transition-colors"
                    >
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

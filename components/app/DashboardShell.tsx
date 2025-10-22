'use client';

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Sidebar } from "@/components/app/Sidebar";
import { Topbar } from "@/components/app/Topbar";
import { DashboardFooter } from "@/components/app/DashboardFooter";
import {
  FiActivity,
  FiBarChart2,
  FiCpu,
  FiDollarSign,
  FiFileText,
  FiHome,
  FiInbox,
  FiShield,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import type { IconType } from "react-icons";

type DashboardShellProps = {
  companyName: string;
  role: "owner" | "admin" | "guest";
  logoPath: string | null;
  userName: string | null;
  userEmail: string;
  userInitials: string;
  children?: ReactNode;
};

function formatRoleLabel(role: "owner" | "admin" | "guest") {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    default:
      return "Guest";
  }
}

export function DashboardShell({
  companyName,
  role,
  logoPath,
  userName,
  userEmail,
  userInitials,
  children,
}: DashboardShellProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);

  useEffect(() => {
    if (sidebarOpenMobile) {
      setSidebarCollapsed(false);
    }
  }, [sidebarOpenMobile]);

  useEffect(() => {
    if (!sidebarOpenMobile) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSidebarOpenMobile(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpenMobile]);

  const navigationItems = useMemo(
    () =>
      (
        [
          { label: "Overview", href: "/app", icon: FiHome },
          { label: "Automations", href: "/app/automations", icon: FiZap },
          { label: "Playbooks", href: "/app/playbooks", icon: FiFileText },
          { label: "Requests", href: "/app/requests", icon: FiInbox },
          { label: "Insights", href: "/app/insights", icon: FiBarChart2 },
          { label: "Team", href: "/app/team", icon: FiUsers },
          { label: "Finance", href: "/app/finance", icon: FiDollarSign },
          { label: "Ops Center", href: "/app/ops", icon: FiCpu },
          { label: "Security", href: "/app/security", icon: FiShield },
          { label: "Pulse", href: "/app/pulse", icon: FiActivity },
        ] satisfies Array<{ label: string; href: string; icon: IconType }>
      ),
    [],
  );

  const roleLabel = formatRoleLabel(role);

  const themeBackground =
    theme === "light"
      ? "bg-[radial-gradient(circle_at_top,_#f9fbff,_#d9e4ff)] text-neutral-900"
      : "bg-[radial-gradient(circle_at_top,_#0a1628,_#050910_75%)] text-neutral-100";

  const cardBackground =
    theme === "light" ? "bg-white/85 text-neutral-700" : "bg-neutral-900/70 text-neutral-100";

  const cardBorder =
    theme === "light" ? "border-neutral-200/80" : "border-white/10";

  const headingColor = theme === "light" ? "text-neutral-900" : "text-white";
  const paragraphColor = theme === "light" ? "text-neutral-600" : "text-neutral-300";
  const tileBorder = theme === "light" ? "border-neutral-200/70" : "border-white/10";
  const tileBackground = theme === "light" ? "bg-white/85" : "bg-white/5";
  const tileHeading = theme === "light" ? "text-neutral-800" : "text-white";
  const tileCopy = theme === "light" ? "text-neutral-500" : "text-neutral-300";

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeBackground}`}>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <div className="flex flex-1">
          <div
            className={`fixed inset-y-0 left-0 z-40 w-64 max-w-[85vw] transform transition-transform duration-300 lg:relative lg:z-auto lg:w-auto lg:max-w-none lg:transform-none ${sidebarOpenMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
          >
            <Sidebar
              companyName={companyName}
              roleLabel={roleLabel}
              logoPath={logoPath}
              theme={theme}
              navigationItems={navigationItems}
              collapsed={sidebarCollapsed}
              onToggle={() => {
                if (sidebarOpenMobile) {
                  setSidebarOpenMobile(false);
                }
                setSidebarCollapsed((state) => !state);
              }}
            />
          </div>

          {sidebarOpenMobile ? (
            <div
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpenMobile(false)}
            />
          ) : null}

          <main className={`flex w-full flex-1 flex-col transition-all duration-300 ${sidebarCollapsed ? "lg:pl-0" : "lg:pl-0"}`}>
            <Topbar
              companyName={companyName}
              roleLabel={roleLabel}
              theme={theme}
              onThemeToggle={toggleTheme}
              userName={userName}
              userEmail={userEmail}
              userInitials={userInitials}
              onMobileMenuToggle={() => setSidebarOpenMobile((state) => !state)}
            />

            <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-10 lg:py-12">
              {children ?? (
                <section
                  className={`rounded-3xl border ${cardBorder} ${cardBackground} p-8 shadow-[0_20px_70px_rgba(8,20,38,0.45)] transition`}
                >
                  <p className="text-xs uppercase tracking-[0.4em] text-[#3eb6fd]">
                    Alias dashboard
                  </p>
                  <h1 className={`mt-3 text-3xl font-semibold tracking-tight md:text-4xl ${headingColor}`}>
                    We&apos;re polishing this experience
                  </h1>
                  <p className={`mt-4 max-w-2xl text-sm ${paragraphColor}`}>
                    Your data pipelines will land here soon. We&apos;re building a workspace
                    summary that brings together pipeline health, approvals, and AI-driven
                    insights tailored to your focus areas.
                  </p>
                  <div className="mt-8 grid gap-6 md:grid-cols-3">
                    <div className={`rounded-2xl border ${tileBorder} ${tileBackground} p-5 transition`}>
                      <p className={`text-sm font-semibold ${tileHeading}`}>Automations</p>
                      <p className={`mt-2 text-xs ${tileCopy}`}>
                        Track upcoming workflows and see which ones need a final review.
                      </p>
                    </div>
                    <div className={`rounded-2xl border ${tileBorder} ${tileBackground} p-5 transition`}>
                      <p className={`text-sm font-semibold ${tileHeading}`}>Team activity</p>
                      <p className={`mt-2 text-xs ${tileCopy}`}>
                        Collaborator approvals and comment threads will surface here.
                      </p>
                    </div>
                    <div className={`rounded-2xl border ${tileBorder} ${tileBackground} p-5 transition`}>
                      <p className={`text-sm font-semibold ${tileHeading}`}>Insights</p>
                      <p className={`mt-2 text-xs ${tileCopy}`}>
                        AI-generated briefings keep every exec decision-ready at a glance.
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </div>

            <DashboardFooter theme={theme} />
          </main>
        </div>
      </div>
    </div>
  );
}

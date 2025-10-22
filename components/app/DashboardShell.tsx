"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Sidebar } from "@/components/app/Sidebar";
import { Topbar } from "@/components/app/Topbar";
import { DashboardFooter } from "@/components/app/DashboardFooter";
import {
  FiActivity,
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiCheckSquare,
  FiClock,
  FiCreditCard,
  FiDatabase,
  FiFileText,
  FiFolder,
  FiGlobe,
  FiGrid,
  FiHome,
  FiImage,
  FiLifeBuoy,
  FiLink,
  FiMail,
  FiMessageCircle,
  FiMessageSquare,
  FiPhone,
  FiPieChart,
  FiSend,
  FiServer,
  FiShare2,
  FiShield,
  FiShoppingBag,
  FiStar,
  FiUserCheck,
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
  profileImageUrl: string | null;
  children?: ReactNode;
};

type ServiceDefinition = {
  id: string;
  label: string;
  href: string;
  icon: IconType;
  summary: string;
  highlights: string[];
};

const serviceDefinitions: ServiceDefinition[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/app",
    icon: FiHome,
    summary: "",
    highlights: [],
  },
  {
    id: "domain-hosting",
    label: "Domain & Hosting",
    href: "/app/domain-hosting",
    icon: FiGlobe,
    summary:
      "Manage domains, DNS, SSL, and high-availability hosting from one dashboard.",
    highlights: [
      "Alias Domains provisions custom domains, SSL, and CDN automatically.",
      "Global uptime monitoring keeps sites responsive and secure.",
    ],
  },
  {
    id: "website-builder",
    label: "Website Builder",
    href: "/app/website-builder",
    icon: FiGrid,
    summary:
      "Build responsive marketing sites with a drag-and-drop editor and reusable blocks.",
    highlights: [
      "Alias Sites mixes Notion-style editing with Webflow-level control.",
      "Reusable components stay in sync across every page.",
    ],
  },
  {
    id: "blog",
    label: "Blog",
    href: "/app/blog",
    icon: FiBookOpen,
    summary:
      "Publish long-form content with versioned drafts, scheduled posts, and SEO helpers.",
    highlights: [
      "Editorial workflow supports approvals, tagging, and authorship.",
      "Content scoring surfaces search opportunities before you publish.",
    ],
  },
  {
    id: "ecommerce",
    label: "Ecommerce",
    href: "/app/ecommerce",
    icon: FiShoppingBag,
    summary:
      "Launch storefronts, manage products, and track orders without touching code.",
    highlights: [
      "Inventory, discounts, and subscriptions managed from one panel.",
      "Alias Pay delivers secure checkout, invoicing, and customer portals.",
    ],
  },
  {
    id: "brand-kit",
    label: "Brand Kit",
    href: "/app/brand-kit",
    icon: FiImage,
    summary:
      "Centralize logos, typography, imagery, and voice guidelines for every team.",
    highlights: [
      "Alias Brand locks approved colors, fonts, and design tokens.",
      "Share asset collections with agencies or collaborators in seconds.",
    ],
  },
  {
    id: "forms",
    label: "Forms",
    href: "/app/forms",
    icon: FiFileText,
    summary:
      "Design dynamic forms for lead capture, onboarding, and internal workflows.",
    highlights: [
      "Conditional logic, file uploads, and payments available on every form.",
      "Responses sync directly to CRM records and automation triggers.",
    ],
  },
  {
    id: "appointment-scheduler",
    label: "Appointment Scheduler",
    href: "/app/appointment-scheduler",
    icon: FiClock,
    summary:
      "Publish public booking pages and orchestrate events with automated reminders.",
    highlights: [
      "Alias Bookings syncs with Google Calendar and enforces buffer rules.",
      "SMS and email reminders reduce no-shows automatically.",
    ],
  },
  {
    id: "emailing",
    label: "Emailing System",
    href: "/app/emailing",
    icon: FiMail,
    summary:
      "Send transactional updates and nurture sequences with reputation safeguards.",
    highlights: [
      "Template library supports personalization and brand variables.",
      "Deliverability tools monitor domain health and feedback loops.",
    ],
  },
  {
    id: "phone",
    label: "Phone System",
    href: "/app/phone",
    icon: FiPhone,
    summary:
      "Route inbound calls, power virtual numbers, and log conversations automatically.",
    highlights: [
      "IVR flows and call recording keep support teams organized.",
      "Voicemail transcription and follow-up tasks happen instantly.",
    ],
  },
  {
    id: "crm",
    label: "CRM",
    href: "/app/crm",
    icon: FiUserCheck,
    summary:
      "Track prospects, customers, and renewals with flexible pipelines.",
    highlights: [
      "Alias CRM captures every interaction across chat, email, and forms.",
      "Custom fields and stages adapt to any sales or success motion.",
    ],
  },
  {
    id: "helpdesk-tickets",
    label: "Helpdesk & Tickets",
    href: "/app/helpdesk-tickets",
    icon: FiLifeBuoy,
    summary:
      "Turn support inboxes into collaborative ticket queues with clear SLAs.",
    highlights: [
      "Unified workspace for chat, SMS, and email conversations.",
      "Escalation rules and macros keep teams working in sync.",
    ],
  },
  {
    id: "ai-chatbot",
    label: "AI Chatbot",
    href: "/app/ai-chatbot",
    icon: FiMessageSquare,
    summary:
      "Embed GPT-powered assistants across sites and inboxes with guardrails.",
    highlights: [
      "Train bots on brand voice, knowledge bases, and product data.",
      "Role-based permissions prevent unauthorized actions or tone shifts.",
    ],
  },
  {
    id: "payment-gateways",
    label: "Payment Gateways",
    href: "/app/payment-gateways",
    icon: FiCreditCard,
    summary: "Connect Stripe, PayPal, Zeffy, and local gateways in minutes.",
    highlights: [
      "Tokenized vault handles PCI-sensitive data safely.",
      "Alias Pay orchestrates invoices, subscriptions, and refunds.",
    ],
  },
  {
    id: "finance-tracker",
    label: "Finance Tracker",
    href: "/app/finance-tracker",
    icon: FiPieChart,
    summary:
      "Monitor revenue, expenses, and cash flow with real-time dashboards.",
    highlights: [
      "Forecasting widgets project MRR, churn, and pipeline health.",
      "Custom dimensions tie spend back to campaigns, teams, or products.",
    ],
  },
  {
    id: "tax-accounting",
    label: "Tax & Accounting",
    href: "/app/tax-accounting",
    icon: FiBriefcase,
    summary:
      "Sync ledgers with QuickBooks, Xero, or NetSuite to automate compliance.",
    highlights: [
      "Two-way sync ensures invoices and payouts stay reconciled.",
      "Audit-ready exports cut closing time at quarter end.",
    ],
  },
  {
    id: "marketing-campaigns",
    label: "Marketing Campaigns",
    href: "/app/marketing-campaigns",
    icon: FiSend,
    summary:
      "Plan, launch, and analyze omnichannel campaigns from one command center.",
    highlights: [
      "Alias Reach unifies email, SMS, and push with shared segmentation.",
      "Automated A/B testing optimizes subject lines and send windows.",
    ],
  },
  {
    id: "social-media",
    label: "Social Media Connector",
    href: "/app/social-media",
    icon: FiShare2,
    summary:
      "Schedule, publish, and monitor posts across every major social platform.",
    highlights: [
      "Content calendar supports approvals and asset reuse.",
      "Analytics surface best-performing channels and creatives.",
    ],
  },
  {
    id: "referrals-reviews",
    label: "Referrals & Reviews",
    href: "/app/referrals-reviews",
    icon: FiStar,
    summary:
      "Grow advocacy with incentivized referrals and curated testimonial hubs.",
    highlights: [
      "Alias Reviews collects Google and Trustpilot responses automatically.",
      "Referral tracking attributes rewards and prevents fraud.",
    ],
  },
  {
    id: "task-project-manager",
    label: "Task & Project Manager",
    href: "/app/task-project-manager",
    icon: FiCheckSquare,
    summary:
      "Organize delivery with kanban boards, timelines, and checklist views.",
    highlights: [
      "Alias Work links tasks back to automations, deals, and incidents.",
      "Custom workflows and templates accelerate repeatable playbooks.",
    ],
  },
  {
    id: "calendar",
    label: "Calendar",
    href: "/app/calendar",
    icon: FiCalendar,
    summary:
      "Share team availability, milestones, and campaign timelines in one calendar.",
    highlights: [
      "Two-way sync with Google and Outlook keeps everyone aligned.",
      "Color-coded layers separate internal work from customer events.",
    ],
  },
  {
    id: "files",
    label: "File Storage",
    href: "/app/files",
    icon: FiFolder,
    summary: "Store documents, media, and contracts with granular permissions.",
    highlights: [
      "Alias Files encrypts every asset at rest with secure sharing links.",
      "Version history and approvals keep compliance audits painless.",
    ],
  },
  {
    id: "internal-chat",
    label: "Internal Chat",
    href: "/app/internal-chat",
    icon: FiMessageCircle,
    summary:
      "Host threaded discussions, standups, and announcements inside Alias.",
    highlights: [
      "Channels auto-link back to tasks, tickets, and deals.",
      "Async updates roll into digest emails for stakeholders.",
    ],
  },
  {
    id: "team",
    label: "Team Management",
    href: "/app/team",
    icon: FiUsers,
    summary:
      "Manage seats, roles, and SSO access from an admin-ready control plane.",
    highlights: [
      "Role-based permissions limit who can publish, bill, or automate.",
      "Employee onboarding bundles templates, checklists, and docs.",
    ],
  },
  {
    id: "compliance",
    label: "GDPR & CCPA Compliance",
    href: "/app/compliance",
    icon: FiShield,
    summary:
      "Automate data privacy requests and maintain regional consent policies.",
    highlights: [
      "Alias Shield logs every access and anonymization event.",
      "Consent banners adapt to jurisdiction and device automatically.",
    ],
  },
  {
    id: "audit-logs",
    label: "Logs & Audit Trails",
    href: "/app/logs",
    icon: FiActivity,
    summary: "Monitor every change with tamper-resistant audit trails.",
    highlights: [
      "Immutable logs provide actor, timestamp, and payload context.",
      "Real-time anomaly detection flags suspicious activity instantly.",
    ],
  },
  {
    id: "backups",
    label: "Backups",
    href: "/app/backups",
    icon: FiDatabase,
    summary:
      "Automated snapshots keep your data safe with rapid restore options.",
    highlights: [
      "Daily encrypted backups stored across multiple regions.",
      "Point-in-time recovery protects against accidental deletions.",
    ],
  },
  {
    id: "integration-portal",
    label: "Integration Portal",
    href: "/app/integration-portal",
    icon: FiLink,
    summary: "Connect Alias with Stripe, Google Workspace, Shopify, and more.",
    highlights: [
      "Alias Connect centralizes OAuth, API keys, and webhook management.",
      "Prebuilt recipes accelerate launch across popular stacks.",
    ],
  },
  {
    id: "automations-ai",
    label: "Automations & AI",
    href: "/app/automations",
    icon: FiZap,
    summary:
      "Design visual workflows and AI-powered processes that span every module.",
    highlights: [
      "Alias Flow links triggers, tools, and approvals with human-in-the-loop controls.",
      "ML-powered insights suggest next-best actions and risks.",
    ],
  },
  {
    id: "mcp",
    label: "Model Context Protocol",
    href: "/app/mcp",
    icon: FiServer,
    summary:
      "Expose secure, schema-validated tools to Alias AI and third-party agents.",
    highlights: [
      "Central tool catalog enforces role-based access and rate limits.",
      "Audit-ready execution logs keep every automation accountable.",
    ],
  },
];

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
  profileImageUrl,
  children,
}: DashboardShellProps) {
  // Initialize theme from localStorage to prevent flash
  const getInitialTheme = (): "dark" | "light" => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored === "light" || stored === "dark") {
        return stored;
      }
    }
    return "dark"; // Default fallback
  };

  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [userPreferences, setUserPreferences] = useState<{
    theme: "light" | "dark";
    language: string;
    notifications: { sms: boolean; email: boolean; push: boolean };
    marketing: { email_opt_in: boolean; organization_announcements: boolean };
    accessibility: {
      high_contrast: boolean;
      reduced_motion: boolean;
      large_text: boolean;
      screen_reader_optimized: boolean;
    };
  } | null>(null);

  useEffect(() => {
    if (sidebarOpenMobile) {
      setSidebarCollapsed(false);
    }
  }, [sidebarOpenMobile]);

  useEffect(() => {
    // Apply initial theme from localStorage immediately
    const initialTheme = getInitialTheme();
    if (typeof window !== "undefined") {
      if (initialTheme === "light") {
        document.documentElement.classList.add("light");
      } else {
        document.documentElement.classList.remove("light");
      }
    }

    // Fetch user preferences (but don't override theme if already set correctly)
    fetch("/api/settings/preferences")
      .then((res) => res.json())
      .then((data) => {
        setUserPreferences(data);

        // Only update theme if the database preference differs from localStorage
        const dbTheme = data.theme || "dark";
        if (dbTheme !== initialTheme) {
          setTheme(dbTheme);
          if (typeof window !== "undefined") {
            if (dbTheme === "light") {
              document.documentElement.classList.add("light");
            } else {
              document.documentElement.classList.remove("light");
            }
            localStorage.setItem("theme", dbTheme);
          }
        }
      })
      .catch((error) => {
        console.error("Failed to fetch user preferences:", error);
        // Keep the localStorage theme if API fails
      });
  }, []);

  useEffect(() => {
    // Listen for theme change events from other components
    function handleThemeChange(event: CustomEvent) {
      const newTheme = event.detail.theme;
      setTheme(newTheme);

      // Apply theme to document
      if (typeof window !== "undefined") {
        if (newTheme === "light") {
          document.documentElement.classList.add("light");
        } else {
          document.documentElement.classList.remove("light");
        }
        localStorage.setItem("theme", newTheme);
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener(
        "themeChange",
        handleThemeChange as EventListener
      );
      return () => {
        window.removeEventListener(
          "themeChange",
          handleThemeChange as EventListener
        );
      };
    }
  }, []);

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
      serviceDefinitions.map(({ label, href, icon }) => ({
        label,
        href,
        icon,
      })),
    []
  );

  const roleLabel = formatRoleLabel(role);

  const themeBackground =
    theme === "light"
      ? "bg-[radial-gradient(circle_at_top,_#f9fbff,_#d9e4ff)] text-neutral-900"
      : "bg-[radial-gradient(circle_at_top,_#0a1628,_#050910_75%)] text-neutral-100";

  const cardBackground =
    theme === "light"
      ? "bg-white/85 text-neutral-700"
      : "bg-neutral-900/70 text-neutral-100";

  const cardBorder =
    theme === "light" ? "border-neutral-200/80" : "border-white/10";

  const headingColor = theme === "light" ? "text-neutral-900" : "text-white";
  const paragraphColor =
    theme === "light" ? "text-neutral-600" : "text-neutral-300";
  const tileBorder =
    theme === "light" ? "border-neutral-200/70" : "border-white/10";
  const tileBackground = theme === "light" ? "bg-white/85" : "bg-white/5";
  const tileHeading = theme === "light" ? "text-neutral-800" : "text-white";
  const tileCopy = theme === "light" ? "text-neutral-500" : "text-neutral-300";

  async function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);

    if (typeof window !== "undefined") {
      if (nextTheme === "light") {
        document.documentElement.classList.add("light");
      } else {
        document.documentElement.classList.remove("light");
      }
      localStorage.setItem("theme", nextTheme);
    }

    // Save theme preference to API
    try {
      await fetch("/api/settings/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: nextTheme }),
      });

      // Dispatch event to notify other components
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("themeChange", {
            detail: { theme: nextTheme },
          })
        );
      }
    } catch (error) {
      console.error("Failed to save theme preference:", error);
    }
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${themeBackground}`}
    >
      <div className="flex min-h-screen flex-col lg:flex-row">
        <div className="flex flex-1">
          <div
            className={`fixed inset-y-0 left-0 z-40 w-64 max-w-[85vw] transform transition-transform duration-300 lg:relative lg:z-auto lg:w-auto lg:max-w-none lg:transform-none ${
              sidebarOpenMobile
                ? "translate-x-0"
                : "-translate-x-full lg:translate-x-0"
            }`}
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

          <main
            className={`flex w-full flex-1 flex-col transition-all duration-300 ${
              sidebarCollapsed ? "lg:pl-0" : "lg:pl-0"
            }`}
          >
            <Topbar
              companyName={companyName}
              roleLabel={roleLabel}
              theme={theme}
              onThemeToggle={toggleTheme}
              userName={userName}
              userEmail={userEmail}
              userInitials={userInitials}
              profileImageUrl={profileImageUrl}
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
                  <h1
                    className={`mt-3 text-3xl font-semibold tracking-tight md:text-4xl ${headingColor}`}
                  >
                    We&apos;re polishing this experience
                  </h1>
                  <p className={`mt-4 max-w-2xl text-sm ${paragraphColor}`}>
                    Your data pipelines will land here soon. We&apos;re building
                    a workspace summary that brings together pipeline health,
                    approvals, and AI-driven insights tailored to your focus
                    areas.
                  </p>
                  <div className="mt-8 grid gap-6 md:grid-cols-3">
                    <div
                      className={`rounded-2xl border ${tileBorder} ${tileBackground} p-5 transition`}
                    >
                      <p className={`text-sm font-semibold ${tileHeading}`}>
                        Automations
                      </p>
                      <p className={`mt-2 text-xs ${tileCopy}`}>
                        Track upcoming workflows and see which ones need a final
                        review.
                      </p>
                    </div>
                    <div
                      className={`rounded-2xl border ${tileBorder} ${tileBackground} p-5 transition`}
                    >
                      <p className={`text-sm font-semibold ${tileHeading}`}>
                        Team activity
                      </p>
                      <p className={`mt-2 text-xs ${tileCopy}`}>
                        Collaborator approvals and comment threads will surface
                        here.
                      </p>
                    </div>
                    <div
                      className={`rounded-2xl border ${tileBorder} ${tileBackground} p-5 transition`}
                    >
                      <p className={`text-sm font-semibold ${tileHeading}`}>
                        Insights
                      </p>
                      <p className={`mt-2 text-xs ${tileCopy}`}>
                        AI-generated briefings keep every exec decision-ready at
                        a glance.
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

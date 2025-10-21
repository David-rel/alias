const layers = [
  {
    emoji: "🏗️",
    title: "1. Foundation Layer — Brand & Presence",
    intro: "Every business must have its digital foundation.",
    needs: [
      "Custom domain (e.g., mybusiness.com)",
      "Hosting + SSL + CDN (speed, security)",
      "Website builder (landing pages, blog, portfolio)",
      "CMS (content management for pages, blogs, ecommerce etc.)",
      "Brand kit (logos, colors, fonts)",
    ],
    modules: [
      "Alias Sites: Drag-and-drop builder like Notion + Webflow",
      "Alias Brand: Store brand colors, logos, and templates globally",
      "Alias Domains: Domain purchase + DNS + SSL handled automatically",
    ],
  },
  {
    emoji: "💬",
    title: "2. Communication & Customer Interaction",
    intro: "Connection tools for inbound and outbound communication.",
    needs: [
      "Contact forms",
      "Live chat / AI chatbot",
      "Email inbox (support@, info@)",
      "SMS / WhatsApp integration",
      "Appointment booking",
      "Helpdesk + ticket system",
      "CRM (contacts, notes, tasks)",
    ],
    modules: [
      "Alias Chat: Unified inbox for chat, SMS, and WhatsApp",
      "Alias CRM: Simple pipeline for leads, clients, and follow-ups",
      "Alias Bookings: Scheduling page synced with Google Calendar",
    ],
  },
  {
    emoji: "💳",
    title: "3. Payments & Finance",
    intro: "Smooth ways to get paid and manage money.",
    needs: [
      "Checkout / invoices / subscriptions",
      "Donations (for nonprofits)",
      "Payment gateways (Stripe, PayPal, Zeffy, etc.)",
      "Expense tracking & receipts",
      "Dashboard for sales analytics",
      "Tax and accounting integration",
    ],
    modules: [
      "Alias Pay: No-code checkout + subscriptions",
      "Alias Invoices: Branded invoicing and auto reminders",
      "Alias Books: Lightweight accounting with bank sync",
    ],
  },
  {
    emoji: "📈",
    title: "4. Marketing & Growth",
    intro: "Every business needs traffic and visibility.",
    needs: [
      "Email campaigns",
      "SMS marketing",
      "Social post scheduler",
      "Analytics dashboard",
      "SEO tools",
      "Customer reviews & testimonials",
      "Referral program",
    ],
    modules: [
      "Alias Reach: Email + SMS campaigns from one panel",
      "Alias Social: Auto-schedule posts for Instagram, Facebook, LinkedIn",
      "Alias SEO: Keyword optimization and content scoring",
      "Alias Reviews: Collect and show Google / Trustpilot reviews",
    ],
  },
  {
    emoji: "🧠",
    title: "5. AI & Automation Layer",
    intro: "Intelligence that ties everything together.",
    needs: [
      "AI assistant for customer chat and emails",
      "Workflow automation (e.g., send invoice after booking)",
      "Personalized website content (based on visitor type)",
      "Predictive insights (sales forecast, churn risk)",
    ],
    modules: [
      "Alias AI: GPT-powered assistant for customer support and copywriting",
      "Alias Flow: Zapier-style visual automation builder",
      "Alias Predict: Simple data dashboard powered by machine learning",
      "Alias MCP: MCP-compliant tool server to expose internal and third-party tools to Alias AI and Alias Flow",
    ],
  },
  {
    emoji: "👥",
    title: "6. Team & Operations",
    intro: "Internal structure to keep work running smoothly.",
    needs: [
      "Task and project management",
      "Shared calendar",
      "File storage",
      "Internal chat / discussion board",
      "Employee portal (onboarding, HR basics)",
    ],
    modules: [
      "Alias Work: Kanban + timeline views for projects",
      "Alias Files: Shared drive with permissions",
      "Alias Team: Roles, permissions, and internal chat",
    ],
  },
  {
    emoji: "🔒",
    title: "7. Security, Compliance, and Admin",
    intro: "Essential for trust and safety.",
    needs: [
      "User authentication",
      "Role-based access",
      "Data backups",
      "GDPR / CCPA compliance",
      "Audit logs",
    ],
    modules: [
      "Alias Admin: Central admin control panel",
      "Alias Auth: Secure login + 2FA + SSO",
      "Alias Shield: Daily backups and compliance manager",
    ],
  },
  {
    emoji: "🌐",
    title: "8. Integrations Layer",
    intro: "Connections that make Alias universal.",
    needs: [
      "Stripe, PayPal, QuickBooks",
      "Google Workspace, Microsoft 365",
      "Shopify, Etsy, WooCommerce",
      "Zapier, Make, Slack",
      "Notion, Trello, ClickUp",
    ],
    modules: [
      "Alias Connect: Integration hub (like Zapier + native apps)",
    ],
  },
  {
    emoji: "⚙️",
    title: "9. Infrastructure & Deployment",
    intro: "Under the hood features that matter.",
    needs: [
      "Multi-tenant setup for multiple businesses",
      "Role-based dashboard (Admin / Manager / Staff)",
      "Custom domain per workspace",
      "Usage-based billing + seat-based pricing",
      "Cloud functions for automations",
    ],
    modules: [],
  },
];

const mcpDetails = {
  headline: "MCP Server (Model Context Protocol)",
  description:
    "A unifying tool layer that lets AI agents and automations call secure, well-scoped tools via the MCP standard.",
  whatItIs: [
    "An MCP server that registers tools such as “create_invoice”, “lookup_contact”, “send_email”, “book_appointment”, and custom Alias actions.",
    "Exposes a schema for each tool with inputs, outputs, and permissions so AI agents can call them safely.",
    "Acts as a single gateway for Alias AI and Alias Flow to execute actions across your stack.",
  ],
  whyHelps: [
    "One place to manage capabilities, auth, and rate limits.",
    "Safer automation: strict schemas and role-based access reduce risky calls.",
    "Reusable tools across chat, workflows, and future agents.",
  ],
  toolset: [
    "contacts.lookup_by_email(email)",
    "crm.create_lead(name, email, source)",
    "invoices.create(customer_id, items[])",
    "messaging.send_email(to, subject, body)",
    "bookings.create_slot(start, end, attendee)",
    "files.store(name, url)",
  ],
  security: [
    "OAuth or API key vault per integration",
    "Role-based allowlists for tools per workspace role",
    "Input validation and output redaction for PII",
    "Audit log per tool call with timestamps and actors",
  ],
  deployment: [
    "Start with a single “Alias MCP” service",
    "Adapters for Stripe, Gmail, Google Calendar, Notion, Slack, etc.",
    "Versioned tool schemas; backward-compatible changes only",
    "Staging and production servers with separate credentials",
  ],
  plugsIn: [
    "Alias AI calls tools during chats and email drafting to take actions",
    "Alias Flow nodes can invoke MCP tools inside automations",
    "Future agents reuse the same tool catalog without duplicate integrations",
  ],
};

export const metadata = {
  title: "Alias Features",
  description:
    "Explore the full Alias stack—nine layers of business tooling connected by AI and MCP automation.",
};

export default function FeaturesPage() {
  return (
    <div className="space-y-24">
      <section className="rounded-3xl border border-white/10 bg-neutral-950/70 p-10 shadow-lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-[#3eb6fd]">
              Platform blueprint
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Everything a small business needs, orchestrated by one AI-first
              platform.
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-neutral-300">
              Alias bundles nine essential layers—from digital presence through
              automation infrastructure—so founders can stop stitching tools and
              start scaling. Each module can run standalone or collaborate
              through shared MCP interfaces.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0064d6] via-[#23a5fe] to-[#3eb6fd] px-6 py-5 text-neutral-950 shadow-[0_10px_45px_rgba(35,165,254,0.35)]">
            <p className="text-xs uppercase tracking-[0.4em] text-neutral-950/70">
              Layers covered
            </p>
            <p className="mt-2 text-3xl font-semibold leading-none">9</p>
            <p className="mt-2 text-sm font-medium">
              Interlocking modules, one control surface.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-10">
        {layers.map((layer) => (
          <article
            key={layer.title}
            className="rounded-3xl border border-white/10 bg-neutral-950/60 p-8 shadow-lg transition hover:-translate-y-1 hover:border-[#23a5fe]/60 hover:shadow-[0_12px_45px_rgba(35,165,254,0.25)]"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="w-full lg:w-1/3">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-neutral-900/60 px-4 py-2 text-sm text-white">
                  <span className="text-xl">{layer.emoji}</span>
                  <span>{layer.title}</span>
                </div>
                <p className="mt-4 text-sm text-neutral-400">{layer.intro}</p>
              </div>
              <div className="grid flex-1 gap-6 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-[#23a5fe]">
                    Core needs
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-neutral-300">
                    {layer.needs.map((need) => (
                      <li
                        key={need}
                        className="flex items-start gap-2 rounded-2xl border border-white/5 bg-neutral-900/60 px-4 py-3"
                      >
                        <span className="text-[#3eb6fd]">•</span>
                        <span>{need}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-[#23a5fe]">
                    Alias modules
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-neutral-300">
                    {layer.modules.length ? (
                      layer.modules.map((module) => (
                        <li
                          key={module}
                          className="flex items-start gap-2 rounded-2xl border border-white/5 bg-neutral-900/60 px-4 py-3"
                        >
                          <span className="text-[#0064d6]">◦</span>
                          <span>{module}</span>
                        </li>
                      ))
                    ) : (
                      <li className="rounded-2xl border border-white/5 bg-neutral-900/60 px-4 py-3 text-neutral-400">
                        Roadmap in progress—priority integrations will be
                        announced soon.
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-10 rounded-3xl border border-white/10 bg-neutral-950/70 p-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              {mcpDetails.headline}
            </h2>
            <p className="mt-2 text-sm text-neutral-300">
              {mcpDetails.description}
            </p>
          </div>
          <div className="rounded-full border border-[#23a5fe]/40 bg-[#03162d]/80 px-5 py-2 text-xs font-medium uppercase tracking-[0.35em] text-[#3eb6fd]">
            Alias MCP Layer
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <InfoCard title="What it is" items={mcpDetails.whatItIs} tone="primary" />
          <InfoCard title="Why it helps" items={mcpDetails.whyHelps} tone="accent" />
          <InfoCard title="Initial tool set" items={mcpDetails.toolset} />
          <InfoCard title="Security & governance" items={mcpDetails.security} />
          <InfoCard title="Deployment approach" items={mcpDetails.deployment} />
          <InfoCard title="How it plugs in" items={mcpDetails.plugsIn} />
        </div>
      </section>
    </div>
  );
}

function InfoCard({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: string[];
  tone?: "primary" | "accent" | "default";
}) {
  const toneStyles =
    tone === "primary"
      ? "border-[#0064d6]/50 bg-[#03162d]/80"
      : tone === "accent"
        ? "border-[#3eb6fd]/60 bg-[#03162d]/70"
        : "border-white/10 bg-neutral-900/60";

  return (
    <div
      className={`rounded-3xl border ${toneStyles} p-6 text-sm text-neutral-200 shadow-[0_12px_35px_rgba(3,22,45,0.35)]`}
    >
      <p className="text-xs uppercase tracking-[0.35em] text-[#3eb6fd]">
        {title}
      </p>
      <ul className="mt-3 space-y-2 text-neutral-300">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-[#23a5fe]">▹</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

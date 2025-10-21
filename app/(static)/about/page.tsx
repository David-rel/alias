import Image from "next/image";

export const metadata = {
  title: "About Alias",
  description:
    "Learn how Alias brings small business operations, AI, and MCP automation together.",
};

const milestones = [
  {
    year: "2022",
    title: "Idea in motion",
    description:
      "We started Alias after building digital stacks for dozens of small businesses that all shared the same pain: tools everywhere, context nowhere.",
  },
  {
    year: "2023",
    title: "MCP-first architecture",
    description:
      "We adopted the Model Context Protocol to give AI agents safe, schema-driven access to every integration Alias touches.",
  },
  {
    year: "2024",
    title: "Unified workspace launch",
    description:
      "Alias Sites, Pay, and Chat launched in a single workspace, saving teams 18+ hours per week on manual orchestration.",
  },
];

const values = [
  {
    title: "Automation with guardrails",
    copy: "Our agents don’t spray tasks blindly. MCP schemas, audit logs, and permission tiers keep every action reviewable.",
  },
  {
    title: "Design for busy humans",
    copy: "Admins, managers, and contractors all get a tailored view, so focus flows to the highest-impact work.",
  },
  {
    title: "Open integration fabric",
    copy: "Alias Connect embraces the tools you already rely on—Stripe, Google Workspace, Notion, QuickBooks, and more.",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-24">
      <section className="grid gap-12 rounded-3xl border border-white/10 bg-neutral-950/70 p-10 lg:grid-cols-[2fr_1fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-[#3eb6fd]">
            Our mission
          </p>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white">
            Automate the entire business backbone so founders can focus on
            vision, not admin.
          </h1>
          <p className="mt-6 text-base text-neutral-300">
            Alias brings every foundational system—web, payments, CRM, finance,
            marketing, and operations—into one orchestrated surface. Our MCP
            tooling gives AI a common language to perform tasks safely across
            the stack, while humans get visibility, approvals, and insights in
            real time.
          </p>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0064d6] to-[#23a5fe] p-6 text-white shadow-[0_10px_45px_rgba(35,165,254,0.35)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(62,182,253,0.35)_0%,_transparent_65%)]" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3 text-sm uppercase tracking-[0.3em] text-white/80">
              <span className="h-px flex-1 bg-white/30" />
              <span>Alias values</span>
              <span className="h-px flex-1 bg-white/30" />
            </div>
            <ul className="space-y-4 text-sm">
              {values.map((value) => (
                <li key={value.title}>
                  <p className="font-semibold">{value.title}</p>
                  <p className="mt-1 text-white/80">{value.copy}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-neutral-950/60 p-10">
        <h2 className="text-2xl font-semibold text-white">Milestones</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {milestones.map((milestone) => (
            <div
              key={milestone.year}
              className="rounded-3xl border border-white/10 bg-neutral-950/80 p-6 transition hover:border-[#23a5fe]/60"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-neutral-400">
                {milestone.year}
              </p>
              <p className="mt-4 text-lg font-semibold text-white">
                {milestone.title}
              </p>
              <p className="mt-3 text-sm text-neutral-400">
                {milestone.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-neutral-950/60 p-10">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Humans + AI, collaborating in the open.
            </h2>
            <p className="mt-4 text-sm text-neutral-400">
              Alias is remote-first, spanning product, design, and success teams
              across three continents. We believe the next wave of small
              business experiences is collaborative: humans define intent, Alias
              AI executes across systems, and teams keep full visibility into
              every action with granular audit logs.
            </p>
          </div>
          <div className="relative h-64 overflow-hidden rounded-3xl border border-white/10">
            <Image
              src="/photos/dark/logoClear.png"
              alt="Alias abstract"
              fill
              sizes="(max-width:768px) 100vw, 400px"
              className="object-contain p-10 opacity-60"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

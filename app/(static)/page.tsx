import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Alias | AI-orchestrated growth for small businesses",
  description:
    "Unify websites, payroll, marketing, and customer touchpoints with Alias — a single AI-connected hub for modern small businesses.",
};

const highlights = [
  {
    label: "MCP-connected",
    value: "20+",
    description: "prebuilt automation connectors launching Q1.",
  },
  {
    label: "Time saved",
    value: "18h",
    description: "per week on average for early partners.",
  },
  {
    label: "Unified tools",
    value: "9",
    description: "core layers delivered in one platform.",
  },
];

export default function StaticLandingPage() {
  return (
    <div className="space-y-24">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#03162d] via-[#0064d6] to-[#23a5fe] px-8 py-16 text-white shadow-2xl">
        <div className="absolute -top-48 right-10 h-72 w-72 animate-[spin_40s_linear_infinite] rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-44 left-10 h-80 w-80 animate-[spin_55s_linear_infinite_reverse] rounded-full bg-[#3eb6fd]/30 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-12 lg:flex-row lg:items-center">
          <div className="lg:w-3/5">
            <div className="flex items-center gap-3 text-sm uppercase tracking-[0.3em]">
              <span className="h-px flex-1 bg-white/40" />
              <span>Alias Platform</span>
              <span className="h-px flex-1 bg-white/40" />
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              Every business workflow orchestrated by AI.
            </h1>
            <p className="mt-6 max-w-xl text-base text-white/80 sm:text-lg">
              Alias connects websites, payments, customer communication, and MCP
              automation into a single control hub. Spend less time stitching
              tools and more time building the business you imagine.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-medium text-[#03162d] transition hover:bg-white/90"
              >
                Get started now
              </Link>
              <Link
                href="/static/features"
                className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
              >
                Explore capabilities
              </Link>
            </div>
          </div>
          <div className="relative grid gap-6 rounded-3xl border border-white/10 bg-neutral-950/40 p-8 shadow-[0_0_40px_rgba(3,22,45,0.45)] backdrop-blur lg:w-2/5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-neutral-950/80">
                <Image
                  src="/photos/light/logoClear.png"
                  alt="Alias logo"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                />
              </div>
              <div>
                <p className="text-sm text-white/60">Alias Control Hub</p>
                <p className="text-base font-semibold text-white">
                  Human + AI copilot
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-sm text-[#03162d] shadow-inner shadow-white/20">
              <p className="font-semibold text-[#03162d]">
                “Draft onboarding website copy for wellness studio.”
              </p>
              <p className="mt-2 text-[#03162d]/80">
                Alias synthesizes hero headlines, booking CTAs, and SEO sections
                tailored to your niche, ready to publish.
              </p>
            </div>
            <div className="space-y-2">
              {highlights.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-neutral-950/70 px-4 py-3 text-sm"
                >
                  <div className="text-white/70">{item.label}</div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">
                      {item.value}
                    </p>
                    <p className="text-xs text-white/60">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: "Connected foundation",
            description:
              "Launch your site, brand kit, and domain in minutes — all synced to future automations.",
          },
          {
            title: "Ops cockpit",
            description:
              "Monitor pipeline, finances, and customer conversations from a unified timeline.",
          },
          {
            title: "AI that activates",
            description:
              "Alias MCP agents execute steps across your stack so you can focus on decisions, not busywork.",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/70 p-8 shadow-lg transition hover:-translate-y-1 hover:border-[#23a5fe]/60 hover:shadow-[0_10px_45px_rgba(35,165,254,0.35)]"
          >
            <div className="absolute -top-12 right-0 h-24 w-24 rounded-full bg-[#3eb6fd]/20 blur-2xl" />
            <h2 className="relative text-lg font-semibold text-white">
              {card.title}
            </h2>
            <p className="relative mt-4 text-sm text-neutral-400">
              {card.description}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}

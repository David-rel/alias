import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Alias Dashboard",
  description:
    "Your connected workspace for operations, finance, and marketing automation.",
};

const quickLinks = [
  { label: "View pipeline", href: "/app/pipeline" },
  { label: "Run payroll", href: "/app/payroll" },
  { label: "Plan marketing sprint", href: "/app/campaigns" },
];

export default async function AppHome() {
  const session = await getServerSession(authOptions);

  if (session?.user?.onboardingCompleted === false) {
    redirect("/app/onboarding");
  }

  return (
    <div className="space-y-12">
      <header className="rounded-3xl border border-white/10 bg-neutral-900/80 px-8 py-10 text-neutral-100">
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome back to Alias
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-neutral-400">
          This dashboard will aggregate mission-critical insights once
          authentication is connected. For now use the quick links below to
          sketch the core product areas.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-3xl border border-white/10 bg-neutral-900/40 p-6 text-neutral-200 transition hover:border-[#23a5fe]/60 hover:bg-[#03162d]/80"
          >
            <p className="text-base font-medium text-neutral-100">
              {link.label}
            </p>
            <p className="mt-2 text-sm text-neutral-400">
              Placeholder route. Wire actual modules to expose authenticated
              tooling.
            </p>
          </Link>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#03162d] p-8 text-white">
        <h2 className="text-xl font-semibold">Next steps</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-white/80">
          <li>Hook up authentication guards to restrict access to `/app/*`.</li>
          <li>
            Connect MCP agents to orchestrate workflows from the central queue.
          </li>
          <li>
            Streamline notifications so teams can approve automations in real
            time.
          </li>
        </ul>
      </section>
    </div>
  );
}

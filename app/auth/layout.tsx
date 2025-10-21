import type { ReactNode } from "react";
import { StaticNavbar } from "@/components/static/Navbar";
import { StaticFooter } from "@/components/static/Footer";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-neutral-950 text-neutral-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(3,22,45,0.85)_0%,transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(62,182,253,0.25)_0%,transparent_70%)] blur-3xl" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-16 pt-10 sm:px-6">
        <StaticNavbar />
        <main className="flex flex-1 items-center justify-center py-10">
          <section className="relative flex w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/70 shadow-[0_20px_60px_rgba(3,22,45,0.45)] backdrop-blur">
            <div className="hidden w-2/5 flex-col justify-between border-r border-white/10 bg-linear-to-br from-[#03162d] via-[#0064d6] to-[#23a5fe] p-10 text-white lg:flex">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/70">
                  Alias secured
                </p>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                  Access the AI-powered workspace built for small businesses.
                </h2>
              </div>
              <ul className="space-y-4 text-sm text-white/80">
                <li className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-inner shadow-white/10">
                  Approve automations, monitor MCP tool usage, and collaborate
                  with Alias AI in real time.
                </li>
                <li className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-inner shadow-white/10">
                  Keep finance, marketing, and ops aligned with unified
                  timelines and audit trails.
                </li>
              </ul>
            </div>
            <div className="relative w-full p-8 sm:p-10 lg:w-3/5">
              <div className="absolute -top-20 right-0 h-40 w-40 rounded-full bg-[#3eb6fd]/20 blur-3xl" />
              <div className="absolute -bottom-24 left-10 h-40 w-40 rounded-full bg-[#0064d6]/25 blur-3xl" />
              <div className="relative z-10">{children}</div>
            </div>
          </section>
        </main>
        <StaticFooter />
      </div>
    </div>
  );
}

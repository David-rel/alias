import Link from "next/link";

const footerLinks = [
  { label: "Terms", href: "#" },
  { label: "Privacy", href: "#" },
  { label: "Status", href: "#" },
];

export function StaticFooter() {
  return (
    <footer className="relative mt-24 rounded-3xl border border-white/5 bg-neutral-950/80 px-4 py-10 text-neutral-300 shadow-inner shadow-[#03162d]/60 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#3eb6fd]">
            Alias
          </p>
          <p className="mt-2 max-w-md text-sm text-neutral-400">
            AI-orchestrated operating system for every small business workflow.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-[#23a5fe]/60 hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-full bg-linear-to-r from-[#0064d6] via-[#23a5fe] to-[#3eb6fd] px-4 py-2 text-sm font-semibold text-neutral-950 shadow-[0_0_20px_rgba(35,165,254,0.35)] transition hover:brightness-110"
          >
            Start now
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-neutral-500">
        <p>© {new Date().getFullYear()} Alias. All rights reserved.</p>
        <nav className="flex flex-wrap gap-4">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-[#3eb6fd]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

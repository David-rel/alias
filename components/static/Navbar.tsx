import Link from "next/link";
import Image from "next/image";

const links = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Features", href: "/features" },
];

export function StaticNavbar() {
  return (
    <header className="relative z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/5 bg-neutral-950/70 px-4 py-3 shadow-lg shadow-[#03162d]/40 backdrop-blur transition hover:border-[#23a5fe]/40 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-neutral-950/80">
            <Image
              src="/photos/light/logoClear.png"
              alt="Alias logo"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              priority
            />
          </div>
          <span className="text-base font-semibold tracking-tight text-white">
            Alias
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-neutral-300 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
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
            Get started now
          </Link>
        </div>
      </div>
    </header>
  );
}

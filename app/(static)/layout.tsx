import type { ReactNode } from "react";
import { StaticNavbar } from "@/components/static/Navbar";
import { StaticFooter } from "@/components/static/Footer";

export default function StaticLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-neutral-950 text-neutral-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-[pulse_12s_ease-in-out_infinite] bg-[radial-gradient(circle_at_top,_rgba(62,182,253,0.18)_0%,_transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(3,22,45,0.8)_0%,_transparent_65%)]"></div>
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-16 px-4 pb-16 pt-10 sm:px-6">
        <StaticNavbar />
        <main className="flex-1">{children}</main>
        <StaticFooter />
      </div>
    </div>
  );
}

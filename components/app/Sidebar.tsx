'use client';

import Link from "next/link";
import Image from "next/image";
import type { IconType } from "react-icons";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

type NavItem = {
  label: string;
  href: string;
  icon: IconType;
};

type Props = {
  companyName: string;
  roleLabel: string;
  logoPath: string | null;
  theme: "light" | "dark";
  navigationItems: NavItem[];
  collapsed: boolean;
  onToggle: () => void;
};

function LogoBadge({ companyName, logoPath, collapsed }: { companyName: string; logoPath: string | null; collapsed: boolean }) {
  const sizeClasses = collapsed ? "h-16 w-16 lg:h-12 lg:w-12" : "h-16 w-16";

  if (logoPath) {
    return (
      <div
        className={`flex ${sizeClasses} items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-inner`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoPath}
          alt={`${companyName} logo`}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  const initials = companyName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, collapsed ? 1 : 2);

  return (
    <div
      className={`flex ${sizeClasses} items-center justify-center rounded-2xl border border-[#3eb6fd]/50 bg-gradient-to-br from-[#003a71] via-[#0b4f92] to-[#23a5fe] text-lg font-semibold text-white shadow-[0_12px_35px_rgba(35,165,254,0.35)]`}
    >
      {initials || "A"}
    </div>
  );
}

export function Sidebar({
  companyName,
  roleLabel,
  logoPath,
  theme,
  navigationItems,
  collapsed,
  onToggle,
}: Props) {
  const containerWidth = collapsed ? "lg:max-w-[84px] lg:px-4" : "lg:max-w-[220px] lg:px-5";
  const backgroundClass =
    theme === "light"
      ? "bg-white/90 text-neutral-800"
      : "bg-neutral-950/80 text-neutral-100";
  const borderColor = theme === "light" ? "border-neutral-200/80" : "border-white/10";
  const badgeBorder = theme === "light" ? "border-[#3eb6fd]/30 bg-white" : "border-[#3eb6fd]/40 bg-white/10";
  const headerText = theme === "light" ? "text-neutral-900" : "text-white";
  const pillColors = theme === "light" ? "border-neutral-200 bg-white text-neutral-700" : "border-white/10 bg-white/5 text-white";
  const toggleButtonClass =
    theme === "light"
      ? "border-neutral-200 bg-white text-neutral-600 hover:border-[#23a5fe]/60 hover:text-[#0f2747]"
      : "border-white/10 bg-neutral-900 text-neutral-100 hover:border-[#3eb6fd]/80 hover:text-white";
  const navText = theme === "light" ? "text-neutral-600" : "text-neutral-300";
  const navHover =
    theme === "light"
      ? "hover:border-[#1f5c9c]/40 hover:bg-[#e6f1ff] hover:text-[#0a2540]"
      : "hover:border-[#23a5fe]/60 hover:bg-[#0e1b2d] hover:text-white";
  const alignment = collapsed ? "lg:items-center lg:text-center" : "";

  return (
    <aside
      className={`relative flex h-full w-full flex-col overflow-y-auto border-r ${borderColor} ${backgroundClass} px-6 py-6 transition-all duration-300 sm:px-8 lg:overflow-visible lg:py-10 ${containerWidth}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={`absolute right-[-18px] top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border text-sm shadow-lg transition ${toggleButtonClass} lg:flex lg:z-10`}
      >
        {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
      </button>

      <div className={`flex flex-col gap-6 ${alignment}`}>
        <div
          className={`flex w-full items-center gap-4 ${collapsed ? "lg:justify-center lg:gap-0" : ""}`}
        >
          <LogoBadge companyName={companyName} logoPath={logoPath} collapsed={collapsed} />
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl border ${badgeBorder} ${
              collapsed ? "lg:hidden" : ""
            }`}
          >
            <Image
              src={theme === "dark" ? "/photos/light/logoClear.png" : "/photos/dark/logoClear.png"}
              alt="Alias logo"
              width={56}
              height={56}
              className="h-12 w-auto"
              priority={false}
            />
          </div>
        </div>
        <div
          className={`space-y-2 ${collapsed ? "lg:hidden" : ""}`}
        >
          <h2 className={`text-lg font-semibold ${headerText}`}>{companyName}</h2>
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${pillColors}`}
          >
            <span className="inline-block h-2 w-2 rounded-full bg-[#3eb6fd]" />
            {roleLabel}
          </span>
        </div>
      </div>

      <nav className="mt-10 flex-1">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2 text-sm transition ${navText} ${navHover} ${
                    collapsed ? "lg:justify-center" : "justify-start"
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="text-lg" />
                  <span className={`font-medium ${collapsed ? "lg:hidden" : ""}`}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

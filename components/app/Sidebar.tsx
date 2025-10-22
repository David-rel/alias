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
  const sizeClasses = collapsed ? "h-12 w-12" : "h-16 w-16";

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
  const alignment = collapsed ? "items-center text-center" : "";

  return (
    <aside
      className={`relative hidden w-full flex-col border-r ${borderColor} ${backgroundClass} py-10 transition-all duration-300 lg:flex ${containerWidth}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={`absolute right-[-18px] top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border text-sm shadow-lg transition ${toggleButtonClass}`}
      >
        {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
      </button>

      <div className={`flex flex-col gap-6 ${alignment}`}>
        <div className={`flex w-full items-center ${collapsed ? "justify-center" : "justify-start gap-3"}`}>
          <LogoBadge companyName={companyName} logoPath={logoPath} collapsed={collapsed} />
          {!collapsed ? (
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border ${badgeBorder}`}>
              <Image
                src={theme === "dark" ? "/photos/light/logoClear.png" : "/photos/dark/logoClear.png"}
                alt="Alias logo"
                width={56}
                height={56}
                className="h-12 w-auto"
                priority={false}
              />
            </div>
          ) : null}
        </div>
        {!collapsed ? (
          <div className="space-y-2">
            <h2 className={`text-lg font-semibold ${headerText}`}>{companyName}</h2>
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${pillColors}`}>
              <span className="inline-block h-2 w-2 rounded-full bg-[#3eb6fd]" />
              {roleLabel}
            </span>
          </div>
        ) : null}
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
                    collapsed ? "justify-center" : "justify-start"
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="text-lg" />
                  {!collapsed ? <span className="font-medium">{item.label}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

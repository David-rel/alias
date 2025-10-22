"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { FiMoon, FiSun } from "react-icons/fi";

type Props = {
  companyName: string;
  roleLabel: string;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  userName: string | null;
  userEmail: string;
  userInitials: string;
  profileImageUrl: string | null;
  onMobileMenuToggle?: () => void;
};

export function Topbar({
  companyName,
  roleLabel,
  theme,
  onThemeToggle,
  userName,
  userEmail,
  userInitials,
  profileImageUrl,
  onMobileMenuToggle,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleMenuToggle() {
    setMenuOpen((open) => !open);
  }

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut({ callbackUrl: "/auth/login" });
  }

  const borderColor =
    theme === "light" ? "border-neutral-200/70" : "border-white/10";
  const background =
    theme === "light"
      ? "bg-white/70 text-neutral-800"
      : "bg-neutral-900/60 text-neutral-100";
  const buttonBorder =
    theme === "light"
      ? "border-neutral-200/70 text-neutral-600"
      : "border-white/10 text-neutral-200";
  const buttonHover =
    theme === "light"
      ? "hover:border-[#23a5fe]/80 hover:text-[#0f1f3a]"
      : "hover:border-[#23a5fe]/70 hover:text-white";
  const buttonBackground = theme === "light" ? "bg-white/80" : "bg-white/10";
  const avatarBorder =
    theme === "light" ? "border-neutral-200/80" : "border-white/10";
  const avatarBg =
    theme === "light"
      ? "bg-gradient-to-br from-[#e8f1ff] to-[#c7d9ff] text-neutral-800"
      : "bg-gradient-to-br from-[#0f1f3a] to-[#08101e] text-white";
  const menuClasses =
    theme === "light"
      ? "border-neutral-200/70 bg-white text-neutral-700 shadow-xl"
      : "border-white/10 bg-neutral-900/95 text-neutral-200 shadow-2xl";
  const pillBorder =
    theme === "light"
      ? "border-neutral-200/70 bg-neutral-100/60 text-neutral-700"
      : "border-white/10 bg-white/5 text-white";
  const menuItemHover =
    theme === "light"
      ? "hover:bg-[#f0f4ff] hover:text-[#061943]"
      : "hover:bg-white/10 hover:text-white";
  const logoutStyles =
    theme === "light"
      ? "text-[#d94a4a] hover:bg-[#ffe7e7]"
      : "text-[#ff9b9b] hover:bg-[#2a0e15]";

  return (
    <header
      className={`flex items-center justify-between border-b px-4 py-3 backdrop-blur lg:px-6 ${borderColor} ${background}`}
    >
      <div className="lg:hidden">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
          Workspace
        </p>
        <p className="mt-1 text-base font-semibold text-current">
          {companyName}
        </p>
        <span
          className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${pillBorder}`}
        >
          <span className="inline-block h-2 w-2 rounded-full bg-[#3eb6fd]" />
          {roleLabel}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {onMobileMenuToggle ? (
          <button
            type="button"
            aria-label="Open navigation"
            onClick={onMobileMenuToggle}
            className={`flex h-10 w-10 items-center justify-center rounded-full border text-lg transition lg:hidden ${buttonBorder} ${buttonBackground} ${buttonHover}`}
          >
            ☰
          </button>
        ) : null}
        <button
          type="button"
          aria-label="Toggle theme"
          onClick={onThemeToggle}
          className={`flex h-10 w-10 items-center justify-center rounded-full border text-lg transition ${buttonBorder} ${buttonBackground} ${buttonHover}`}
        >
          {theme === "dark" ? (
            <FiMoon className="text-base" />
          ) : (
            <FiSun className="text-base" />
          )}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={handleMenuToggle}
            className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold shadow-[0_6px_20px_rgba(35,165,254,0.25)] transition hover:border-[#3eb6fd]/80 ${avatarBorder} ${avatarBg}`}
          >
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileImageUrl}
                alt="Profile"
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              userInitials
            )}
          </button>

          {menuOpen ? (
            <div
              className={`absolute right-0 mt-3 w-52 overflow-hidden rounded-2xl border p-2 text-sm ${menuClasses}`}
            >
              <div className="px-3 py-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
                <span className="block truncate text-sm font-semibold">
                  {userName ?? userEmail}
                </span>
              </div>
              <Link
                href="/app/settings"
                onClick={() => setMenuOpen(false)}
                className={`block rounded-xl px-3 py-2 text-sm transition ${menuItemHover}`}
              >
                Settings
              </Link>
              <Link
                href="/app/preferences"
                onClick={() => setMenuOpen(false)}
                className={`block rounded-xl px-3 py-2 text-sm transition ${menuItemHover}`}
              >
                Preferences
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className={`mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm transition ${logoutStyles}`}
              >
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

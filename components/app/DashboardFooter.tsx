'use client';

type Props = {
  theme: "light" | "dark";
};

export function DashboardFooter({ theme }: Props) {
  const currentYear = new Date().getFullYear();

  const borderColor =
    theme === "light" ? "border-neutral-200/80" : "border-white/10";
  const bgColor =
    theme === "light" ? "bg-white/80 text-neutral-700" : "bg-neutral-950/70 text-neutral-500";

  return (
    <footer
      className={`border-t px-4 py-4 text-xs transition lg:px-8 ${borderColor} ${bgColor}`}
    >
      © {currentYear} Alias. Crafted for operators, builders, and the teams they empower.
    </footer>
  );
}

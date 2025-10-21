import Link from "next/link";

export const metadata = {
  title: "Create your Alias account",
};

export default function SignupPage() {
  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-3 text-sm text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40";

  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-[#3eb6fd]">
          Alias onboarding
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Launch your Alias workspace
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          Spin up your AI-connected hub in minutes. No credit card required.
        </p>
      </div>

      <form className="space-y-5">
        <label className="block text-left">
          <span className="text-sm text-neutral-300">Full name</span>
          <input
            type="text"
            placeholder="Taylor Morgan"
            autoComplete="name"
            className={inputClass}
          />
        </label>
        <label className="block text-left">
          <span className="text-sm text-neutral-300">Business email</span>
          <input
            type="email"
            placeholder="you@business.com"
            autoComplete="email"
            className={inputClass}
          />
        </label>
        <label className="block text-left">
          <span className="text-sm text-neutral-300">Password</span>
          <input
            type="password"
            placeholder="Create a secure password"
            autoComplete="new-password"
            className={inputClass}
          />
        </label>
        <label className="block text-left">
          <span className="text-sm text-neutral-300">
            Company Name
          </span>
          <input
            type="text"
            min={1}
            placeholder="Business"
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-xl bg-gradient-to-r from-[#0064d6] via-[#23a5fe] to-[#3eb6fd] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(35,165,254,0.35)] transition hover:brightness-110"
        >
          Create account
        </button>
      </form>

      <p className="text-center text-sm text-neutral-400">
        Already using Alias?{" "}
        <Link href="/auth/login" className="text-[#3eb6fd] hover:text-white">
          Sign in instead
        </Link>
      </p>
    </div>
  );
}

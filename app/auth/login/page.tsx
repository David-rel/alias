import Link from "next/link";

export const metadata = {
  title: "Sign in to Alias",
};

export default function LoginPage() {
  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-3 text-sm text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40";

  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-[#3eb6fd]">
          Alias login
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          Enter your credentials to access the Alias control hub.
        </p>
      </div>

      <form className="space-y-5">
        <label className="block text-left">
          <span className="text-sm text-neutral-300">Email</span>
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
            placeholder="••••••••"
            autoComplete="current-password"
            className={inputClass}
          />
        </label>
        <div className="flex items-center justify-between text-sm text-neutral-300">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-white/10 bg-neutral-900 text-[#23a5fe] focus:ring-[#23a5fe]/40"
            />
            Remember me
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-[#3eb6fd] transition hover:text-white"
          >
            Forgot password?
          </Link>
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-gradient-to-r from-[#0064d6] via-[#23a5fe] to-[#3eb6fd] px-5 py-3 text-sm font-semibold text-neutral-950 shadow-[0_12px_30px_rgba(35,165,254,0.35)] transition hover:brightness-110"
        >
          Sign in
        </button>
      </form>

      <p className="text-center text-sm text-neutral-400">
        New to Alias?{" "}
        <Link href="/auth/signup" className="text-[#3eb6fd] hover:text-white">
          Create an account
        </Link>
      </p>
    </div>
  );
}

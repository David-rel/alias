import Link from "next/link";

export const metadata = {
  title: "Reset your Alias password",
};

export default function ForgotPasswordPage() {
  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-3 text-sm text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40";

  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-[#3eb6fd]">
          Password reset
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Reset password
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          Enter the email associated with your workspace. We’ll send reset
          instructions if an account exists.
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
        <button
          type="submit"
          className="w-full rounded-xl bg-gradient-to-r from-[#0064d6] via-[#23a5fe] to-[#3eb6fd] px-5 py-3 text-sm font-semibold text-neutral-950 shadow-[0_12px_30px_rgba(35,165,254,0.35)] transition hover:brightness-110"
        >
          Email reset link
        </button>
      </form>

      <p className="text-center text-sm text-neutral-400">
        Remembered your credentials?{" "}
        <Link href="/auth/login" className="text-[#3eb6fd] hover:text-white">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

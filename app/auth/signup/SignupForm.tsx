'use client';

import { useState, type FormEvent } from "react";
import Link from "next/link";

export function SignupForm() {
  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-3 text-sm text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40";
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    setSuccessEmail(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          companyName,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(
          typeof payload.error === "string"
            ? payload.error
            : "Unable to create your account.",
        );
        setLoading(false);
        return;
      }

      const payload = (await response.json().catch(() => null)) as
        | { email?: string }
        | null;

      setSuccessEmail(payload?.email ?? email);
      setName("");
      setCompanyName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      console.error(err);
      setError("Something went wrong while creating your account.");
      setLoading(false);
      return;
    }

    setLoading(false);
  }

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

      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block text-left">
          <span className="text-sm text-neutral-300">Full name</span>
          <input
            type="text"
            placeholder="Taylor Morgan"
            autoComplete="name"
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="block text-left">
          <span className="text-sm text-neutral-300">Business email</span>
          <input
            type="email"
            placeholder="you@business.com"
            autoComplete="email"
            className={inputClass}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="block text-left">
          <span className="text-sm text-neutral-300">Password</span>
          <input
            type="password"
            placeholder="Create a secure password"
            autoComplete="new-password"
            className={inputClass}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="block text-left">
          <span className="text-sm text-neutral-300">Company Name</span>
          <input
            type="text"
            placeholder="Business"
            className={inputClass}
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
          />
        </label>
        {error ? (
          <p className="text-sm text-[#ff9b9b]">{error}</p>
        ) : null}
        {successEmail ? (
          <p className="text-sm text-[#3eb6fd]">
            We sent a verification link to <span className="font-medium">{successEmail}</span>.
            Open it to confirm your account before signing in.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-[#0064d6] via-[#23a5fe] to-[#3eb6fd] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(35,165,254,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Creating account..." : "Create account"}
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

export default SignupForm;

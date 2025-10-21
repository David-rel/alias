'use client';

import { useState, type FormEvent } from "react";

export function ForgotPasswordForm() {
  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-3 text-sm text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!email) {
      setError("Please enter the email associated with your account.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(
          typeof payload.error === "string"
            ? payload.error
            : "We couldn’t process that request.",
        );
        setLoading(false);
        return;
      }

      setMessage(
        "If an account exists for that email, we just sent instructions to reset your password.",
      );
      setEmail("");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block text-left">
        <span className="text-sm text-neutral-300">Email</span>
        <input
          type="email"
          placeholder="you@business.com"
          autoComplete="email"
          className={inputClass}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      {error ? (
        <p className="text-sm text-[#ff9b9b]">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-[#3eb6fd]">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-[#0064d6] via-[#23a5fe] to-[#3eb6fd] px-5 py-3 text-sm font-semibold text-neutral-950 shadow-[0_12px_30px_rgba(35,165,254,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Sending instructions..." : "Email reset link"}
      </button>
    </form>
  );
}

export default ForgotPasswordForm;

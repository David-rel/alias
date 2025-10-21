'use client';

import { useState, type FormEvent } from "react";

type ResetPasswordFormProps = {
  code: string;
};

export function ResetPasswordForm({ code }: ResetPasswordFormProps) {
  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-3 text-sm text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(
          typeof payload.error === "string"
            ? payload.error
            : "We couldn’t reset your password.",
        );
        setLoading(false);
        return;
      }

      setMessage("Your password has been reset. You can now sign in with the new password.");
      setPassword("");
      setConfirmPassword("");
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
        <span className="text-sm text-neutral-300">New password</span>
        <input
          type="password"
          placeholder="Create a new password"
          autoComplete="new-password"
          className={inputClass}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <label className="block text-left">
        <span className="text-sm text-neutral-300">Confirm password</span>
        <input
          type="password"
          placeholder="Confirm your password"
          autoComplete="new-password"
          className={inputClass}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
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
        {loading ? "Updating password..." : "Reset password"}
      </button>
    </form>
  );
}

export default ResetPasswordForm;

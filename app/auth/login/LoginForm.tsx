"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-3 text-sm text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = searchParams.get("callbackUrl") ?? "/app";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        const errorMessage = result.error.toString().toUpperCase();
        if (errorMessage.includes("EMAIL_NOT_VERIFIED")) {
          setError(
            "Please verify your email address before signing in. Check your inbox for the verification link."
          );
        } else {
          setError("Unable to sign in with those credentials.");
        }
        setLoading(false);
        return;
      }

      const profileResponse = await fetch("/api/auth/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      let nextUrl = result?.url ?? callbackUrl;

      if (profileResponse.ok) {
        const profile = (await profileResponse.json()) as {
          onboardingCompleted?: boolean;
        };

        if (!profile.onboardingCompleted) {
          nextUrl = "/app/onboarding";
        }
      }

      // Set user as logged in
      try {
        await fetch("/api/auth/login-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loggedIn: true }),
        });
      } catch (error) {
        console.error("Failed to update login status:", error);
      }

      setLoading(false);
      router.push(nextUrl);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

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
        <label className="block text-left">
          <span className="text-sm text-neutral-300">Password</span>
          <input
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            className={inputClass}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
        {error ? <p className="text-sm text-[#ff9b9b]">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-[#0064d6] via-[#23a5fe] to-[#3eb6fd] px-5 py-3 text-sm font-semibold text-neutral-950 shadow-[0_12px_30px_rgba(35,165,254,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Signing in..." : "Sign in"}
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

export default LoginForm;

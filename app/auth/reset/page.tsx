import Link from "next/link";
import { query } from "@/lib/db";
import ResetPasswordForm from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

type SearchParams =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

type Props = {
  searchParams: SearchParams;
};

async function resolveParams(params: SearchParams) {
  return params instanceof Promise ? params : Promise.resolve(params);
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const resolved = await resolveParams(searchParams);
  const codeParam = resolved.code;
  const code = Array.isArray(codeParam) ? codeParam[0] : codeParam;

  if (!code) {
    return (
      <StatusCard
        title="Reset link missing"
        body="We couldn’t find a reset code in the link you followed. Double-check the email or request a new link from the forgot password page."
        variant="error"
      />
    );
  }

  const result = await query<{ email: string }>(
    `SELECT email
       FROM users
      WHERE password_reset_code = $1
        AND (password_reset_expires IS NULL OR password_reset_expires > NOW())
      LIMIT 1`,
    [code],
  );

  const user = result.rows[0];

  if (!user) {
    return (
      <StatusCard
        title="Reset link expired"
        body="This reset code has already been used or is no longer valid. Request a new link from the forgot password page to continue."
        variant="error"
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-[#3eb6fd]">
          Password reset
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          Pick a strong password to secure your Alias account.
        </p>
      </div>

      <ResetPasswordForm code={code} />

      <p className="text-center text-sm text-neutral-400">
        Return to{" "}
        <Link href="/auth/login" className="text-[#3eb6fd] hover:text-white">
          sign in
        </Link>
        .
      </p>
    </div>
  );
}

type StatusCardProps = {
  title: string;
  body: string;
  variant: "success" | "error";
};

function StatusCard({ title, body, variant }: StatusCardProps) {
  const accent =
    variant === "success" ? "text-[#3eb6fd]" : "text-[#ff9b9b]";

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-3xl border border-white/10 bg-neutral-900/70 p-10 text-neutral-100 shadow-2xl">
      <h1 className={`text-2xl font-semibold tracking-tight ${accent}`}>
        {title}
      </h1>
      <p className="text-sm text-neutral-300">{body}</p>
      <Link
        href="/auth/forgot-password"
        className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2 text-sm font-semibold text-neutral-900 shadow-lg transition hover:brightness-105"
      >
        Request a new link
      </Link>
    </div>
  );
}

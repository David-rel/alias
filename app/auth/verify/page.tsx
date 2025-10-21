import Link from "next/link";
import { query } from "@/lib/db";

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

export default async function VerifyEmailPage({ searchParams }: Props) {
  const resolved = await resolveParams(searchParams);
  const code = resolved.code;
  const token = Array.isArray(code) ? code[0] : code;

  if (!token) {
    return (
      <StatusCard
        title="Verification code missing"
        body="We couldn’t find a verification code in the link you followed. Double-check the email or request a new one from the login page."
        variant="error"
      />
    );
  }

  const result = await query<{
    email: string;
    onboarding_completed: boolean;
  }>(
    `UPDATE users
       SET email_verified = TRUE,
           email_code = NULL,
           updated_at = NOW()
     WHERE email_code = $1
     RETURNING email, onboarding_completed`,
    [token],
  );

  const user = result.rows[0];

  if (!user) {
    return (
      <StatusCard
        title="Verification link expired"
        body="This verification code has already been used or is no longer valid. Request a fresh link from the login page to continue."
        variant="error"
      />
    );
  }

  const nextRoute = user.onboarding_completed ? "/app" : "/app/onboarding";

  return (
    <StatusCard
      title="Email confirmed"
      body={`Thanks for verifying your email. You can continue into Alias and pick up where you left off.`}
      actionLabel={`Open ${user.onboarding_completed ? "dashboard" : "onboarding"}`}
      actionHref={nextRoute}
      variant="success"
    />
  );
}

type StatusCardProps = {
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
  variant: "success" | "error";
};

function StatusCard({
  title,
  body,
  actionLabel,
  actionHref,
  variant,
}: StatusCardProps) {
  const accentColor =
    variant === "success" ? "text-[#3eb6fd]" : "text-[#ff9b9b]";
  const buttonClasses =
    "inline-flex items-center justify-center rounded-full bg-white px-6 py-2 text-sm font-semibold text-neutral-900 shadow-lg transition hover:brightness-105";

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-3xl border border-white/10 bg-neutral-900/70 p-10 text-neutral-100 shadow-2xl">
      <h1 className={`text-2xl font-semibold tracking-tight ${accentColor}`}>
        {title}
      </h1>
      <p className="text-sm text-neutral-300">{body}</p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className={buttonClasses}>
          {actionLabel}
        </Link>
      ) : (
        <Link href="/auth/login" className={buttonClasses}>
          Return to login
        </Link>
      )}
    </div>
  );
}

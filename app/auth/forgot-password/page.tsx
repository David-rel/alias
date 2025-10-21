import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata = {
  title: "Reset your Alias password",
};

export default async function ForgotPasswordPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    if (session.user.onboardingCompleted === false) {
      redirect("/app/onboarding");
    }
    redirect("/app");
  }

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

      <ForgotPasswordForm />

      <p className="text-center text-sm text-neutral-400">
        Remembered your credentials?{" "}
        <Link href="/auth/login" className="text-[#3eb6fd] hover:text-white">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

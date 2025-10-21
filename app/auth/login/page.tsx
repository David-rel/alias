import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in to Alias",
};

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    if (session.user.onboardingCompleted === false) {
      redirect("/app/onboarding");
    }
    redirect("/app");
  }

  return <LoginForm />;
}

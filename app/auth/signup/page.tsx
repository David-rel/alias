import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import SignupForm from "./SignupForm";

export const metadata: Metadata = {
  title: "Create your Alias account",
};

export default async function SignupPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    if (session.user.onboardingCompleted === false) {
      redirect("/app/onboarding");
    }
    redirect("/app");
  }

  return <SignupForm />;
}

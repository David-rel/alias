import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OnboardingWizard } from "./OnboardingWizard";

export const metadata = {
  title: "Finish setting up your Alias account",
};

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (session.user.onboardingCompleted) {
    redirect("/app");
  }

  return <OnboardingWizard />;
}

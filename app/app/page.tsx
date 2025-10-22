import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { DashboardShell } from "@/components/app/DashboardShell";

export const metadata = {
  title: "Alias Dashboard",
  description:
    "Your connected workspace for operations, finance, and marketing automation.",
};

export default async function AppHome() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (session.user.onboardingCompleted === false) {
    redirect("/app/onboarding");
  }

  const userId = session.user.id;

  type BusinessRecord = {
    id: string;
    business_category: string | null;
    industry: string | null;
    description: string | null;
    logo_path: string | null;
    company_size: string | null;
    location: string | null;
    feature_preferences: string[];
    company_name: string | null;
  };

  type BusinessContext = BusinessRecord & {
    role: "owner" | "admin" | "guest";
  };

  const ownerBusiness = await query<BusinessRecord>(
    `SELECT b.id,
            b.business_category,
            b.industry,
            b.description,
            b.logo_path,
            b.company_size,
            b.location,
            b.feature_preferences,
            u.company_name
       FROM businesses b
       LEFT JOIN users u ON u.id = b.owner_user_id
      WHERE b.owner_user_id = $1
      LIMIT 1`,
    [userId],
  );

  let business: BusinessContext | null = ownerBusiness.rows[0]
    ? {
        ...ownerBusiness.rows[0],
        role: "owner",
      }
    : null;

  if (!business) {
    const memberBusiness = await query<BusinessRecord & {
      role: "owner" | "admin" | "guest" | null;
    }>(
      `SELECT b.id,
              b.business_category,
              b.industry,
              b.description,
              b.logo_path,
              b.company_size,
              b.location,
              b.feature_preferences,
              u.company_name,
              COALESCE(m.role, 'guest') AS role
         FROM business_team_members m
         JOIN businesses b ON b.id = m.business_id
         LEFT JOIN users u ON u.id = b.owner_user_id
        WHERE m.user_id = $1
        ORDER BY m.invited_at ASC
        LIMIT 1`,
      [userId],
    );

    const memberRow = memberBusiness.rows[0];
    if (memberRow) {
      business = {
        ...memberRow,
        role: memberRow.role ?? "guest",
      };
    }
  }

  const companyName =
    business?.company_name ?? session.user.name ?? session.user.email ?? "Alias workspace";

  const userName = session.user.name ?? null;
  const userEmail = session.user.email ?? "";

  const userInitials = userName
    ? userName
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : userEmail.slice(0, 2).toUpperCase();

  return (
    <DashboardShell
      companyName={companyName}
      role={(business?.role ?? "owner")}
      logoPath={business?.logo_path ?? null}
      userName={userName}
      userEmail={userEmail}
      userInitials={userInitials || "A"}
    />
  );
}

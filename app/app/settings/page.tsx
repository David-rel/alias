import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { DashboardShell } from "@/components/app/DashboardShell";
import { SettingsView } from "@/components/app/SettingsView";

export const metadata = {
  title: "Settings - Alias",
  description: "Manage your Alias profile and workspace settings.",
};

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (session.user.onboardingCompleted === false) {
    redirect("/app/onboarding");
  }

  const userId = session.user.id;

  // Fetch user profile data
  const userResult = await query<{
    id: string;
    email: string;
    name: string | null;
    phone_number: string | null;
    timezone: string | null;
    location: string | null;
    email_verified: boolean;
    profile_image_url: string | null;
  }>(
    `SELECT id, email, name, phone_number, timezone, location, email_verified, profile_image_url
     FROM users
     WHERE id = $1`,
    [userId]
  );

  const user = userResult.rows[0];
  if (!user) {
    redirect("/auth/login");
  }

  // Fetch business data
  type BusinessRecord = {
    id: string;
    name: string | null;
    business_category: string | null;
    industry: string | null;
    description: string | null;
    logo_path: string | null;
    company_size: string | null;
    location: string | null;
  };

  type BusinessContext = BusinessRecord & {
    role: "owner" | "admin" | "guest";
  };

  const ownerBusiness = await query<BusinessRecord>(
    `SELECT b.id,
            b.name,
            b.business_category,
            b.industry,
            b.description,
            b.logo_path,
            b.company_size,
            b.location
       FROM businesses b
      WHERE b.owner_user_id = $1
      LIMIT 1`,
    [userId]
  );

  let business: BusinessContext | null = ownerBusiness.rows[0]
    ? {
        ...ownerBusiness.rows[0],
        role: "owner",
      }
    : null;

  if (!business) {
    const memberBusiness = await query<
      BusinessRecord & {
        role: "owner" | "admin" | "guest" | null;
      }
    >(
      `SELECT b.id,
              b.name,
              b.business_category,
              b.industry,
              b.description,
              b.logo_path,
              b.company_size,
              b.location,
              COALESCE(m.role, 'guest') AS role
         FROM business_team_members m
         JOIN businesses b ON b.id = m.business_id
        WHERE m.user_id = $1
        ORDER BY m.invited_at ASC
        LIMIT 1`,
      [userId]
    );

    const memberRow = memberBusiness.rows[0];
    if (memberRow) {
      business = {
        ...memberRow,
        role: memberRow.role ?? "guest",
      };
    }
  }

  // Fetch payment plan data
  const planResult = await query<{
    plan_id: string;
    plan_name: string;
    status: string;
    payment_provider: string | null;
    current_period_end: string | null;
  }>(
    `SELECT plan_id, plan_name, status, payment_provider, current_period_end
     FROM business_payment_plans
     WHERE business_id = $1`,
    [business?.id ?? ""]
  );

  const plan = planResult.rows[0] || null;

  // Fetch integrations data
  const integrationsResult = await query<{
    id: string;
    integration_key: string;
    status: string;
    updated_at: string;
  }>(
    `SELECT id, integration_key, status, updated_at
     FROM business_integrations
     WHERE business_id = $1
     ORDER BY updated_at DESC`,
    [business?.id ?? ""]
  );

  const integrations = integrationsResult.rows.map((row) => ({
    id: row.id,
    key: row.integration_key,
    label:
      row.integration_key.charAt(0).toUpperCase() +
      row.integration_key.slice(1).replace(/_/g, " "),
    status: row.status,
    updatedAt: row.updated_at,
  }));

  // Get timezone options
  const hasSupportedTimeZones =
    typeof Intl.supportedValuesOf === "function" &&
    Array.isArray(Intl.supportedValuesOf("timeZone"));

  const timezoneOptions = hasSupportedTimeZones
    ? Intl.supportedValuesOf("timeZone")
    : [
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "Europe/London",
        "Europe/Paris",
        "Europe/Berlin",
        "Asia/Tokyo",
        "Asia/Shanghai",
        "Australia/Sydney",
      ];

  // Determine if user can delete account (only if they're not the only owner of a business)
  let canDeleteAccount = true;
  if (business?.role === "owner") {
    const memberCountResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM business_team_members
       WHERE business_id = $1 AND invite_status = 'accepted'`,
      [business.id]
    );

    const memberCount = parseInt(memberCountResult.rows[0]?.count ?? "0");
    canDeleteAccount = memberCount <= 1; // Can delete if they're the only member
  }

  const companyName =
    business?.name ??
    session.user.name ??
    session.user.email ??
    "Alias workspace";

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
      role={business?.role ?? "owner"}
      logoPath={business?.logo_path ?? null}
      userName={userName}
      userEmail={userEmail}
      userInitials={userInitials || "A"}
      profileImageUrl={user.profile_image_url}
    >
      <SettingsView
        user={{
          email: user.email,
          name: user.name,
          phoneNumber: user.phone_number,
          timezone: user.timezone,
          location: user.location,
          emailVerified: user.email_verified,
          profileImageUrl: user.profile_image_url,
        }}
        business={
          business
            ? {
                id: business.id,
                name: business.name,
                businessCategory: business.business_category,
                industry: business.industry,
                description: business.description,
                logoPath: business.logo_path,
                companySize: business.company_size,
                location: business.location,
              }
            : null
        }
        viewerRole={business?.role ?? "owner"}
        plan={
          plan
            ? {
                planId: plan.plan_id,
                planName: plan.plan_name,
                status: plan.status,
                paymentProvider: plan.payment_provider,
                currentPeriodEnd: plan.current_period_end,
              }
            : null
        }
        integrations={integrations}
        timezoneOptions={timezoneOptions}
        canDeleteAccount={canDeleteAccount}
      />
    </DashboardShell>
  );
}

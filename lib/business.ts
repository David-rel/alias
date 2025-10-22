import {
  query,
  type DbBusinessIntegrationRow,
  type DbBusinessPaymentPlanRow,
} from "./db";

export const DEFAULT_BUSINESS_INTEGRATIONS: ReadonlyArray<{
  key: string;
  label: string;
}> = [
  { key: "domain_hosting", label: "Domain & hosting" },
  { key: "website_builder", label: "Website builder" },
  { key: "crm", label: "CRM" },
  { key: "helpdesk", label: "Helpdesk" },
  { key: "analytics", label: "Analytics" },
  { key: "email_marketing", label: "Email marketing" },
];

export async function getBusinessPlan(
  businessId: string,
): Promise<DbBusinessPaymentPlanRow | null> {
  const planResult = await query<DbBusinessPaymentPlanRow>(
    "SELECT * FROM business_payment_plans WHERE business_id = $1 LIMIT 1",
    [businessId],
  );

  const existing = planResult.rows[0] ?? null;

  if (existing) {
    return existing;
  }

  await query(
    `INSERT INTO business_payment_plans (business_id, plan_id, plan_name, status)
     VALUES ($1, 'free', 'Free', 'active')
     ON CONFLICT (business_id) DO NOTHING`,
    [businessId],
  );

  const fallback = await query<DbBusinessPaymentPlanRow>(
    "SELECT * FROM business_payment_plans WHERE business_id = $1 LIMIT 1",
    [businessId],
  );

  return fallback.rows[0] ?? null;
}

export async function getBusinessIntegrations(
  businessId: string,
): Promise<DbBusinessIntegrationRow[]> {
  const integrationsResult = await query<DbBusinessIntegrationRow>(
    `SELECT *
       FROM business_integrations
      WHERE business_id = $1
      ORDER BY integration_key ASC`,
    [businessId],
  );

  const current = integrationsResult.rows;
  const existingKeys = new Set(current.map((row) => row.integration_key));

  const missing = DEFAULT_BUSINESS_INTEGRATIONS.filter(
    (item) => !existingKeys.has(item.key),
  );

  for (const integration of missing) {
    await query(
      `INSERT INTO business_integrations (business_id, integration_key, status)
       VALUES ($1, $2, 'inactive')
       ON CONFLICT (business_id, integration_key) DO NOTHING`,
      [businessId, integration.key],
    );
  }

  if (missing.length === 0) {
    return current;
  }

  const refreshed = await query<DbBusinessIntegrationRow>(
    `SELECT *
       FROM business_integrations
      WHERE business_id = $1
      ORDER BY integration_key ASC`,
    [businessId],
  );

  return refreshed.rows;
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";
import {
  deleteAppointmentCalendar,
  getAvailabilityRulesForCalendar,
  getCalendarById,
  updateAppointmentCalendar,
  validateAvailabilityRules,
  replaceAvailabilityRules,
} from "@/lib/appointments";
import { AppointmentAvailabilityRuleInput } from "@/types/appointments";

type RouteContext = {
  params: Promise<{
    calendarId: string;
  }>;
};

export async function GET(_: Request, routeContext: RouteContext) {
  const { calendarId } = await routeContext.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businessContext = await getPrimaryBusinessForUser(session.user.id);
  if (!businessContext) {
    return NextResponse.json({ error: "No business context" }, { status: 403 });
  }

  const calendar = await getCalendarById(calendarId, businessContext.business.id);

  if (!calendar) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  const rules = await getAvailabilityRulesForCalendar(calendar.id);

  return NextResponse.json({ calendar, rules });
}

export async function PUT(request: Request, routeContext: RouteContext) {
  const { calendarId } = await routeContext.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businessContext = await getPrimaryBusinessForUser(session.user.id);
  if (!businessContext) {
    return NextResponse.json({ error: "No business context" }, { status: 403 });
  }

  const calendar = await getCalendarById(calendarId, businessContext.business.id);

  if (!calendar) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  if (businessContext.role === "guest") {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
  }

  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  const fields: Array<keyof typeof payload> = [
    "name",
    "appointmentType",
    "description",
    "locationType",
    "locationDetails",
    "virtualMeetingPreference",
    "durationMinutes",
    "bufferBeforeMinutes",
    "bufferAfterMinutes",
    "timezone",
    "bookingWindowDays",
    "minScheduleNoticeMinutes",
    "status",
    "requiresConfirmation",
    "googleCalendarSync",
  ];

  for (const field of fields) {
    if (field in payload) {
      updates[field] = payload[field];
    }
  }

  try {
    const updated = await updateAppointmentCalendar(
      calendar.id,
      businessContext.business.id,
      updates,
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Calendar not found after update" },
        { status: 404 },
      );
    }

    return NextResponse.json({ calendar: updated });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, routeContext: RouteContext) {
  const { calendarId } = await routeContext.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businessContext = await getPrimaryBusinessForUser(session.user.id);
  if (!businessContext) {
    return NextResponse.json({ error: "No business context" }, { status: 403 });
  }

  if (businessContext.role === "guest") {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
  }

  await deleteAppointmentCalendar(calendarId, businessContext.business.id);

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, routeContext: RouteContext) {
  const { calendarId } = await routeContext.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businessContext = await getPrimaryBusinessForUser(session.user.id);
  if (!businessContext) {
    return NextResponse.json({ error: "No business context" }, { status: 403 });
  }

  if (businessContext.role === "guest") {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
  }

  const calendar = await getCalendarById(calendarId, businessContext.business.id);

  if (!calendar) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  let payload: { rules?: unknown };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(payload.rules)) {
    return NextResponse.json(
      { error: "rules array is required" },
      { status: 400 },
    );
  }

  const rules = payload.rules.map((rule): AppointmentAvailabilityRuleInput => {
    const id = typeof rule?.id === "string" ? rule.id : undefined;
    const ruleType: "weekly" | "date" =
      rule?.ruleType === "date" ? "date" : "weekly";

    const parsedDay =
      ruleType === "weekly"
        ? (() => {
            const raw = Number.parseInt(String(rule?.dayOfWeek ?? ""), 10);
            return Number.isNaN(raw) ? null : raw;
          })()
        : null;

    const parsedStart = Number.parseInt(
      String(rule?.startMinutes ?? 0),
      10,
    );
    const parsedEnd = Number.parseInt(String(rule?.endMinutes ?? 0), 10);

    return {
      id,
      ruleType,
      dayOfWeek: parsedDay,
      specificDate:
        ruleType === "date" &&
        typeof rule?.specificDate === "string" &&
        rule.specificDate.length > 0
          ? rule.specificDate
          : null,
      startMinutes: Number.isNaN(parsedStart) ? 0 : parsedStart,
      endMinutes: Number.isNaN(parsedEnd) ? 0 : parsedEnd,
      isUnavailable: Boolean(rule?.isUnavailable ?? false),
    };
  });

  try {
    validateAvailabilityRules(rules);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }

  await replaceAvailabilityRules(calendar.id, rules);

  const refreshed = await getAvailabilityRulesForCalendar(calendar.id);

  return NextResponse.json({ rules: refreshed });
}

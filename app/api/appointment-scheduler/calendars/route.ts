import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";
import {
  createAppointmentCalendar,
  getCalendarSummaries,
} from "@/lib/appointments";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getPrimaryBusinessForUser(session.user.id);

  if (!context) {
    return NextResponse.json(
      { error: "No business context found" },
      { status: 403 },
    );
  }

  const calendars = await getCalendarSummaries(context.business.id, {
    days: 14,
  });

  return NextResponse.json({
    calendars,
    role: context.role,
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getPrimaryBusinessForUser(session.user.id);

  if (!context) {
    return NextResponse.json(
      { error: "No business context found" },
      { status: 403 },
    );
  }

  if (context.role === "guest") {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
  }

  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "Calendar name is required" },
      { status: 400 },
    );
  }

  const appointmentType =
    typeof payload.appointmentType === "string"
      ? payload.appointmentType.trim()
      : name;

  const description =
    typeof payload.description === "string"
      ? payload.description.trim()
      : null;

  const locationType =
    typeof payload.locationType === "string"
      ? payload.locationType
      : "virtual";

  const locationDetails =
    typeof payload.locationDetails === "string"
      ? payload.locationDetails.trim()
      : null;

  const virtualMeetingPreference =
    typeof payload.virtualMeetingPreference === "string"
      ? payload.virtualMeetingPreference.trim()
      : null;

  const durationMinutes = Number.parseInt(
    String(payload.durationMinutes ?? "30"),
    10,
  );

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return NextResponse.json(
      { error: "durationMinutes must be a positive number" },
      { status: 400 },
    );
  }

  const bufferBeforeMinutes = Number.parseInt(
    String(payload.bufferBeforeMinutes ?? "0"),
    10,
  );
  const bufferAfterMinutes = Number.parseInt(
    String(payload.bufferAfterMinutes ?? "0"),
    10,
  );

  const timezone =
    typeof payload.timezone === "string"
      ? payload.timezone.trim() || "UTC"
      : "UTC";

  const bookingWindowDays = Number.parseInt(
    String(payload.bookingWindowDays ?? "30"),
    10,
  );

  const minScheduleNoticeMinutes = Number.parseInt(
    String(payload.minScheduleNoticeMinutes ?? "120"),
    10,
  );

  const requiresConfirmation = Boolean(payload.requiresConfirmation ?? false);
  const googleCalendarSync = Boolean(payload.googleCalendarSync ?? false);

  try {
    const calendar = await createAppointmentCalendar({
      businessId: context.business.id,
      ownerUserId: session.user.id,
      name,
      appointmentType,
      description,
      locationType: locationType as
        | "in_person"
        | "virtual"
        | "phone"
        | "custom",
      locationDetails,
      virtualMeetingPreference,
      durationMinutes,
      bufferBeforeMinutes,
      bufferAfterMinutes,
      timezone,
      bookingWindowDays,
      minScheduleNoticeMinutes,
      requiresConfirmation,
      googleCalendarSync,
    });

    return NextResponse.json({ calendar });
  } catch (error) {
    console.error("Failed to create appointment calendar", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}

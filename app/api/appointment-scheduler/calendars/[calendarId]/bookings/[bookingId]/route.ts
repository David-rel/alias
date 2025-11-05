import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";
import {
  getCalendarById,
  getAvailabilityWindowForCalendar,
  mapBookingRow,
} from "@/lib/appointments";
import { query, type DbAppointmentBookingRow } from "@/lib/db";
import {
  sendAppointmentConfirmationEmail,
  sendAppointmentDeclinedEmail,
  sendAppointmentNotificationEmail,
} from "@/lib/email";
import type { AppointmentBookingStatus } from "@/types/appointments";

type RouteContext = {
  params: Promise<{
    calendarId: string;
    bookingId: string;
  }>;
};

function summarizeLocation(
  calendar: Awaited<ReturnType<typeof getCalendarById>>,
): string {
  if (!calendar) {
    return "Details to follow";
  }

  switch (calendar.locationType) {
    case "in_person":
      return calendar.locationDetails ?? "In-person meeting";
    case "virtual": {
      const base = calendar.virtualMeetingPreference
        ? `${calendar.virtualMeetingPreference}`
        : "Virtual meeting";
      return calendar.locationDetails
        ? `${base} · ${calendar.locationDetails}`
        : base;
    }
    case "phone":
      return calendar.locationDetails ?? "Phone call";
    default:
      return calendar.locationDetails ?? "Custom instructions to follow";
  }
}

const ALLOWED_TRANSITIONS: Record<
  AppointmentBookingStatus,
  ReadonlyArray<AppointmentBookingStatus>
> = {
  pending: ["scheduled", "cancelled"],
  scheduled: ["cancelled"],
  cancelled: [],
  completed: [],
};

export async function PATCH(request: Request, context: RouteContext) {
  const { calendarId, bookingId } = await context.params;

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

  let payload: {
    status?: unknown;
    reason?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const nextStatusInput =
    typeof payload.status === "string" ? payload.status.trim() : null;

  if (nextStatusInput !== "scheduled" && nextStatusInput !== "cancelled") {
    return NextResponse.json(
      { error: "Unsupported status update" },
      { status: 400 },
    );
  }

  const nextStatus = nextStatusInput as "scheduled" | "cancelled";
  const declineReasonRaw =
    typeof payload.reason === "string" ? payload.reason.trim() : null;
  const declineReason =
    declineReasonRaw && declineReasonRaw.length > 0 ? declineReasonRaw : null;

  const existingResult = await query<DbAppointmentBookingRow>(
    `SELECT *
       FROM appointment_bookings
      WHERE id = $1 AND calendar_id = $2
      LIMIT 1`,
    [bookingId, calendar.id],
  );

  const existingRow = existingResult.rows[0];

  if (!existingRow) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const currentBooking = mapBookingRow(existingRow);
  const allowedTargets = ALLOWED_TRANSITIONS[currentBooking.status] ?? [];

  if (!allowedTargets.includes(nextStatus)) {
    return NextResponse.json(
      { error: "Status change is not allowed for this booking" },
      { status: 400 },
    );
  }

  const updateResult = await query<DbAppointmentBookingRow>(
    `UPDATE appointment_bookings
        SET status = $1,
            updated_at = NOW()
      WHERE id = $2
      RETURNING *`,
    [nextStatus, bookingId],
  );

  const updatedRow = updateResult.rows[0];

  if (!updatedRow) {
    return NextResponse.json(
      { error: "Failed to update booking status" },
      { status: 500 },
    );
  }

  const updatedBooking = mapBookingRow(updatedRow);

  const [ownerResult, businessResult] = await Promise.all([
    query<{ email: string | null; name: string | null }>(
      `SELECT email, name
         FROM users
        WHERE id = $1
        LIMIT 1`,
      [calendar.ownerUserId],
    ),
    query<{ name: string | null }>(
      `SELECT name
         FROM businesses
        WHERE id = $1
        LIMIT 1`,
      [calendar.businessId],
    ),
  ]);

  const owner = ownerResult.rows[0] ?? null;
  const businessName = businessResult.rows[0]?.name ?? null;
  const locationSummary = summarizeLocation(calendar);
  const meetingUrl =
    updatedBooking.meetingUrl ??
    calendar.virtualMeetingPreference ??
    null;

  if (nextStatus === "scheduled" && currentBooking.status === "pending") {
    await Promise.allSettled([
      sendAppointmentConfirmationEmail({
        recipient: updatedBooking.guestEmail,
        guestName: updatedBooking.guestName,
        calendarName: calendar.name,
        businessName,
        startTimeIso: updatedBooking.startTime,
        endTimeIso: updatedBooking.endTime,
        timezone: calendar.timezone,
        locationSummary,
        meetingUrl,
        notes: updatedBooking.guestNotes ?? undefined,
        status: "scheduled",
      }),
      owner?.email
        ? sendAppointmentNotificationEmail({
            recipient: owner.email,
            guestEmail: updatedBooking.guestEmail,
            guestName: updatedBooking.guestName,
            calendarName: calendar.name,
            businessName,
            calendarId: calendar.id,
            startTimeIso: updatedBooking.startTime,
            endTimeIso: updatedBooking.endTime,
            timezone: calendar.timezone,
            locationSummary,
            meetingUrl,
            notes: updatedBooking.guestNotes ?? undefined,
            status: "scheduled",
          })
        : Promise.resolve(),
    ]);
  }

  if (nextStatus === "cancelled") {
    await Promise.allSettled([
      sendAppointmentDeclinedEmail({
        recipient: updatedBooking.guestEmail,
        guestName: updatedBooking.guestName,
        calendarName: calendar.name,
        businessName,
        startTimeIso: updatedBooking.startTime,
        endTimeIso: updatedBooking.endTime,
        timezone: calendar.timezone,
        reason: declineReason ?? undefined,
      }),
      owner?.email
        ? sendAppointmentNotificationEmail({
            recipient: owner.email,
            guestEmail: updatedBooking.guestEmail,
            guestName: updatedBooking.guestName,
            calendarName: calendar.name,
            businessName,
            calendarId: calendar.id,
            startTimeIso: updatedBooking.startTime,
            endTimeIso: updatedBooking.endTime,
            timezone: calendar.timezone,
            locationSummary,
            meetingUrl,
            notes: updatedBooking.guestNotes ?? undefined,
            status: "cancelled",
            reason: declineReason ?? undefined,
          })
        : Promise.resolve(),
    ]);
  }

  const availability = await getAvailabilityWindowForCalendar({ calendar });

  return NextResponse.json({
    booking: updatedBooking,
    availability,
  });
}

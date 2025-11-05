import { NextResponse } from "next/server";
import {
  createBooking,
  ensureSlotIsAvailable,
  getAvailabilityWindowForCalendar,
  getBookingsForCalendars,
  getCalendarByShareId,
} from "@/lib/appointments";
import { query } from "@/lib/db";
import {
  sendAppointmentConfirmationEmail,
  sendAppointmentNotificationEmail,
} from "@/lib/email";

type RouteContext = {
  params: Promise<{
    shareId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { shareId } = await context.params;
  const calendar = await getCalendarByShareId(shareId);

  if (!calendar) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const guestName =
    typeof payload.guestName === "string" ? payload.guestName.trim() : "";
  const guestEmail =
    typeof payload.guestEmail === "string" ? payload.guestEmail.trim() : "";
  const guestTimezone =
    typeof payload.guestTimezone === "string"
      ? payload.guestTimezone.trim()
      : calendar.timezone;
  const guestNotes =
    typeof payload.guestNotes === "string" ? payload.guestNotes.trim() : null;

  if (!guestName || !guestEmail) {
    return NextResponse.json(
      { error: "Guest name and email are required" },
      { status: 400 },
    );
  }

  const slotStart = typeof payload.slotStart === "string" ? payload.slotStart : null;
  const slotEnd = typeof payload.slotEnd === "string" ? payload.slotEnd : null;

  if (!slotStart || !slotEnd) {
    return NextResponse.json(
      { error: "slotStart and slotEnd are required" },
      { status: 400 },
    );
  }

  const bookings = await getBookingsForCalendars([calendar.id], {
    includeCancelled: false,
    upcomingOnly: false,
  });

  try {
    ensureSlotIsAvailable({
      calendar,
      slotStartIso: slotStart,
      slotEndIso: slotEnd,
      bookings,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 409 },
    );
  }

  const startTimeUtc = new Date(slotStart);
  const endTimeUtc = new Date(slotEnd);
  const bookingStatus = calendar.requiresConfirmation ? "pending" : "scheduled";

  try {
    const booking = await createBooking({
      calendarId: calendar.id,
      guestName,
      guestEmail,
      guestTimezone,
      guestNotes,
      startTimeUtc,
      endTimeUtc,
      status: bookingStatus,
    });

    const availability = await getAvailabilityWindowForCalendar({
      calendar,
    });

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

    const locationSummary = (() => {
      switch (calendar.locationType) {
        case "in_person":
          return calendar.locationDetails ?? "In-person meeting";
        case "virtual": {
          const provider = calendar.virtualMeetingPreference
            ? `${calendar.virtualMeetingPreference}`
            : "Virtual meeting";
          if (calendar.locationDetails) {
            return `${provider} · ${calendar.locationDetails}`;
          }
          return provider;
        }
        case "phone":
          return calendar.locationDetails ?? "Phone call";
        default:
          return calendar.locationDetails ?? "Details to follow";
      }
    })();

    const meetingUrl = (() => {
      if (calendar.locationType !== "virtual") {
        return null;
      }

      const candidate =
        booking.meetingUrl ??
        (calendar.locationDetails && calendar.locationDetails.startsWith("http")
          ? calendar.locationDetails
          : undefined) ??
        (calendar.virtualMeetingPreference && calendar.virtualMeetingPreference.startsWith("http")
          ? calendar.virtualMeetingPreference
          : undefined);

      return candidate ?? null;
    })();

    const emailTasks: Array<Promise<unknown>> = [
      sendAppointmentConfirmationEmail({
        recipient: guestEmail,
        guestName,
        calendarName: calendar.name,
        businessName,
        startTimeIso: booking.startTime,
        endTimeIso: booking.endTime,
        timezone: calendar.timezone,
        locationSummary,
        meetingUrl,
        notes: guestNotes ?? undefined,
        status: booking.status,
      }),
    ];

    if (owner?.email) {
      emailTasks.push(
        sendAppointmentNotificationEmail({
          recipient: owner.email,
          guestEmail,
          guestName,
          calendarName: calendar.name,
          businessName,
          calendarId: calendar.id,
          startTimeIso: booking.startTime,
          endTimeIso: booking.endTime,
          timezone: calendar.timezone,
          locationSummary,
          meetingUrl,
          notes: guestNotes ?? undefined,
          status: booking.status,
          reason: null,
        }),
      );
    }

    void Promise.allSettled(emailTasks);

    return NextResponse.json({ booking, availability });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

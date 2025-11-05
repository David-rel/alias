import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";
import {
  createBooking,
  ensureSlotIsAvailable,
  getAvailabilityWindowForCalendar,
  getBookingsForCalendars,
  getCalendarById,
} from "@/lib/appointments";

type RouteContext = {
  params: Promise<{
    calendarId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { calendarId } = await context.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businessContext = await getPrimaryBusinessForUser(session.user.id);
  if (!businessContext) {
    return NextResponse.json({ error: "No business context" }, { status: 403 });
  }

  const calendar = await getCalendarById(
    calendarId,
    businessContext.business.id
  );
  if (!calendar) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  const bookings = await getBookingsForCalendars([calendar.id], {
    includeCancelled: true,
    upcomingOnly: false,
  });

  const availability = await getAvailabilityWindowForCalendar({ calendar });

  return NextResponse.json({ calendar, bookings, availability });
}

export async function POST(request: Request, context: RouteContext) {
  const { calendarId } = await context.params;
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
      { status: 403 }
    );
  }

  const calendar = await getCalendarById(
    calendarId,
    businessContext.business.id
  );
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
      { status: 400 }
    );
  }

  const slotStart =
    typeof payload.slotStart === "string" ? payload.slotStart : null;
  const slotEnd = typeof payload.slotEnd === "string" ? payload.slotEnd : null;

  if (!slotStart || !slotEnd) {
    return NextResponse.json(
      { error: "slotStart and slotEnd are required" },
      { status: 400 }
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
      { status: 409 }
    );
  }

  const startTimeUtc = new Date(slotStart);
  const endTimeUtc = new Date(slotEnd);

  try {
    const booking = await createBooking({
      calendarId: calendar.id,
      createdByUserId: session.user.id,
      guestName,
      guestEmail,
      guestTimezone,
      guestNotes,
      startTimeUtc,
      endTimeUtc,
    });

    const updatedAvailability = await getAvailabilityWindowForCalendar({
      calendar,
    });

    return NextResponse.json({ booking, availability: updatedAvailability });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

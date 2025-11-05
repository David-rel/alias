import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrimaryBusinessForUser } from "@/lib/business";
import {
  getBookingsForCalendars,
  getCalendarsForBusiness,
} from "@/lib/appointments";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getPrimaryBusinessForUser(session.user.id);

  if (!context) {
    return NextResponse.json(
      { error: "No business context" },
      { status: 403 },
    );
  }

  const calendars = await getCalendarsForBusiness(context.business.id);
  const calendarIds = calendars.map((calendar) => calendar.id);

  const bookings = await getBookingsForCalendars(calendarIds, {
    includeCancelled: false,
    upcomingOnly: false,
  });

  return NextResponse.json({ bookings });
}

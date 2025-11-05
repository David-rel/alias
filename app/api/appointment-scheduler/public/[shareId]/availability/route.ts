import { NextResponse } from "next/server";
import {
  getCalendarByShareId,
  getAvailabilityWindowForCalendar,
} from "@/lib/appointments";

type RouteContext = {
  params: Promise<{
    shareId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { shareId } = await context.params;
  const url = new URL(request.url);
  const startParam = url.searchParams.get("start");
  const endParam = url.searchParams.get("end");

  const calendar = await getCalendarByShareId(shareId);

  if (!calendar) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  const startDate = startParam ? new Date(startParam) : undefined;
  const endDate = endParam ? new Date(endParam) : undefined;

  const availability = await getAvailabilityWindowForCalendar({
    calendar,
    startDate,
    endDate,
  });

  return NextResponse.json({ calendar, availability });
}

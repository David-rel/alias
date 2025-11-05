import { notFound } from "next/navigation";
import {
  getAvailabilityWindowForCalendar,
  getCalendarByShareId,
} from "@/lib/appointments";
import { PublicBookingExperience } from "@/components/appointment-scheduler/PublicBookingExperience";

type PageProps = {
  params: Promise<{
    shareId: string;
  }>;
};

export const metadata = {
  title: "Book a meeting - Alias",
  description: "Find an appointment that fits and confirm instantly.",
};

export default async function PublicCalendarPage(props: PageProps) {
  const { shareId } = await props.params;
  const calendar = await getCalendarByShareId(shareId);

  if (!calendar) {
    notFound();
  }

  const availability = await getAvailabilityWindowForCalendar({
    calendar,
  });

  return (
    <PublicBookingExperience
      calendar={calendar}
      availability={availability}
    />
  );
}

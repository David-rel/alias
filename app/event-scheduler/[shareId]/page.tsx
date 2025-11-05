import { notFound } from "next/navigation";
import { getEventByShareId } from "@/lib/events";
import { PublicEventRegistration } from "@/components/event-scheduler/PublicEventRegistration";
import type { EventWithStats } from "@/types/events";

type PageProps = {
  params: Promise<{
    shareId: string;
  }>;
};

export const metadata = {
  title: "RSVP - Alias Event",
  description:
    "Register for upcoming events hosted by the Alias team and partners.",
};

export default async function PublicEventPage(props: PageProps) {
  const { shareId } = await props.params;
  const event = await getEventByShareId(shareId, { withStats: true });

  if (!event) {
    notFound();
  }

  return (
    <PublicEventRegistration event={event as EventWithStats} />
  );
}

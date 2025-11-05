export type EventType = "in_person" | "online" | "hybrid";

export type EventStatus = "draft" | "published" | "completed" | "cancelled";

export type EventRegistrationStatus =
  | "registered"
  | "cancelled"
  | "waitlisted"
  | "checked_in";

export type Event = {
  id: string;
  businessId: string;
  createdByUserId: string | null;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  eventType: EventType;
  locationAddress: string | null;
  locationDetails: string | null;
  virtualMeetingUrl: string | null;
  timezone: string;
  startTime: string;
  endTime: string;
  registrationDeadline: string | null;
  capacity: number | null;
  shareId: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
};

export type EventWithStats = Event & {
  registrationCount: number;
  checkedInCount: number;
  capacityRemaining: number | null;
};

export type EventRegistration = {
  id: string;
  eventId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string | null;
  notes: string | null;
  status: EventRegistrationStatus;
  checkedInAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateEventInput = {
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  eventType: EventType;
  locationAddress: string | null;
  locationDetails: string | null;
  virtualMeetingUrl: string | null;
  timezone: string;
  startTime: string;
  endTime: string;
  registrationDeadline: string | null;
  capacity: number | null;
  status: EventStatus;
};

export type UpdateEventInput = Partial<Omit<CreateEventInput, "status">> & {
  status?: EventStatus;
};

export type CreateEventRegistrationInput = {
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string | null;
  notes: string | null;
};

export type AppointmentLocationType =
  | "in_person"
  | "virtual"
  | "phone"
  | "custom";

export type AppointmentStatus = "active" | "inactive";

export type AppointmentBookingStatus =
  | "pending"
  | "scheduled"
  | "cancelled"
  | "completed";

export type AppointmentCalendar = {
  id: string;
  businessId: string;
  ownerUserId: string;
  name: string;
  appointmentType: string;
  description: string | null;
  locationType: AppointmentLocationType;
  locationDetails: string | null;
  virtualMeetingPreference: string | null;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  timezone: string;
  shareId: string;
  bookingWindowDays: number;
  minScheduleNoticeMinutes: number;
  status: AppointmentStatus;
  requiresConfirmation: boolean;
  googleCalendarSync: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentAvailabilityRule = {
  id: string;
  calendarId: string;
  ruleType: "weekly" | "date";
  dayOfWeek: number | null;
  specificDate: string | null;
  startMinutes: number;
  endMinutes: number;
  isUnavailable: boolean;
};

export type AppointmentAvailabilityRuleInput = Omit<
  AppointmentAvailabilityRule,
  "id" | "calendarId"
> & {
  id?: string;
};

export type AvailabilitySlot = {
  start: string;
  end: string;
};

export type DayAvailability = {
  date: string;
  slots: AvailabilitySlot[];
};

export type AppointmentBooking = {
  id: string;
  calendarId: string;
  shareId: string;
  guestName: string;
  guestEmail: string;
  guestTimezone: string | null;
  guestNotes: string | null;
  startTime: string;
  endTime: string;
  status: AppointmentBookingStatus;
  meetingUrl: string | null;
  meetingLocation: string | null;
  externalEventId: string | null;
  externalCalendar: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CalendarSummary = AppointmentCalendar & {
  upcomingAvailability: DayAvailability[];
  upcomingBookings: AppointmentBooking[];
};

"use client";

import { useState, useTransition } from "react";
import {
  FiCheck,
  FiClock,
  FiGlobe,
  FiLoader,
  FiMapPin,
  FiToggleLeft,
} from "react-icons/fi";
import type { AppointmentCalendar } from "@/types/appointments";

const LOCATION_OPTIONS = [
  { value: "virtual", label: "Virtual (online meeting)" },
  { value: "in_person", label: "In person" },
  { value: "phone", label: "Phone call" },
  { value: "custom", label: "Custom instructions" },
];

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

const TIMEZONE_FALLBACKS = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
];

type CreateCalendarFormProps = {
  onCreated: (calendar: AppointmentCalendar) => void;
  onCancel?: () => void;
};

export function CreateCalendarForm({ onCreated, onCancel }: CreateCalendarFormProps) {
  const [name, setName] = useState("Discovery Call");
  const [appointmentType, setAppointmentType] = useState("Discovery Call");
  const [description, setDescription] = useState(
    "Learn more about our services and map next steps.",
  );
  const [locationType, setLocationType] = useState<string>("virtual");
  const [locationDetails, setLocationDetails] = useState<string>("Google Meet link will be shared after booking.");
  const [virtualMeetingPreference, setVirtualMeetingPreference] = useState<string>("Google Meet");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [bufferBeforeMinutes, setBufferBeforeMinutes] = useState<number>(10);
  const [bufferAfterMinutes, setBufferAfterMinutes] = useState<number>(10);
  const [timezone, setTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
  );
  const [bookingWindowDays, setBookingWindowDays] = useState<number>(30);
  const [minNoticeMinutes, setMinNoticeMinutes] = useState<number>(120);
  const [requiresConfirmation, setRequiresConfirmation] = useState<boolean>(false);
  const [googleSync, setGoogleSync] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        const response = await fetch("/api/appointment-scheduler/calendars", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            appointmentType,
            description,
            locationType,
            locationDetails,
            virtualMeetingPreference,
            durationMinutes,
            bufferBeforeMinutes,
            bufferAfterMinutes,
            timezone,
            bookingWindowDays,
            minScheduleNoticeMinutes: minNoticeMinutes,
            requiresConfirmation,
            googleCalendarSync: googleSync,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Failed to create calendar");
        }

        const payload = (await response.json()) as { calendar: AppointmentCalendar };
        setSuccess(true);
        onCreated(payload.calendar);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-h-[80vh] flex-col gap-6 overflow-y-auto rounded-3xl border border-white/10 bg-[#03162d] px-6 py-8 text-white shadow-[0_35px_120px_rgba(3,22,45,0.65)]"
    >
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-[#3eb6fd]">
          New calendar
        </p>
        <h2 className="text-2xl font-semibold">Launch a booking flow</h2>
        <p className="text-sm text-white/70">
          Capture your availability, choose how meetings happen, and keep everything in sync with Google Calendar.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-[#3eb6fd]">
            Calendar name
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="Strategy Session"
            className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#3eb6fd] focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-[#3eb6fd]">
            Appointment type
          </span>
          <input
            value={appointmentType}
            onChange={(event) => setAppointmentType(event.target.value)}
            placeholder="Discovery Call"
            className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#3eb6fd] focus:outline-none"
          />
        </label>

        <label className="md:col-span-2 flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-[#3eb6fd]">
            Description
          </span>
          <textarea
            value={description ?? ""}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#3eb6fd] focus:outline-none"
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-[#3eb6fd] flex items-center gap-2">
            <FiClock className="text-[#3eb6fd]" /> Duration (minutes)
          </span>
          <select
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(Number(event.target.value))}
            className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white focus:border-[#3eb6fd] focus:outline-none"
          >
            {DURATION_PRESETS.map((value) => (
              <option key={value} value={value} className="bg-[#03162d]">
                {value} minutes
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.25em] text-[#3eb6fd]">
              Buffer before
            </span>
            <input
              type="number"
              min={0}
              value={bufferBeforeMinutes}
              onChange={(event) => setBufferBeforeMinutes(Number(event.target.value))}
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white focus:border-[#3eb6fd] focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.25em] text-[#3eb6fd]">
              Buffer after
            </span>
            <input
              type="number"
              min={0}
              value={bufferAfterMinutes}
              onChange={(event) => setBufferAfterMinutes(Number(event.target.value))}
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white focus:border-[#3eb6fd] focus:outline-none"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-[#3eb6fd] flex items-center gap-2">
            <FiGlobe className="text-[#3eb6fd]" /> Time zone
          </span>
          <select
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white focus:border-[#3eb6fd] focus:outline-none"
          >
            {[timezone, ...TIMEZONE_FALLBACKS]
              .filter((value, index, array) => array.indexOf(value) === index)
              .map((value) => (
                <option key={value} value={value} className="bg-[#03162d]">
                  {value}
                </option>
              ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-[#3eb6fd]">
            Booking window (days)
          </span>
          <input
            type="number"
            min={1}
            max={365}
            value={bookingWindowDays}
            onChange={(event) => setBookingWindowDays(Number(event.target.value))}
            className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white focus:border-[#3eb6fd] focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-[#3eb6fd]">
            Minimum notice (minutes)
          </span>
          <input
            type="number"
            min={0}
            value={minNoticeMinutes}
            onChange={(event) => setMinNoticeMinutes(Number(event.target.value))}
            className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white focus:border-[#3eb6fd] focus:outline-none"
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-[#3eb6fd] flex items-center gap-2">
            <FiMapPin className="text-[#3eb6fd]" /> Meeting location
          </span>
          <select
            value={locationType}
            onChange={(event) => setLocationType(event.target.value)}
            className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white focus:border-[#3eb6fd] focus:outline-none"
          >
            {LOCATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-[#03162d]">
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-[#3eb6fd]">
            Additional details
          </span>
          <input
            value={locationDetails ?? ""}
            onChange={(event) => setLocationDetails(event.target.value)}
            placeholder={
              locationType === "in_person"
                ? "123 Market Street, Suite 400"
                : "Meeting link shared after booking"
            }
            className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#3eb6fd] focus:outline-none"
          />
        </label>

        {locationType === "virtual" && (
          <label className="md:col-span-2 flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.25em] text-[#3eb6fd]">
              Preferred virtual meeting provider
            </span>
            <input
              value={virtualMeetingPreference ?? ""}
              onChange={(event) => setVirtualMeetingPreference(event.target.value)}
              placeholder="Google Meet"
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#3eb6fd] focus:outline-none"
            />
          </label>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
          <span className="flex items-center gap-2">
            <FiToggleLeft className={`text-xl ${requiresConfirmation ? "text-[#3eb6fd]" : "text-white/40"}`} />
            Require manual approval
          </span>
          <input
            type="checkbox"
            checked={requiresConfirmation}
            onChange={(event) => setRequiresConfirmation(event.target.checked)}
            className="h-5 w-5 rounded border border-white/20 bg-white/10"
          />
        </label>

        <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
          <span className="flex items-center gap-2">
            <FiToggleLeft className={`text-xl ${googleSync ? "text-[#3eb6fd]" : "text-white/40"}`} />
            Sync with Google Calendar
          </span>
          <input
            type="checkbox"
            checked={googleSync}
            onChange={(event) => setGoogleSync(event.target.checked)}
            className="h-5 w-5 rounded border border-white/20 bg-white/10"
          />
        </label>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="flex items-center gap-2 rounded-2xl border border-[#23a5fe]/40 bg-[#23a5fe]/10 px-4 py-3 text-sm text-[#3eb6fd]">
          <FiCheck />
          Calendar created. Configure availability next.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white/70 transition hover:border-white/40 hover:text-white"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-transparent bg-[#23a5fe] px-6 py-3 text-sm font-semibold text-[#03162d] shadow-[0_18px_45px_rgba(35,165,254,0.45)] transition hover:scale-[1.01] hover:bg-[#3eb6fd] disabled:cursor-not-allowed disabled:bg-[#1d466c] disabled:text-white/50"
        >
          {pending ? (
            <>
              <FiLoader className="animate-spin" />
              Creating…
            </>
          ) : (
            "Create calendar"
          )}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  FiCalendar,
  FiCheck,
  FiClock,
  FiGlobe,
  FiLoader,
  FiMapPin,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";
import type { Event, EventType } from "@/types/events";

type CreateEventFormProps = {
  onCreated: (event: Event) => void;
  onCancel: () => void;
};

function resolveDefaultTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

function toIso(localValue: string | null): string | null {
  if (!localValue) {
    return null;
  }

  const parsed = new Date(localValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export function CreateEventForm({ onCreated, onCancel }: CreateEventFormProps) {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [eventType, setEventType] = useState<EventType>("in_person");
  const [locationAddress, setLocationAddress] = useState<string>("");
  const [locationDetails, setLocationDetails] = useState<string>("");
  const [virtualMeetingUrl, setVirtualMeetingUrl] = useState<string>("");
  const [timezone, setTimezone] = useState<string>(resolveDefaultTimezone);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [registrationDeadline, setRegistrationDeadline] =
    useState<string>("");
  const [capacity, setCapacity] = useState<string>("");
  const [publishNow, setPublishNow] = useState<boolean>(true);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState<boolean>(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const coverInputRef = useRef<HTMLInputElement>(null);

  async function destroyCover(url: string | null) {
    if (!url) {
      return;
    }

    try {
      await fetch("/api/event-scheduler/covers", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
    } catch (deleteError) {
      console.error("Failed to delete draft event cover", deleteError);
    }
  }

  async function handleCoverChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      return;
    }

    setCoverError(null);
    setCoverUploading(true);

    try {
      if (coverImageUrl) {
        await destroyCover(coverImageUrl);
      }

      const formData = new FormData();
      formData.append("cover", file);

      const response = await fetch("/api/event-scheduler/covers", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        error?: string;
        coverImageUrl?: string;
      };

      if (!response.ok || !payload.coverImageUrl) {
        throw new Error(payload.error ?? "Unable to upload cover image");
      }

      setCoverImageUrl(payload.coverImageUrl);
    } catch (uploadError) {
      setCoverError((uploadError as Error).message);
    } finally {
      setCoverUploading(false);
    }
  }

  async function handleRemoveCover() {
    if (!coverImageUrl) {
      return;
    }

    setCoverError(null);
    setCoverUploading(true);

    try {
      await destroyCover(coverImageUrl);
      setCoverImageUrl(null);
    } catch (removeError) {
      setCoverError((removeError as Error).message);
    } finally {
      setCoverUploading(false);
    }
  }

  async function handleCancel() {
    await destroyCover(coverImageUrl);
    onCancel();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Give your event a title.");
      return;
    }

    if (!startTime || !endTime) {
      setError("Choose a start and end time.");
      return;
    }

    const startIso = toIso(startTime);
    const endIso = toIso(endTime);

    if (!startIso || !endIso) {
      setError("Unable to read the start or end time. Try a different value.");
      return;
    }

    if (new Date(endIso) <= new Date(startIso)) {
      setError("End time must be after the start time.");
      return;
    }

    const deadlineIso = registrationDeadline
      ? toIso(registrationDeadline)
      : null;

    if (deadlineIso && new Date(deadlineIso) > new Date(startIso)) {
      setError("Registration deadline must be before the event start time.");
      return;
    }

    let capacityValue: number | null = null;
    if (capacity.trim()) {
      const parsed = Number.parseInt(capacity, 10);
      if (!Number.isFinite(parsed) || parsed < 1) {
        setError("Capacity must be at least 1 when provided.");
        return;
      }
      capacityValue = parsed;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      coverImageUrl,
      eventType,
      locationAddress:
        eventType === "online" ? null : locationAddress.trim() || null,
      locationDetails: locationDetails.trim() || null,
      virtualMeetingUrl:
        eventType === "in_person"
          ? null
          : virtualMeetingUrl.trim() || null,
      timezone: timezone.trim() || "UTC",
      startTime: startIso,
      endTime: endIso,
      registrationDeadline: deadlineIso,
      capacity: typeof capacityValue === "number" ? capacityValue : null,
      status: publishNow ? "published" : "draft",
    };

    startTransition(async () => {
      try {
        const response = await fetch("/api/event-scheduler/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "Unable to create event");
        }

        const data = (await response.json()) as { event: Event };
        onCreated(data.event);
        setCoverImageUrl(null);
      } catch (submissionError) {
        setError((submissionError as Error).message);
      }
    });
  }

  useEffect(() => {
    return () => {
      void destroyCover(coverImageUrl);
    };
    // We intentionally omit dependencies to only run on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-h-[85vh] flex-col space-y-6 overflow-y-auto rounded-3xl border border-white/10 bg-neutral-950/90 p-8 text-white shadow-[0_55px_120px_rgba(3,22,45,0.75)] backdrop-blur-3xl"
    >
      <div className="flex items-start justify-between gap-4">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.5em] text-[#3eb6fd]">
            Event blueprint
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">
            Launch a new event
          </h2>
          <p className="text-sm text-white/70">
            Add the essentials and publish instantly. You can tweak details or
            invite attendees later.
          </p>
        </header>
        <button
          type="button"
          onClick={handleCancel}
          aria-label="Close create event"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:border-white/35 hover:bg-white/10"
        >
          <FiX /> Close
        </button>
      </div>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/80">
        <header>
          <p className="text-xs uppercase tracking-[0.35em] text-[#3eb6fd]">
            Cover image
          </p>
          <p className="mt-2 text-xs text-white/60">
            Upload artwork to showcase the experience across public RSVP pages and emails.
          </p>
        </header>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/10">
          {coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImageUrl}
              alt="Event cover preview"
              className="h-48 w-full object-cover"
            />
          ) : (
            <div className="flex h-48 w-full flex-col items-center justify-center gap-3 text-white/50">
              <FiUpload className="text-2xl" />
              <p className="text-xs">No cover selected</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            disabled={coverUploading}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-xs font-semibold text-white transition hover:border-[#23a5fe]/60 hover:bg-[#062951] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {coverUploading ? <FiLoader className="animate-spin" /> : <FiUpload />}
            {coverUploading ? "Uploading…" : "Upload artwork"}
          </button>
          {coverImageUrl ? (
            <button
              type="button"
              onClick={handleRemoveCover}
              disabled={coverUploading}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-xs font-semibold text-white transition hover:border-[#ff6b6b]/50 hover:bg-[#2f1a1a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiTrash2 /> Remove
            </button>
          ) : null}
        </div>
        {coverError ? (
          <p className="text-xs text-[#ffb4b4]">{coverError}</p>
        ) : null}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverChange}
        />
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
            <FiCalendar /> Title
          </span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Alias v2 launch event"
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 transition focus:border-[#23a5fe]/60 focus:outline-none"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
            <FiGlobe /> Event type
          </span>
          <select
            value={eventType}
            onChange={(event) =>
              setEventType(event.target.value as EventType)
            }
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition focus:border-[#23a5fe]/60 focus:outline-none"
          >
            <option value="in_person">In-person</option>
            <option value="online">Online</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </label>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
          Description
        </span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          placeholder="Tell attendees what to expect, highlight special guests, or add agenda notes."
          className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 transition focus:border-[#23a5fe]/60 focus:outline-none"
        />
      </label>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
            <FiMapPin /> Location details
          </span>
          <input
            type="text"
            value={locationAddress}
            onChange={(event) => setLocationAddress(event.target.value)}
            placeholder="123 Market Street, Suite 500"
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 transition focus:border-[#23a5fe]/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
            disabled={eventType === "online"}
          />
        </label>

        <label className="space-y-2">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
            <FiMapPin /> Additional instructions
          </span>
          <input
            type="text"
            value={locationDetails}
            onChange={(event) => setLocationDetails(event.target.value)}
            placeholder="Check-in opens at 5:30pm · Parking validation provided"
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 transition focus:border-[#23a5fe]/60 focus:outline-none"
          />
        </label>
      </div>

      <label className="space-y-2">
        <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
          Virtual meeting link
        </span>
        <input
          type="url"
          value={virtualMeetingUrl}
          onChange={(event) => setVirtualMeetingUrl(event.target.value)}
          placeholder="https://alias.app/events/alias-summit"
          className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 transition focus:border-[#23a5fe]/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          disabled={eventType === "in_person"}
        />
        <p className="text-xs text-white/50">
          Share a livestream link for online or hybrid experiences.
        </p>
      </label>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
            <FiClock /> Starts
          </span>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition focus:border-[#23a5fe]/60 focus:outline-none"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
            <FiClock /> Ends
          </span>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition focus:border-[#23a5fe]/60 focus:outline-none"
            required
          />
        </label>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
            Registration deadline
          </span>
          <input
            type="datetime-local"
            value={registrationDeadline}
            onChange={(event) => setRegistrationDeadline(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition focus:border-[#23a5fe]/60 focus:outline-none"
          />
          <p className="text-xs text-white/50">
            Leave blank to accept registrations until the event begins.
          </p>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
            Capacity
          </span>
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            placeholder="Leave blank for unlimited"
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 transition focus:border-[#23a5fe]/60 focus:outline-none"
          />
        </label>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
          Timezone
        </span>
        <input
          type="text"
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          placeholder="America/New_York"
          className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 transition focus:border-[#23a5fe]/60 focus:outline-none"
          required
        />
        <p className="text-xs text-white/50">
          Use an IANA timezone so calendar invites display correctly.
        </p>
      </label>

      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
        <div className="space-y-1 text-sm text-white/70">
          <p className="font-semibold text-white">Publish immediately</p>
          <p className="text-xs text-white/50">
            Turn this off to save the event as a draft while you finalize content.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPublishNow((value) => !value)}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
            publishNow
              ? "border-[#23a5fe]/60 bg-[#23a5fe]/20 text-[#23a5fe]"
              : "border-white/15 bg-white/5 text-white/60"
          }`}
        >
          {publishNow ? "Published" : "Draft"}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 px-4 py-3 text-sm text-[#ffb4b4]">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/35 hover:bg-white/20"
        >
          <FiX /> Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#23a5fe] px-6 py-3 text-sm font-semibold text-[#03162d] shadow-[0_18px_45px_rgba(35,165,254,0.45)] transition hover:scale-[1.01] hover:bg-[#3eb6fd] disabled:cursor-not-allowed disabled:bg-[#1d466c] disabled:text-white/60"
        >
          {pending ? <FiLoader className="animate-spin" /> : <FiCheck />}
          Create event
        </button>
      </div>
    </form>
  );
}

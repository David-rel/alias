"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiCopy,
  FiEdit,
  FiExternalLink,
  FiImage,
  FiLoader,
  FiMapPin,
  FiShield,
  FiTrash2,
  FiUpload,
  FiUsers,
  FiX,
} from "react-icons/fi";
import type { BusinessRole } from "@/types/business";
import type {
  EventRegistration,
  EventWithStats,
} from "@/types/events";

type EventDetailProps = {
  event: EventWithStats;
  registrations: EventRegistration[];
  shareBaseUrl?: string;
  role: BusinessRole;
};

type EventDraft = {
  title: string;
  description: string;
  eventType: EventWithStats["eventType"];
  locationAddress: string;
  locationDetails: string;
  virtualMeetingUrl: string;
  timezone: string;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  capacity: string;
  status: EventWithStats["status"];
};

type Feedback = {
  type: "success" | "error";
  text: string;
};

function formatDateTime(event: EventWithStats) {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: event.timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: event.timezone,
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    date: dateFormatter.format(start),
    timeRange: `${timeFormatter.format(start)} – ${timeFormatter.format(end)} ${event.timezone}`,
  };
}

function formatLocation(event: EventWithStats) {
  switch (event.eventType) {
    case "in_person":
      return event.locationAddress ?? event.locationDetails ?? "In-person event";
    case "online":
      return (
        event.virtualMeetingUrl ??
        event.locationDetails ??
        "Virtual meeting link will be shared with attendees"
      );
    default: {
      const pieces = [
        event.locationAddress ?? null,
        event.virtualMeetingUrl ?? null,
        event.locationDetails ?? null,
      ].filter(Boolean);
      return pieces.join(" · ") || "Hybrid event";
    }
  }
}

function statusLabel(status: EventWithStats["status"]) {
  switch (status) {
    case "published":
      return "Published";
    case "draft":
      return "Draft";
    case "completed":
      return "Completed";
    default:
      return "Cancelled";
  }
}

function toLocalInputValue(iso: string) {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInputValue(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function createDraft(event: EventWithStats): EventDraft {
  return {
    title: event.title,
    description: event.description ?? "",
    eventType: event.eventType,
    locationAddress: event.locationAddress ?? "",
    locationDetails: event.locationDetails ?? "",
    virtualMeetingUrl: event.virtualMeetingUrl ?? "",
    timezone: event.timezone,
    startTime: toLocalInputValue(event.startTime),
    endTime: toLocalInputValue(event.endTime),
    registrationDeadline: event.registrationDeadline
      ? toLocalInputValue(event.registrationDeadline)
      : "",
    capacity: event.capacity !== null ? String(event.capacity) : "",
    status: event.status,
  };
}

type EventCoverManagerProps = {
  event: EventWithStats;
  canEdit: boolean;
  onCoverUpdated: (nextCover: string | null) => void;
  onFeedback: (type: Feedback["type"], text: string) => void;
};

function EventCoverManager({
  event,
  canEdit,
  onCoverUpdated,
  onFeedback,
}: EventCoverManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingAction, setPendingAction] = useState<"upload" | "remove" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setPendingAction(null);
  }, [event.coverImageUrl]);

  const handleFileChange = useCallback(
    async (changeEvent: ChangeEvent<HTMLInputElement>) => {
      const file = changeEvent.target.files?.[0] ?? null;
      changeEvent.target.value = "";

      if (!file || !canEdit) {
        return;
      }

      setError(null);
      setPendingAction("upload");

      try {
        const formData = new FormData();
        formData.append("cover", file);

        const response = await fetch(
          `/api/event-scheduler/events/${event.id}/cover`,
          {
            method: "POST",
            body: formData,
          },
        );

        const payload = (await response.json()) as {
          error?: string;
          coverImageUrl?: string | null;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to upload cover image");
        }

        onCoverUpdated(payload.coverImageUrl ?? null);
        onFeedback("success", "Cover image updated.");
      } catch (uploadError) {
        const message = (uploadError as Error).message;
        setError(message);
        onFeedback("error", message);
      } finally {
        setPendingAction(null);
      }
    },
    [canEdit, event.id, onCoverUpdated, onFeedback],
  );

  const handleRemove = useCallback(async () => {
    if (!event.coverImageUrl || !canEdit) {
      return;
    }

    setError(null);
    setPendingAction("remove");

    try {
      const formData = new FormData();
      formData.append("action", "remove");

      const response = await fetch(
        `/api/event-scheduler/events/${event.id}/cover`,
        {
          method: "POST",
          body: formData,
        },
      );

      const payload = (await response.json()) as {
        error?: string;
        coverImageUrl?: string | null;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove cover image");
      }

      onCoverUpdated(payload.coverImageUrl ?? null);
      onFeedback("success", "Cover image removed.");
    } catch (removeError) {
      const message = (removeError as Error).message;
      setError(message);
      onFeedback("error", message);
    } finally {
      setPendingAction(null);
    }
  }, [canEdit, event.coverImageUrl, event.id, onCoverUpdated, onFeedback]);

  return (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_45px_120px_rgba(3,22,45,0.45)]">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60">
          {event.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.coverImageUrl}
              alt={`${event.title} cover`}
              className="h-60 w-full object-cover"
            />
          ) : (
            <div className="flex h-60 w-full flex-col items-center justify-center gap-3 text-white/50">
              <FiImage className="text-3xl" />
              <p className="text-xs">
                Upload a wide image (16:9 works best) up to 10MB.
              </p>
            </div>
          )}
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Event artwork</h3>
            <p className="text-sm text-white/70">
              A strong visual helps your event stand out on public RSVP pages and
              emails.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canEdit || pendingAction !== null}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:border-[#3eb6fd]/60 hover:bg-[#062951] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingAction === "upload" ? (
                <FiLoader className="animate-spin" />
              ) : (
                <FiUpload />
              )}
              Upload image
            </button>
            {event.coverImageUrl ? (
              <button
                type="button"
                onClick={handleRemove}
                disabled={!canEdit || pendingAction !== null}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:border-[#ff6b6b]/50 hover:bg-[#2f1a1a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingAction === "remove" ? (
                  <FiLoader className="animate-spin" />
                ) : (
                  <FiTrash2 />
                )}
                Remove image
              </button>
            ) : null}
          </div>
          {!canEdit ? (
            <p className="text-xs text-white/40">
              Only workspace owners and admins can update event artwork.
            </p>
          ) : null}
          {error ? (
            <p className="flex items-center gap-2 text-xs text-[#ffb4b4]">
              <FiAlertCircle /> {error}
            </p>
          ) : null}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </section>
  );
}

type EventEditFormProps = {
  event: EventWithStats;
  onCancel: () => void;
  onSaved: (updatedEvent: EventWithStats, registrations: EventRegistration[]) => void;
  onFeedback: (type: Feedback["type"], text: string) => void;
};

function EventEditForm({
  event,
  onCancel,
  onSaved,
  onFeedback,
}: EventEditFormProps) {
  const [draft, setDraft] = useState<EventDraft>(() => createDraft(event));
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    setDraft(createDraft(event));
  }, [event]);

  function handleCancel() {
    setDraft(createDraft(event));
    setError(null);
    onCancel();
  }

  function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);

    if (!draft.title.trim()) {
      setError("Event title is required.");
      return;
    }

    const startIso = fromLocalInputValue(draft.startTime);
    const endIso = fromLocalInputValue(draft.endTime);

    if (!startIso || !endIso) {
      setError("Select a valid start and end time.");
      return;
    }

    if (new Date(endIso) <= new Date(startIso)) {
      setError("End time must be after the start time.");
      return;
    }

    const deadlineIso = draft.registrationDeadline
      ? fromLocalInputValue(draft.registrationDeadline)
      : null;

    if (deadlineIso && new Date(deadlineIso) > new Date(startIso)) {
      setError("Registration deadline must be before the event start time.");
      return;
    }

    let capacityValue: number | null = null;
    if (draft.capacity.trim()) {
      const parsed = Number.parseInt(draft.capacity, 10);
      if (!Number.isFinite(parsed) || parsed < 1) {
        setError("Capacity must be at least 1 when provided.");
        return;
      }
      capacityValue = parsed;
    }

    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      eventType: draft.eventType,
      locationAddress: draft.locationAddress.trim() || null,
      locationDetails: draft.locationDetails.trim() || null,
      virtualMeetingUrl: draft.virtualMeetingUrl.trim() || null,
      timezone: draft.timezone.trim(),
      startTime: startIso,
      endTime: endIso,
      registrationDeadline: deadlineIso,
      capacity: capacityValue,
      status: draft.status,
    };

    startSaving(async () => {
      try {
        const response = await fetch(
          `/api/event-scheduler/events/${event.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        const patchPayload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(patchPayload.error ?? "Unable to update event");
        }

        const refreshed = await fetch(
          `/api/event-scheduler/events/${event.id}`,
        );
        const refreshedPayload = (await refreshed.json()) as {
          error?: string;
          event?: EventWithStats;
          registrations?: EventRegistration[];
        };

        if (!refreshed.ok || !refreshedPayload.event || !refreshedPayload.registrations) {
          throw new Error(
            refreshedPayload.error ??
              "Event updated but failed to refresh details.",
          );
        }

        onSaved(refreshedPayload.event, refreshedPayload.registrations);
        onFeedback("success", "Event details updated.");
      } catch (updateError) {
        const message = (updateError as Error).message;
        setError(message);
        onFeedback("error", message);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl border border-white/10 bg-neutral-950/90 p-8 text-white shadow-[0_55px_120px_rgba(3,22,45,0.75)] backdrop-blur-3xl"
    >
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.45em] text-[#3eb6fd]">
          Update event
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">
          Edit event details
        </h2>
        <p className="text-sm text-white/70">
          Adjust the essentials, then save to keep the public RSVP page and
          dashboards in sync.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
            Title
          </span>
          <input
            type="text"
            value={draft.title}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, title: event.target.value }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 transition focus:border-[#23a5fe]/60 focus:outline-none"
            placeholder="Alias v2 launch event"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
            Event type
          </span>
          <select
            value={draft.eventType}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                eventType: event.target.value as EventDraft["eventType"],
              }))
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
          value={draft.description}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, description: event.target.value }))
          }
          rows={4}
          placeholder="Outline the agenda, speakers, or experience highlights."
          className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 transition focus:border-[#23a5fe]/60 focus:outline-none"
        />
      </label>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
            Location address
          </span>
          <input
            type="text"
            value={draft.locationAddress}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                locationAddress: event.target.value,
              }))
            }
            placeholder="123 Market Street, Suite 500"
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 transition focus:border-[#23a5fe]/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
            disabled={draft.eventType === "online"}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
            Arrival details
          </span>
          <input
            type="text"
            value={draft.locationDetails}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                locationDetails: event.target.value,
              }))
            }
            placeholder="Parking validation included · Doors open 30 minutes early"
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 transition focus:border-[#23a5fe]/60 focus:outline-none"
          />
        </label>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
          Virtual meeting link
        </span>
        <input
          type="url"
          value={draft.virtualMeetingUrl}
          onChange={(event) =>
            setDraft((prev) => ({
              ...prev,
              virtualMeetingUrl: event.target.value,
            }))
          }
          placeholder="https://alias.app/events/keynote"
          className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 transition focus:border-[#23a5fe]/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          disabled={draft.eventType === "in_person"}
        />
        <p className="text-xs text-white/50">
          Share a livestream or webinar link for online or hybrid events.
        </p>
      </label>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
            Starts
          </span>
          <input
            type="datetime-local"
            value={draft.startTime}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, startTime: event.target.value }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition focus:border-[#23a5fe]/60 focus:outline-none"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
            Ends
          </span>
          <input
            type="datetime-local"
            value={draft.endTime}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, endTime: event.target.value }))
            }
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
            value={draft.registrationDeadline}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                registrationDeadline: event.target.value,
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition focus:border-[#23a5fe]/60 focus:outline-none"
          />
          <p className="text-xs text-white/50">
            Leave blank to accept registrations up until the event starts.
          </p>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
            Capacity
          </span>
          <input
            type="number"
            min={1}
            value={draft.capacity}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                capacity: event.target.value,
              }))
            }
            placeholder="Leave blank for unlimited"
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 transition focus:border-[#23a5fe]/60 focus:outline-none"
          />
        </label>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
            Timezone
          </span>
          <input
            type="text"
            value={draft.timezone}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, timezone: event.target.value }))
            }
            placeholder="America/New_York"
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 transition focus:border-[#23a5fe]/60 focus:outline-none"
            required
          />
          <p className="text-xs text-white/50">
            Use an IANA timezone so invites display the correct local time.
          </p>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
            Status
          </span>
          <select
            value={draft.status}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                status: event.target.value as EventDraft["status"],
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition focus:border-[#23a5fe]/60 focus:outline-none"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 px-4 py-3 text-sm text-[#ffb4b4]">
          <FiAlertCircle /> {error}
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
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#23a5fe] px-6 py-3 text-sm font-semibold text-[#03162d] shadow-[0_18px_45px_rgba(35,165,254,0.45)] transition hover:scale-[1.01] hover:bg-[#3eb6fd] disabled:cursor-not-allowed disabled:bg-[#1d466c] disabled:text-white/60"
        >
          {saving ? <FiLoader className="animate-spin" /> : <FiCheck />}
          Save changes
        </button>
      </div>
    </form>
  );
}

export function EventDetail({
  event,
  registrations,
  shareBaseUrl,
  role,
}: EventDetailProps) {
  const [currentEvent, setCurrentEvent] = useState<EventWithStats>(event);
  const [registrationList, setRegistrationList] =
    useState<EventRegistration[]>(registrations);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    setCurrentEvent(event);
  }, [event]);

  useEffect(() => {
    setRegistrationList(registrations);
  }, [registrations]);

  const formatted = useMemo(
    () => formatDateTime(currentEvent),
    [currentEvent],
  );
  const location = useMemo(
    () => formatLocation(currentEvent),
    [currentEvent],
  );
  const shareUrl =
    currentEvent.status === "published" && shareBaseUrl
      ? `${shareBaseUrl}/${currentEvent.shareId}`
      : null;
  const canEdit = role !== "guest";

  useEffect(() => {
    setCopied(false);
  }, [shareUrl]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timer = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (copyError) {
      console.error(copyError);
      setFeedback({
        type: "error",
        text: "Unable to copy share link. Try again.",
      });
    }
  }, [shareUrl]);

  const handleCoverUpdated = useCallback((nextCover: string | null) => {
    setCurrentEvent((prev) => ({ ...prev, coverImageUrl: nextCover }));
  }, []);

  const handleFeedback = useCallback((type: Feedback["type"], text: string) => {
    setFeedback({ type, text });
  }, []);

  const handleSaved = useCallback(
    (
      updatedEvent: EventWithStats,
      updatedRegistrations: EventRegistration[],
    ) => {
      setCurrentEvent(updatedEvent);
      setRegistrationList(updatedRegistrations);
      setEditing(false);
    },
    [],
  );

  return (
    <div className="space-y-10">
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#03162d] via-[#052041] to-[#0b3670] p-8 text-white shadow-[0_60px_160px_rgba(3,22,45,0.6)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <Link
              href="/app/event-scheduler"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.4em] text-[#3eb6fd]"
            >
              <FiArrowLeft /> Back to events
            </Link>
            <h1 className="text-4xl font-semibold tracking-tight">
              {currentEvent.title}
            </h1>
            {currentEvent.description ? (
              <p className="max-w-2xl text-sm text-white/75">
                {currentEvent.description}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3 text-xs text-white/70">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 capitalize">
                <FiShield /> {statusLabel(currentEvent.status)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                <FiUsers /> {currentEvent.registrationCount} registered
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                <FiCheckCircle /> {currentEvent.checkedInCount} checked in
              </span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 rounded-3xl border border-white/15 bg-white/10 px-6 py-5 text-sm text-white lg:items-end">
            <p className="flex items-center gap-2 font-semibold">
              <FiCalendar /> {formatted.date}
            </p>
            <p className="flex items-center gap-2 text-white/70">
              <FiCalendar /> {formatted.timeRange}
            </p>
            <p className="flex items-center gap-2 text-white/70">
              <FiMapPin /> {location}
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-white/60">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                Capacity:{" "}
                {currentEvent.capacity === null
                  ? "Unlimited"
                  : `${currentEvent.capacity} seats`}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                Spots left:{" "}
                {currentEvent.capacityRemaining === null
                  ? "Unlimited"
                  : Math.max(currentEvent.capacityRemaining, 0)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {shareUrl ? (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 rounded-full border border-[#23a5fe]/50 bg-[#23a5fe]/20 px-4 py-2 text-xs font-semibold text-[#23a5fe] transition hover:bg-[#23a5fe]/30"
                >
                  {copied ? (
                    <>
                      <FiCheck /> Copied
                    </>
                  ) : (
                    <>
                      <FiCopy /> Copy public link
                    </>
                  )}
                </button>
              ) : (
                <span className="text-xs text-white/50">
                  Publish this event to generate a share link.
                </span>
              )}
              <Link
                href={`/app/event-scheduler/${currentEvent.id}/check-in`}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-[#3eb6fd]/60 hover:bg-[#062951]"
              >
                <FiExternalLink /> Open check-in
              </Link>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => setEditing((value) => !value)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                    editing
                      ? "border-[#23a5fe]/60 bg-[#23a5fe]/20 text-[#23a5fe]"
                      : "border-white/15 bg-white/10 text-white hover:border-[#3eb6fd]/60 hover:bg-[#062951]"
                  }`}
                >
                  {editing ? <FiX /> : <FiEdit />}{" "}
                  {editing ? "Close editor" : "Edit details"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {feedback ? (
        <div
          className={`flex items-center gap-2 rounded-3xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
              : "border-[#ff6b6b]/40 bg-[#ff6b6b]/10 text-[#ffb4b4]"
          }`}
        >
          {feedback.type === "success" ? <FiCheck /> : <FiAlertCircle />}
          <span>{feedback.text}</span>
        </div>
      ) : null}

      <EventCoverManager
        event={currentEvent}
        canEdit={canEdit}
        onCoverUpdated={handleCoverUpdated}
        onFeedback={handleFeedback}
      />

      {canEdit && editing ? (
        <EventEditForm
          event={currentEvent}
          onCancel={() => setEditing(false)}
          onSaved={handleSaved}
          onFeedback={handleFeedback}
        />
      ) : null}

      <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_45px_120px_rgba(3,22,45,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Registrations</h2>
          {role === "guest" ? (
            <p className="text-xs text-white/40">
              You have read-only access to registration details.
            </p>
          ) : null}
        </div>

        {registrationList.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/5 py-12 text-center text-white/60">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#3eb6fd]/40 bg-[#23a5fe]/10 text-[#3eb6fd]">
              <FiUsers className="text-xl" />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-white/70">
                No attendees yet. Share the event link to start collecting registrations.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-white/40">
                  <th className="px-4 py-3">Attendee</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3">Check-in</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {registrationList.map((registration) => {
                  const registeredAt = new Date(registration.createdAt);
                  const registeredLabel = registeredAt.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  const checkedInLabel = registration.checkedInAt
                    ? new Date(registration.checkedInAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "—";
                  const statusText =
                    registration.status === "checked_in"
                      ? "Checked in"
                      : registration.status === "waitlisted"
                      ? "Waitlisted"
                      : registration.status === "cancelled"
                      ? "Cancelled"
                      : "Registered";

                  return (
                    <tr key={registration.id} className="transition hover:bg-white/5">
                      <td className="px-4 py-4 text-white">
                        <div className="font-semibold">
                          {registration.attendeeName}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-white/70">
                        <div>{registration.attendeeEmail}</div>
                        {registration.attendeePhone ? (
                          <div className="text-xs text-white/40">
                            {registration.attendeePhone}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                            registration.status === "checked_in"
                              ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
                              : registration.status === "cancelled"
                              ? "border-[#ff6b6b]/30 bg-[#ff6b6b]/10 text-[#ff9d9d]"
                              : registration.status === "waitlisted"
                              ? "border-[#facc15]/40 bg-[#facc15]/10 text-[#fde68a]"
                              : "border-white/10 bg-white/10 text-white/70"
                          }`}
                        >
                          {statusText}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-white/70">{registeredLabel}</td>
                      <td className="px-4 py-4 text-white/70">{checkedInLabel}</td>
                      <td className="px-4 py-4 text-white/60">
                        {registration.notes ? (
                          <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
                            {registration.notes}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

'use client';

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TeamMemberRole = "admin" | "guest";

type TeamMemberInput = {
  email: string;
  role: TeamMemberRole;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const roleOptions: Array<{ value: TeamMemberRole; label: string; description: string }> = [
  {
    value: "admin",
    label: "Admin",
    description: "Manage workflows, approve automations, and view workspace settings.",
  },
  {
    value: "guest",
    label: "Guest",
    description: "Collaborate inside Alias with limited permissions.",
  },
];

function normalizeMembers(members: TeamMemberInput[]) {
  const unique = new Map<string, TeamMemberInput>();
  for (const member of members) {
    const email = member.email.trim().toLowerCase();
    if (!email || !EMAIL_REGEX.test(email)) continue;
    if (!unique.has(email)) {
      unique.set(email, {
        email,
        role: member.role,
      });
    }
  }
  return Array.from(unique.values());
}

export function TeamInviteForm() {
  const router = useRouter();
  const [members, setMembers] = useState<TeamMemberInput[]>([{ email: "", role: "guest" }]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const preparedMembers = useMemo(() => normalizeMembers(members), [members]);

  function updateMember(index: number, field: keyof TeamMemberInput, value: string) {
    setMembers((prev) =>
      prev.map((member, i) =>
        i === index
          ? {
              ...member,
              [field]: field === "role" ? (value === "admin" ? "admin" : "guest") : value,
            }
          : member,
      ),
    );
  }

  function addMember() {
    setMembers((prev) => [...prev, { email: "", role: "guest" }]);
  }

  function removeMember(index: number) {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    const normalized = normalizeMembers(members);

    if (normalized.length === 0) {
      setError("Add at least one teammate email.");
      return;
    }

    if (normalized.length > 20) {
      setError("You can invite up to 20 teammates at a time.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/onboarding/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members: normalized }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Unable to send invites.");
      }

      setSuccess("Invites sent! We’ll refresh your team list.");

      setTimeout(() => {
        router.push("/app/team");
        router.refresh();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send invites.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-full flex-col space-y-6">
      <div className="rounded-3xl border border-white/10 bg-neutral-900/70 px-8 py-10 text-neutral-200 shadow-[0_20px_70px_rgba(8,20,38,0.45)]">
        <p className="text-xs uppercase tracking-[0.35em] text-[#3eb6fd]">Invite teammates</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Send new invites</h1>
        <p className="mt-3 max-w-2xl text-sm text-neutral-400">
          Add teammate emails and choose the right role. Admins can manage workflows, guests can collaborate
          inside Alias with limited permissions.
        </p>
      </div>

      <div className="flex-1 rounded-3xl border border-white/10 bg-neutral-900/60 p-6 text-neutral-100 shadow-[0_12px_40px_rgba(7,18,34,0.4)]">
        <div className="space-y-4">
          {members.map((member, index) => (
            <div
              key={`member-${index}`}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-900/50 p-4 md:flex-row md:items-center"
            >
              <div className="flex-1">
                <label className="block text-xs uppercase tracking-[0.3em] text-neutral-500">
                  Teammate email
                </label>
                <input
                  type="email"
                  value={member.email}
                  onChange={(event) => updateMember(index, "email", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40"
                  placeholder="teammate@company.com"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs uppercase tracking-[0.3em] text-neutral-500">
                  Role
                </label>
                <select
                  value={member.role}
                  onChange={(event) => updateMember(index, "role", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-neutral-500">
                  {roleOptions.find((option) => option.value === member.role)?.description}
                </p>
              </div>
              {members.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeMember(index)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-neutral-300 transition hover:border-rose-400 hover:text-rose-200"
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={addMember}
            className="rounded-full border border-dashed border-white/20 px-4 py-2 text-sm text-neutral-300 transition hover:border-[#23a5fe] hover:text-white"
          >
            + Add another teammate
          </button>
          <span className="text-xs text-neutral-500">Up to 20 invites per batch</span>
        </div>

        {preparedMembers.length > 0 ? (
          <div className="mt-4 text-xs text-[#3eb6fd]">
            {preparedMembers.length} invite
            {preparedMembers.length === 1 ? "" : "s"} ready to send
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-gradient-to-r from-[#0064d6] via-[#23a5fe] to-[#3eb6fd] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(35,165,254,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Sending invites…" : "Send invites"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/app/team")}
            className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-neutral-300 transition hover:border-white/30 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

'use client';

import { useState, useTransition } from "react";
import Link from "next/link";

type ViewerRole = "owner" | "admin" | "guest";

type BusinessInfo = {
  id: string;
  name: string;
  industry: string | null;
  companySize: string | null;
  location: string | null;
};

type TeamMember = {
  id: string;
  email: string;
  name: string | null;
  role: ViewerRole;
  inviteStatus: "pending" | "accepted" | "declined";
  invitedAt: string;
  joinedAt: string | null;
};

type Props = {
  viewerRole: ViewerRole;
  business: BusinessInfo;
  initialMembers: TeamMember[];
};

function roleOptions(viewerRole: ViewerRole, memberRole: ViewerRole) {
  if (memberRole === "owner") {
    return [];
  }
  const baseOptions: Array<{ value: ViewerRole; label: string }> = [
    { value: "admin", label: "Admin" },
    { value: "guest", label: "Guest" },
  ];

  if (viewerRole === "owner") {
    return baseOptions;
  }

  if (viewerRole === "admin" && memberRole === "guest") {
    return baseOptions;
  }

  return [];
}

function canRemove(viewerRole: ViewerRole, memberRole: ViewerRole) {
  if (viewerRole === "owner") {
    return memberRole !== "owner";
  }

  if (viewerRole === "admin") {
    return memberRole === "guest";
  }

  return false;
}

function canTransferOwnership(viewerRole: ViewerRole, memberRole: ViewerRole, inviteStatus: TeamMember["inviteStatus"]) {
  if (viewerRole !== "owner") {
    return false;
  }
  return memberRole !== "owner" && inviteStatus === "accepted";
}

function roleLabel(role: ViewerRole) {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    default:
      return "Guest";
  }
}

function statusBadge(inviteStatus: TeamMember["inviteStatus"]) {
  switch (inviteStatus) {
    case "accepted":
      return { label: "Active", className: "bg-emerald-500/10 text-emerald-300" };
    case "declined":
      return { label: "Declined", className: "bg-rose-500/10 text-rose-300" };
    default:
      return { label: "Pending invite", className: "bg-amber-500/10 text-amber-300" };
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TeamManager({ viewerRole, business, initialMembers }: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetFeedback() {
    setMessage(null);
    setError(null);
  }

  async function updateRole(memberId: string, nextRole: ViewerRole) {
    resetFeedback();
    setPendingMemberId(memberId);
    try {
      const response = await fetch(`/api/team/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Unable to update role.");
      }

      const payload = await response.json();
      setMembers((prev) =>
        prev.map((member) =>
          member.id === memberId
            ? {
                ...member,
                role: payload.role as ViewerRole,
                inviteStatus: payload.inviteStatus as TeamMember["inviteStatus"],
                joinedAt: payload.joinedAt ?? member.joinedAt,
              }
            : member,
        ),
      );
      setMessage("Role updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update role.");
    } finally {
      setPendingMemberId(null);
    }
  }

  async function removeMember(memberId: string) {
    resetFeedback();
    setPendingMemberId(memberId);
    try {
      const response = await fetch(`/api/team/members/${memberId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Unable to remove member.");
      }

      setMembers((prev) => prev.filter((member) => member.id !== memberId));
      setMessage("Member removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove member.");
    } finally {
      setPendingMemberId(null);
    }
  }

  function confirmTransfer(memberId: string, displayName: string) {
    resetFeedback();
    setPendingMemberId(memberId);
    startTransition(async () => {
      try {
        const response = await fetch("/api/team/transfer-owner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Unable to transfer ownership.");
        }

        setMessage(`Ownership transferred to ${displayName}. Reloading…`);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to transfer ownership.");
        setPendingMemberId(null);
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-neutral-900/70 px-8 py-10 text-neutral-200 shadow-[0_20px_70px_rgba(8,20,38,0.45)]">
        <p className="text-xs uppercase tracking-[0.35em] text-[#3eb6fd]">Team roster</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">People in your workspace</h1>
        <p className="mt-3 max-w-2xl text-sm text-neutral-400">
          Manage the collaborators who have access to Alias. Invite new teammates, assign the right roles,
          and monitor invite status from one place.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-neutral-300">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">Workspace</span>
            <p className="mt-1 font-medium text-white">{business.name}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">Team size</span>
            <p className="mt-1">
              {business.companySize ?? `${members.length} teammate${members.length === 1 ? "" : "s"}`}
            </p>
          </div>
          {business.industry ? (
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">Industry</span>
              <p className="mt-1">{business.industry}</p>
            </div>
          ) : null}
          {business.location ? (
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">Location</span>
              <p className="mt-1">{business.location}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6 text-neutral-100 shadow-[0_12px_40px_rgba(7,18,34,0.4)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Team members</h2>
            <p className="text-sm text-neutral-400">
              Roles control access. Owners can invite, Admins approve automations, Guests collaborate.
            </p>
          </div>
          {viewerRole !== "guest" ? (
            <div className="flex items-center gap-3 text-sm">
              <Link
                href="/app/team/invite"
                className="inline-flex items-center gap-2 rounded-full border border-[#23a5fe]/40 bg-[#23a5fe]/10 px-4 py-2 font-medium text-[#99d6ff] transition hover:border-[#23a5fe]/70 hover:text-white"
              >
                Invite teammates
              </Link>
            </div>
          ) : null}
        </div>

        {message ? (
          <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/5">
          <table className="min-w-full divide-y divide-white/5 text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.25em] text-neutral-400">
              <tr className="text-left">
                <th className="px-5 py-3 font-medium">Member</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Invited</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                {viewerRole !== "guest" ? <th className="px-5 py-3 font-medium text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-neutral-200">
              {members.length === 0 ? (
                <tr>
                  <td className="px-5 py-4 text-neutral-400" colSpan={viewerRole === "guest" ? 5 : 6}>
                    No teammates yet. Invite collaborators to share this workspace.
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const status = statusBadge(member.inviteStatus);
                  const editableRoles = roleOptions(viewerRole, member.role);
                  const disableActions = isPending && pendingMemberId === member.id;

                  return (
                    <tr key={member.id} className="hover:bg-white/5">
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-white">{member.name ?? member.email}</span>
                          <span className="text-xs text-neutral-400">{member.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {editableRoles.length > 0 ? (
                          <select
                            value={member.role}
                            onChange={(event) => updateRole(member.id, event.target.value as ViewerRole)}
                            disabled={disableActions}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white focus:border-[#23a5fe] focus:outline-none"
                          >
                            {[
                              { value: member.role, label: roleLabel(member.role) },
                              ...editableRoles.filter((option) => option.value !== member.role),
                            ].map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white">
                            <span className="inline-block h-2 w-2 rounded-full bg-[#3eb6fd]" />
                            {roleLabel(member.role)}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-neutral-300">{formatDate(member.invitedAt)}</td>
                      <td className="px-5 py-4 text-neutral-300">{formatDate(member.joinedAt)}</td>
                      {viewerRole !== "guest" ? (
                        <td className="px-5 py-4 text-right">
                          <div className="flex flex-col items-end gap-2 text-xs text-neutral-300">
                            {canTransferOwnership(viewerRole, member.role, member.inviteStatus) ? (
                              <button
                                type="button"
                                disabled={disableActions}
                                className="rounded-full border border-[#23a5fe]/50 px-3 py-1 font-medium text-[#23a5fe] transition hover:border-[#23a5fe] hover:text-white disabled:opacity-60"
                                onClick={() => {
                                  const confirmed = window.confirm(
                                    `Transfer ownership to ${member.name ?? member.email}? Your role will change to admin.`,
                                  );
                                  if (confirmed) {
                                    confirmTransfer(member.id, member.name ?? member.email);
                                  }
                                }}
                              >
                                Transfer ownership
                              </button>
                            ) : null}
                            {canRemove(viewerRole, member.role) ? (
                              <button
                                type="button"
                                disabled={disableActions}
                                className="rounded-full border border-white/10 px-3 py-1 font-medium text-neutral-300 transition hover:border-rose-400 hover:text-rose-200 disabled:opacity-60"
                                onClick={() => {
                                  const confirmed = window.confirm(
                                    `Remove ${member.name ?? member.email} from this workspace?`,
                                  );
                                  if (confirmed) {
                                    void removeMember(member.id);
                                  }
                                }}
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

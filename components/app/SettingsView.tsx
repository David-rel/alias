'use client';

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type ViewerRole = "owner" | "admin" | "guest";

type UserProfileState = {
  email: string;
  name: string | null;
  phoneNumber: string | null;
  timezone: string | null;
  location: string | null;
  emailVerified: boolean;
  profileImageUrl: string | null;
};

type BusinessState = {
  id: string;
  name: string | null;
  businessCategory: string | null;
  industry: string | null;
  description: string | null;
  logoPath: string | null;
  companySize: string | null;
  location: string | null;
} | null;

type PlanState = {
  planId: string;
  planName: string;
  status: string;
  paymentProvider: string | null;
  currentPeriodEnd: string | null;
} | null;

type IntegrationState = {
  id: string;
  key: string;
  label: string;
  status: string;
  updatedAt: string;
}[];

type SettingsViewProps = {
  user: UserProfileState;
  business: BusinessState;
  viewerRole: ViewerRole;
  plan: PlanState;
  integrations: IntegrationState;
  timezoneOptions: string[];
  canDeleteAccount: boolean;
};

function sectionCard(classes = "") {
  return `rounded-3xl border border-white/10 bg-neutral-900/60 p-6 text-neutral-100 shadow-[0_16px_50px_rgba(6,18,34,0.45)] ${classes}`;
}

function actionButton(disabled?: boolean) {
  return `inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition ${
    disabled
      ? "border border-white/10 bg-white/10 text-neutral-500 cursor-not-allowed"
      : "border border-[#23a5fe]/60 bg-gradient-to-r from-[#004f94] via-[#0f6dc1] to-[#23a5fe] text-white hover:brightness-110"
  }`;
}

export function SettingsView({
  user,
  business,
  viewerRole,
  plan,
  integrations,
  timezoneOptions,
  canDeleteAccount,
}: SettingsViewProps) {
  const router = useRouter();

  const [profileValues, setProfileValues] = useState({
    name: user.name ?? "",
    phoneNumber: user.phoneNumber ?? "",
    timezone: user.timezone ?? "",
    location: user.location ?? "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [emailValue, setEmailValue] = useState(user.email);
  const [emailVerified, setEmailVerified] = useState(user.emailVerified);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [passwordValues, setPasswordValues] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [profileImageUrl, setProfileImageUrl] = useState(user.profileImageUrl);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [businessValues, setBusinessValues] = useState({
    name: business?.name ?? "",
    businessCategory: business?.businessCategory ?? "",
    industry: business?.industry ?? "",
    description: business?.description ?? "",
    companySize: business?.companySize ?? "",
    location: business?.location ?? "",
  });
  const [businessLogoPath, setBusinessLogoPath] = useState(business?.logoPath ?? null);
  const [businessSaving, setBusinessSaving] = useState(false);
  const [businessMessage, setBusinessMessage] = useState<string | null>(null);
  const [businessError, setBusinessError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const businessLogoInputRef = useRef<HTMLInputElement | null>(null);

  const timezoneChoices = useMemo(() => {
    if (!timezoneOptions?.length) {
      return [];
    }
    return [...timezoneOptions].sort((a, b) => a.localeCompare(b));
  }, [timezoneOptions]);

  function resetProfileFeedback() {
    setProfileMessage(null);
    setProfileError(null);
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetProfileFeedback();
    setProfileSaving(true);

    try {
      const response = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileValues),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Unable to save profile.");
      }

      const payload = await response.json();
      setProfileMessage("Profile updated.");
      setProfileValues((prev) => ({
        ...prev,
        name: payload.profile?.name ?? prev.name,
        phoneNumber: payload.profile?.phoneNumber ?? prev.phoneNumber,
        timezone: payload.profile?.timezone ?? prev.timezone,
        location: payload.profile?.location ?? prev.location,
      }));
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to save profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  function resetEmailFeedback() {
    setEmailMessage(null);
    setEmailError(null);
  }

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetEmailFeedback();
    setEmailSaving(true);

    try {
      const response = await fetch("/api/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Unable to update email.");
      }

      const payload = await response.json();
      setEmailMessage("Check your inbox to verify the new email.");
      setEmailVerified(false);
      setEmailValue(payload.email ?? emailValue);
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : "Unable to update email.");
    } finally {
      setEmailSaving(false);
    }
  }

  function resetPasswordFeedback() {
    setPasswordMessage(null);
    setPasswordError(null);
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetPasswordFeedback();
    setPasswordSaving(true);

    try {
      const response = await fetch("/api/settings/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordValues),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Unable to update password.");
      }

      setPasswordMessage("Password updated.");
      setPasswordValues({
        currentPassword: "",
        newPassword: "",
      });
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Unable to update password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function uploadAvatar(file: File | null, remove = false) {
    setAvatarError(null);
    setAvatarSaving(true);
    try {
      const formData = new FormData();
      if (remove) {
        formData.set("remove", "true");
      } else if (file) {
        formData.set("file", file);
      } else {
        setAvatarSaving(false);
        return;
      }

      const response = await fetch("/api/settings/profile/picture", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Unable to update profile photo.");
      }

      const payload = await response.json();
      setProfileImageUrl(payload.profileImageUrl ?? null);
      router.refresh();
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : "Unable to update profile photo.");
    } finally {
      setAvatarSaving(false);
    }
  }

  async function uploadBusinessLogo(file: File | null, remove = false) {
    if (!business) return;
    setBusinessError(null);
    setBusinessSaving(true);
    try {
      const formData = new FormData();
      formData.set("businessName", businessValues.name);
      formData.set("businessCategory", businessValues.businessCategory);
      formData.set("industry", businessValues.industry);
      formData.set("description", businessValues.description);
      formData.set("companySize", businessValues.companySize);
      formData.set("location", businessValues.location);
      formData.set("removeLogo", remove ? "true" : "false");
      if (file) {
        formData.set("logo", file);
      }

      const response = await fetch("/api/settings/business", {
        method: "PATCH",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Unable to update business settings.");
      }

      const payload = await response.json();
      setBusinessLogoPath(payload.business?.logoPath ?? null);
      setBusinessValues((prev) => ({
        ...prev,
        name: payload.business?.name ?? prev.name,
        businessCategory: payload.business?.businessCategory ?? prev.businessCategory,
        industry: payload.business?.industry ?? prev.industry,
        description: payload.business?.description ?? prev.description,
        companySize: payload.business?.companySize ?? prev.companySize,
        location: payload.business?.location ?? prev.location,
      }));
      setBusinessMessage("Business details updated.");
      router.refresh();
    } catch (error) {
      setBusinessError(error instanceof Error ? error.message : "Unable to update business settings.");
    } finally {
      setBusinessSaving(false);
    }
  }

  async function handleBusinessSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!business) {
      setBusinessError("Create a workspace before updating business settings.");
      return;
    }
    setBusinessMessage(null);
    setBusinessError(null);
    await uploadBusinessLogo(null, false);
  }

  async function handleDeleteAccount() {
    if (!canDeleteAccount) return;
    const confirmed = window.confirm(
      "Delete your Alias account? This cannot be undone and you’ll lose access immediately.",
    );
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch("/api/settings/account", {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Unable to delete account.");
      }

      window.location.href = "/auth/login";
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to delete account.");
    }
  }

  async function handleDeleteBusiness() {
    if (!business || viewerRole !== "owner") return;
    const confirmed = window.confirm(
      "Delete this workspace? Team members will lose access and this cannot be undone.",
    );
    if (!confirmed) return;

    try {
      const response = await fetch("/api/settings/business", {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Unable to delete workspace.");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to delete workspace.");
    }
  }

  function handleIntegrationAction(label: string) {
    alert(`${label} integrations are coming soon.`);
  }

  function handleBillingAction(action: "manage" | "upgrade" | "cancel") {
    switch (action) {
      case "manage":
        alert("Billing portal will open here soon.");
        break;
      case "upgrade":
        alert("Upgrade options are coming soon.");
        break;
      case "cancel":
        alert("Contact support to cancel during the preview.");
        break;
      default:
        alert("Billing actions coming soon.");
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-neutral-900/70 px-8 py-10 text-neutral-100 shadow-[0_24px_80px_rgba(6,18,34,0.5)]">
        <p className="text-xs uppercase tracking-[0.4em] text-[#3eb6fd]">Account settings</p>
        <h1 className="mt-3 text-3xl font-semibold">Manage your Alias profile and workspace</h1>
        <p className="mt-4 max-w-3xl text-sm text-neutral-300">
          Update personal details, keep your security information fresh, and manage workspace preferences in one place.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
        <div className={sectionCard("space-y-6")}>
          <div>
            <h2 className="text-lg font-semibold text-white">Profile photo</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Upload a square image (PNG, JPG, WEBP, or SVG). We recommend at least 240×240px.
            </p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-neutral-800">
              {profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-neutral-500">
                  {(user.name ?? user.email)
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2 text-sm text-neutral-300">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={actionButton(avatarSaving)}
                disabled={avatarSaving}
              >
                {avatarSaving ? "Uploading…" : "Upload photo"}
              </button>
              <button
                type="button"
                onClick={() => uploadAvatar(null, true)}
                className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-2 text-sm text-neutral-400 transition hover:border-rose-400 hover:text-rose-200"
                disabled={avatarSaving || !profileImageUrl}
              >
                Remove photo
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  uploadAvatar(file);
                }
              }}
            />
            {avatarError ? (
              <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
                {avatarError}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6">
          <form onSubmit={handleProfileSubmit} className={sectionCard("space-y-5")}>
            <div>
              <h2 className="text-lg font-semibold text-white">Profile details</h2>
              <p className="mt-1 text-sm text-neutral-400">
                This information appears on team invites, notifications, and shared assets.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-neutral-300">
                <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">Full name</span>
                <input
                  type="text"
                  value={profileValues.name}
                  onChange={(event) =>
                    setProfileValues((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40"
                  placeholder="Your name"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-neutral-300">
                <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">Phone</span>
                <input
                  type="tel"
                  value={profileValues.phoneNumber}
                  onChange={(event) =>
                    setProfileValues((prev) => ({ ...prev, phoneNumber: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40"
                  placeholder="+1 (555) 123-4567"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-neutral-300">
                <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">Timezone</span>
                <select
                  value={profileValues.timezone}
                  onChange={(event) =>
                    setProfileValues((prev) => ({ ...prev, timezone: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40"
                >
                  <option value="">Select timezone</option>
                  {timezoneChoices.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-neutral-300">
                <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">Location</span>
                <input
                  type="text"
                  value={profileValues.location}
                  onChange={(event) =>
                    setProfileValues((prev) => ({ ...prev, location: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40"
                  placeholder="City, Country"
                />
              </label>
            </div>

            {profileMessage ? (
              <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
                {profileMessage}
              </div>
            ) : null}
            {profileError ? (
              <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
                {profileError}
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-3">
              <button type="submit" className={actionButton(profileSaving)} disabled={profileSaving}>
                {profileSaving ? "Saving…" : "Save profile"}
              </button>
            </div>
          </form>

          <form onSubmit={handleEmailSubmit} className={sectionCard("space-y-5")}>
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-white">Email address</h2>
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-neutral-500">
                <span>Status:</span>
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                    emailVerified
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-amber-500/10 text-amber-300"
                  }`}
                >
                  {emailVerified ? "Verified" : "Pending verification"}
                </span>
              </div>
            </div>
            <label className="flex flex-col gap-2 text-sm text-neutral-300">
              <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">Email</span>
              <input
                type="email"
                value={emailValue}
                onChange={(event) => setEmailValue(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40"
                placeholder="name@company.com"
                required
              />
            </label>

            {emailMessage ? (
              <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
                {emailMessage}
              </div>
            ) : null}
            {emailError ? (
              <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
                {emailError}
              </div>
            ) : null}

            <div className="flex justify-end">
              <button type="submit" className={actionButton(emailSaving)} disabled={emailSaving}>
                {emailSaving ? "Sending…" : "Send verification link"}
              </button>
            </div>
          </form>

          <form onSubmit={handlePasswordSubmit} className={sectionCard("space-y-5")}>
            <div>
              <h2 className="text-lg font-semibold text-white">Password</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Enter your current password to set a new one. Passwords must be at least 8 characters.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-neutral-300">
                <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">Current password</span>
                <input
                  type="password"
                  value={passwordValues.currentPassword}
                  onChange={(event) =>
                    setPasswordValues((prev) => ({ ...prev, currentPassword: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40"
                  autoComplete="current-password"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-neutral-300">
                <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">New password</span>
                <input
                  type="password"
                  value={passwordValues.newPassword}
                  onChange={(event) =>
                    setPasswordValues((prev) => ({ ...prev, newPassword: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
            </div>

            {passwordMessage ? (
              <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
                {passwordMessage}
              </div>
            ) : null}
            {passwordError ? (
              <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
                {passwordError}
              </div>
            ) : null}

            <div className="flex justify-end">
              <button type="submit" className={actionButton(passwordSaving)} disabled={passwordSaving}>
                {passwordSaving ? "Updating…" : "Update password"}
              </button>
            </div>
          </form>

          <div className={sectionCard("space-y-4 border-rose-400/20 bg-rose-900/20 text-rose-100")}>
            <div>
              <h2 className="text-lg font-semibold text-white">Danger zone</h2>
              <p className="mt-1 text-sm text-rose-100/80">
                Delete your account permanently. This removes personal data and revokes access immediately.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className={`inline-flex items-center justify-center rounded-full border px-5 py-2 text-sm font-semibold transition ${
                canDeleteAccount
                  ? "border-rose-400/60 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
                  : "border-white/10 bg-white/5 text-neutral-500 cursor-not-allowed"
              }`}
              disabled={!canDeleteAccount}
              title={
                canDeleteAccount
                  ? "Delete account"
                  : "Transfer or delete your workspace before removing your account."
              }
            >
              Delete account
            </button>
          </div>
        </div>
      </div>

      {viewerRole !== "guest" && business ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-white">Workspace settings</h2>
            <p className="max-w-3xl text-sm text-neutral-400">
              Update the public details for your workspace. Admins can manage these fields; only owners can delete the workspace.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
            <div className={sectionCard("space-y-6")}>
              <div>
                <h3 className="text-lg font-semibold text-white">Workspace logo</h3>
                <p className="mt-1 text-sm text-neutral-400">
                  Displayed on dashboards, invites, and outgoing emails.
                </p>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-neutral-800">
                  {businessLogoPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={businessLogoPath} alt="Workspace logo" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-semibold text-neutral-500">
                      {(businessValues.name || user.name || user.email).slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2 text-sm text-neutral-300">
                  <button
                    type="button"
                    onClick={() => businessLogoInputRef.current?.click()}
                    className={actionButton(businessSaving)}
                    disabled={businessSaving}
                  >
                    {businessSaving ? "Uploading…" : "Upload logo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => uploadBusinessLogo(null, true)}
                    className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-2 text-sm text-neutral-400 transition hover:border-rose-400 hover:text-rose-200"
                    disabled={businessSaving || !businessLogoPath}
                  >
                    Remove logo
                  </button>
                </div>
                <input
                  ref={businessLogoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) {
                      uploadBusinessLogo(file);
                    }
                  }}
                />
              </div>
            </div>

            <form onSubmit={handleBusinessSubmit} className={sectionCard("space-y-5")}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-neutral-300">
                  <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">Business name</span>
                  <input
                    type="text"
                    value={businessValues.name}
                    onChange={(event) =>
                      setBusinessValues((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40"
                    placeholder="Alias Studio"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-neutral-300">
                  <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">Category</span>
                  <input
                    type="text"
                    value={businessValues.businessCategory}
                    onChange={(event) =>
                      setBusinessValues((prev) => ({
                        ...prev,
                        businessCategory: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40"
                    placeholder="Marketing agency"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-neutral-300">
                  <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">Industry</span>
                  <input
                    type="text"
                    value={businessValues.industry}
                    onChange={(event) =>
                      setBusinessValues((prev) => ({ ...prev, industry: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40"
                    placeholder="Software"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-neutral-300">
                  <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">Team size</span>
                  <input
                    type="text"
                    value={businessValues.companySize}
                    onChange={(event) =>
                      setBusinessValues((prev) => ({ ...prev, companySize: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40"
                    placeholder="1-10"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm text-neutral-300">
                <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">Location</span>
                <input
                  type="text"
                  value={businessValues.location}
                  onChange={(event) =>
                    setBusinessValues((prev) => ({ ...prev, location: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40"
                  placeholder="Remote"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-neutral-300">
                <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">Description</span>
                <textarea
                  value={businessValues.description}
                  onChange={(event) =>
                    setBusinessValues((prev) => ({ ...prev, description: event.target.value }))
                  }
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40"
                  placeholder="Share a quick overview of what your team does."
                />
              </label>

              {businessMessage ? (
                <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
                  {businessMessage}
                </div>
              ) : null}
              {businessError ? (
                <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
                  {businessError}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => handleIntegrationAction("Workspace logs")}
                    className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm text-neutral-300 transition hover:border-[#23a5fe] hover:text-white"
                  >
                    View logs
                  </button>
                  <button
                    type="button"
                    onClick={() => handleIntegrationAction("Data export")}
                    className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm text-neutral-300 transition hover:border-[#23a5fe] hover:text-white"
                  >
                    Export data
                  </button>
                </div>
                <button
                  type="submit"
                  className={actionButton(businessSaving)}
                  disabled={businessSaving}
                >
                  {businessSaving ? "Saving…" : "Save workspace"}
                </button>
              </div>
            </form>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className={sectionCard("space-y-4")}>
              <div>
                <h3 className="text-lg font-semibold text-white">Payment plan</h3>
                <p className="mt-1 text-sm text-neutral-400">
                  Monitor billing status, invoices, and payment methods.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5">
                <dl className="space-y-2 text-sm text-neutral-300">
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Plan</dt>
                    <dd className="font-semibold text-white">
                      {plan?.planName ?? "Free"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Status</dt>
                    <dd
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        (plan?.status ?? "active") === "active"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      {(plan?.status ?? "active").toUpperCase()}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Next renewal</dt>
                    <dd className="font-medium text-neutral-100">
                      {plan?.currentPeriodEnd
                        ? new Date(plan.currentPeriodEnd).toLocaleDateString()
                        : "Not scheduled"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Payment method</dt>
                    <dd className="font-medium text-neutral-100">
                      {plan?.paymentProvider ? `${plan.paymentProvider} •••• 4242` : "None saved"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => handleBillingAction("manage")}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-neutral-300 transition hover:border-[#23a5fe] hover:text-white"
                >
                  Manage billing
                </button>
                <button
                  type="button"
                  onClick={() => handleBillingAction("upgrade")}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-neutral-300 transition hover:border-[#23a5fe] hover:text-white"
                >
                  Upgrade
                </button>
                <button
                  type="button"
                  onClick={() => handleBillingAction("cancel")}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-neutral-300 transition hover:border-[#23a5fe] hover:text-white"
                >
                  Cancel plan
                </button>
              </div>
            </div>

            <div className={sectionCard("space-y-4")}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Integrations</h3>
                  <p className="mt-1 text-sm text-neutral-400">
                    Connect your favorite tools. Everything is inactive while we’re in preview.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-neutral-400">
                  {integrations.length} integrations
                </span>
              </div>

              <ul className="space-y-3">
                {integrations.map((integration) => (
                  <li
                    key={integration.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-neutral-900/40 px-4 py-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">{integration.label}</span>
                      <span className="text-xs text-neutral-500">
                        Updated {new Date(integration.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleIntegrationAction(integration.label)}
                      className="rounded-full border border-white/10 px-4 py-2 text-xs text-neutral-300 transition hover:border-[#23a5fe] hover:text-white"
                    >
                      {integration.status === "active" ? "Manage" : "Connect"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={sectionCard("flex flex-col gap-4 border-rose-400/20 bg-rose-900/20 text-rose-100")}>
            <div>
              <h3 className="text-lg font-semibold text-white">Delete workspace</h3>
              <p className="mt-1 text-sm text-rose-100/80">
                Remove this workspace and all related data. Team members will lose access immediately.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDeleteBusiness}
              className={`inline-flex items-center justify-center rounded-full border px-5 py-2 text-sm font-semibold transition ${
                viewerRole === "owner"
                  ? "border-rose-400/60 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
                  : "border-white/10 bg-white/5 text-neutral-500 cursor-not-allowed"
              }`}
              disabled={viewerRole !== "owner"}
              title={
                viewerRole === "owner"
                  ? "Delete workspace"
                  : "Only workspace owners can delete the workspace."
              }
            >
              Delete workspace
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

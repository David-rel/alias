"use client";

import { useEffect, useState } from "react";

type UserPreferences = {
  theme: "light" | "dark";
  language: string;
  notifications: {
    sms: boolean;
    email: boolean;
    push: boolean;
  };
  marketing: {
    email_opt_in: boolean;
    organization_announcements: boolean;
  };
  accessibility: {
    high_contrast: boolean;
    reduced_motion: boolean;
    large_text: boolean;
    screen_reader_optimized: boolean;
  };
};

const languageOptions = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Português" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "zh", label: "中文" },
];

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

export function PreferencesView() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  async function fetchPreferences() {
    try {
      const response = await fetch("/api/settings/preferences");
      if (!response.ok) throw new Error("Failed to fetch preferences");
      const data = await response.json();
      setPreferences(data);

      // Apply theme immediately when preferences load
      if (typeof window !== "undefined") {
        if (data.theme === "light") {
          document.documentElement.classList.add("light");
        } else {
          document.documentElement.classList.remove("light");
        }
        localStorage.setItem("theme", data.theme || "dark");
      }
    } catch (err) {
      setError("Failed to load preferences");
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    if (!preferences) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/settings/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save preferences");
      }

      setMessage("Preferences saved successfully!");

      // Apply theme immediately and notify other components
      if (typeof window !== "undefined") {
        if (preferences.theme === "light") {
          document.documentElement.classList.add("light");
        } else {
          document.documentElement.classList.remove("light");
        }
        localStorage.setItem("theme", preferences.theme);

        // Dispatch custom event to notify other components of theme change
        window.dispatchEvent(
          new CustomEvent("themeChange", {
            detail: { theme: preferences.theme },
          })
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save preferences"
      );
    } finally {
      setSaving(false);
    }
  }

  function updatePreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) {
    setPreferences((prev) => (prev ? { ...prev, [key]: value } : null));
  }

  function updateNestedPreference<
    K extends keyof UserPreferences,
    NK extends keyof UserPreferences[K]
  >(key: K, nestedKey: NK, value: UserPreferences[K][NK]) {
    setPreferences((prev) =>
      prev
        ? {
            ...prev,
            [key]: {
              ...(prev[key] as any),
              [nestedKey]: value,
            },
          }
        : null
    );
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <section className="rounded-3xl border border-white/10 bg-neutral-900/70 px-8 py-10 text-neutral-100 shadow-[0_24px_80px_rgba(6,18,34,0.5)]">
          <p className="text-xs uppercase tracking-[0.4em] text-[#3eb6fd]">
            User preferences
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            Customize your Alias experience
          </h1>
          <p className="mt-4 max-w-3xl text-sm text-neutral-300">
            Personalize your workspace with theme settings, notifications, and
            accessibility options.
          </p>
        </section>
        <div className="text-center text-neutral-400">
          Loading preferences...
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="space-y-8">
        <section className="rounded-3xl border border-white/10 bg-neutral-900/70 px-8 py-10 text-neutral-100 shadow-[0_24px_80px_rgba(6,18,34,0.5)]">
          <p className="text-xs uppercase tracking-[0.4em] text-[#3eb6fd]">
            User preferences
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            Customize your Alias experience
          </h1>
        </section>
        <div className="text-center text-neutral-400">
          Failed to load preferences
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-neutral-900/70 px-8 py-10 text-neutral-100 shadow-[0_24px_80px_rgba(6,18,34,0.5)]">
        <p className="text-xs uppercase tracking-[0.4em] text-[#3eb6fd]">
          User preferences
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          Customize your Alias experience
        </h1>
        <p className="mt-4 max-w-3xl text-sm text-neutral-300">
          Personalize your workspace with theme settings, notifications, and
          accessibility options.
        </p>
      </section>

      <div className="grid gap-6">
        {/* Theme & Language */}
        <div className={sectionCard("space-y-5")}>
          <div>
            <h2 className="text-lg font-semibold text-white">Appearance</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Choose how Alias looks and feels for you.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-neutral-300">
              <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">
                Theme
              </span>
              <select
                value={preferences.theme}
                onChange={(e) =>
                  updatePreference("theme", e.target.value as "light" | "dark")
                }
                className="w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-neutral-300">
              <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">
                Language
              </span>
              <select
                value={preferences.language}
                onChange={(e) => updatePreference("language", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40"
              >
                {languageOptions.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Notifications */}
        <div className={sectionCard("space-y-5")}>
          <div>
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Choose how you want to be notified about updates and activities.
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={preferences.notifications.sms}
                onChange={(e) =>
                  updateNestedPreference(
                    "notifications",
                    "sms",
                    e.target.checked
                  )
                }
                className="h-4 w-4 rounded border border-white/10 bg-neutral-900 text-[#23a5fe] focus:ring-[#23a5fe]/40"
              />
              <div>
                <span className="font-medium text-white">
                  SMS Notifications
                </span>
                <p className="text-xs text-neutral-500">
                  Receive text messages for important updates
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={preferences.notifications.email}
                onChange={(e) =>
                  updateNestedPreference(
                    "notifications",
                    "email",
                    e.target.checked
                  )
                }
                className="h-4 w-4 rounded border border-white/10 bg-neutral-900 text-[#23a5fe] focus:ring-[#23a5fe]/40"
              />
              <div>
                <span className="font-medium text-white">
                  Email Notifications
                </span>
                <p className="text-xs text-neutral-500">
                  Receive email updates about your workspace
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={preferences.notifications.push}
                onChange={(e) =>
                  updateNestedPreference(
                    "notifications",
                    "push",
                    e.target.checked
                  )
                }
                className="h-4 w-4 rounded border border-white/10 bg-neutral-900 text-[#23a5fe] focus:ring-[#23a5fe]/40"
              />
              <div>
                <span className="font-medium text-white">
                  Push Notifications
                </span>
                <p className="text-xs text-neutral-500">
                  Browser notifications for real-time updates
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Marketing */}
        <div className={sectionCard("space-y-5")}>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Marketing & Communications
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              Control what communications you receive from Alias.
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={preferences.marketing.email_opt_in}
                onChange={(e) =>
                  updateNestedPreference(
                    "marketing",
                    "email_opt_in",
                    e.target.checked
                  )
                }
                className="h-4 w-4 rounded border border-white/10 bg-neutral-900 text-[#23a5fe] focus:ring-[#23a5fe]/40"
              />
              <div>
                <span className="font-medium text-white">Marketing Emails</span>
                <p className="text-xs text-neutral-500">
                  Receive product updates, tips, and promotional content
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={preferences.marketing.organization_announcements}
                onChange={(e) =>
                  updateNestedPreference(
                    "marketing",
                    "organization_announcements",
                    e.target.checked
                  )
                }
                className="h-4 w-4 rounded border border-white/10 bg-neutral-900 text-[#23a5fe] focus:ring-[#23a5fe]/40"
              />
              <div>
                <span className="font-medium text-white">
                  Organization Announcements
                </span>
                <p className="text-xs text-neutral-500">
                  Important updates about your workspace and team
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Accessibility */}
        <div className={sectionCard("space-y-5")}>
          <div>
            <h2 className="text-lg font-semibold text-white">Accessibility</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Customize Alias to work better for your needs and preferences.
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={preferences.accessibility.high_contrast}
                onChange={(e) =>
                  updateNestedPreference(
                    "accessibility",
                    "high_contrast",
                    e.target.checked
                  )
                }
                className="h-4 w-4 rounded border border-white/10 bg-neutral-900 text-[#23a5fe] focus:ring-[#23a5fe]/40"
              />
              <div>
                <span className="font-medium text-white">High Contrast</span>
                <p className="text-xs text-neutral-500">
                  Increase contrast for better visibility
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={preferences.accessibility.reduced_motion}
                onChange={(e) =>
                  updateNestedPreference(
                    "accessibility",
                    "reduced_motion",
                    e.target.checked
                  )
                }
                className="h-4 w-4 rounded border border-white/10 bg-neutral-900 text-[#23a5fe] focus:ring-[#23a5fe]/40"
              />
              <div>
                <span className="font-medium text-white">Reduced Motion</span>
                <p className="text-xs text-neutral-500">
                  Minimize animations and transitions
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={preferences.accessibility.large_text}
                onChange={(e) =>
                  updateNestedPreference(
                    "accessibility",
                    "large_text",
                    e.target.checked
                  )
                }
                className="h-4 w-4 rounded border border-white/10 bg-neutral-900 text-[#23a5fe] focus:ring-[#23a5fe]/40"
              />
              <div>
                <span className="font-medium text-white">Large Text</span>
                <p className="text-xs text-neutral-500">
                  Increase text size throughout the interface
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={preferences.accessibility.screen_reader_optimized}
                onChange={(e) =>
                  updateNestedPreference(
                    "accessibility",
                    "screen_reader_optimized",
                    e.target.checked
                  )
                }
                className="h-4 w-4 rounded border border-white/10 bg-neutral-900 text-[#23a5fe] focus:ring-[#23a5fe]/40"
              />
              <div>
                <span className="font-medium text-white">
                  Screen Reader Optimized
                </span>
                <p className="text-xs text-neutral-500">
                  Enhanced support for assistive technologies
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={savePreferences}
            disabled={saving}
            className={actionButton(saving)}
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>

        {message && (
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-400">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

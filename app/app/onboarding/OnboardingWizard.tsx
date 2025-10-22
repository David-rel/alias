'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type StepDefinition = {
  title: string;
  description: string;
};

type TeamMemberRole = "admin" | "guest";

type TeamMemberInput = {
  email: string;
  role: TeamMemberRole;
};

type ExistingInvite = {
  id: string;
  email: string;
  role: "owner" | "admin" | "guest";
  inviteStatus: "pending" | "accepted" | "declined";
};

const stepDefinitions: StepDefinition[] = [
  {
    title: "Your business",
    description: "Share the essentials so we can tailor your workspace.",
  },
  {
    title: "Feature focus",
    description: "Highlight the tools you want to dive into first.",
  },
  {
    title: "Invite teammates",
    description: "Bring your collaborators into the new workspace.",
  },
];

const companySizeOptions = [
  "Just me",
  "2 - 10",
  "11 - 50",
  "51 - 200",
  "201 - 500",
  "500+",
];

const featureOptions = [
  {
    id: "workflow-automation",
    label: "Workflow automation",
    description: "Trigger actions across your systems with smart flows.",
  },
  {
    id: "ai-assistants",
    label: "AI assistants",
    description: "Deploy copilots that handle customer and team requests.",
  },
  {
    id: "analytics",
    label: "Executive analytics",
    description: "Monitor KPIs with unified dashboards and alerts.",
  },
  {
    id: "finance",
    label: "Finance operations",
    description: "Streamline approvals, billing, and revenue recognition.",
  },
  {
    id: "marketing",
    label: "Marketing campaigns",
    description: "Automate nurture journeys and measure impact instantly.",
  },
  {
    id: "hr",
    label: "Employee experience",
    description: "Onboard team members and centralize HR workflows.",
  },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const teamRoleOptions: { value: TeamMemberRole; label: string; description: string }[] = [
  {
    value: "admin",
    label: "Admin",
    description: "Manage automation, approve workflows, and update settings.",
  },
  {
    value: "guest",
    label: "Guest",
    description: "Collaborate on assigned tasks and view outcomes.",
  },
];

function formatRoleLabel(role: "owner" | "admin" | "guest") {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    default:
      return "Guest";
  }
}

function formatInviteStatus(status: "pending" | "accepted" | "declined") {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "declined":
      return "Declined";
    default:
      return "Pending";
  }
}

export function OnboardingWizard() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [businessCategory, setBusinessCategory] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [location, setLocation] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const [teamMembers, setTeamMembers] = useState<TeamMemberInput[]>([
    { email: "", role: "guest" },
  ]);
  const [existingInvites, setExistingInvites] = useState<ExistingInvite[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/onboarding", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load onboarding data.");
        }

        const payload = (await response.json()) as {
          business: {
            businessCategory: string | null;
            industry: string | null;
            description: string | null;
            logoPath: string | null;
            companySize: string | null;
            location: string | null;
            featurePreferences: string[];
          } | null;
          teamMembers: ExistingInvite[];
        };

        if (!active) {
          return;
        }

        if (payload.business) {
          setBusinessCategory(payload.business.businessCategory ?? "");
          setIndustry(payload.business.industry ?? "");
          setDescription(payload.business.description ?? "");
          setCompanySize(payload.business.companySize ?? "");
          setLocation(payload.business.location ?? "");
          setLogoPreview(payload.business.logoPath ?? null);
          setLogoRemoved(false);
          setSelectedFeatures(payload.business.featurePreferences ?? []);
        }

        if (payload.teamMembers?.length) {
          setExistingInvites(
            payload.teamMembers.filter((member) => member.inviteStatus !== "accepted"),
          );
        } else {
          setExistingInvites([]);
        }
      } catch (loadError) {
        console.error(loadError);
        if (active) {
          setError("We couldn't load your onboarding progress. Please refresh.");
        }
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!logoFile) {
      return;
    }

    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreview(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [logoFile]);

  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-3 text-sm text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition focus:border-[#23a5fe] focus:ring-2 focus:ring-[#23a5fe]/40";

  const stepProgress = useMemo(() => {
    if (stepDefinitions.length <= 1) {
      return 0;
    }
    return (currentStep / (stepDefinitions.length - 1)) * 100;
  }, [currentStep]);

  function updateTeamMember(
    index: number,
    field: keyof TeamMemberInput,
    value: string,
  ) {
    setTeamMembers((prev) =>
      prev.map((member, memberIndex) => {
        if (memberIndex !== index) {
          return member;
        }

        if (field === "role") {
          const normalized = value === "admin" ? "admin" : "guest";
          return { ...member, role: normalized };
        }

        return { ...member, [field]: value };
      }),
    );
  }

  function addTeamMember() {
    setTeamMembers((prev) => [...prev, { email: "", role: "guest" }]);
  }

  function removeTeamMember(index: number) {
    setTeamMembers((prev) => prev.filter((_, memberIndex) => memberIndex !== index));
  }

  async function handleBusinessStep() {
    if (isLoading) return;
    setError(null);

    if (
      !businessCategory.trim() ||
      !industry.trim() ||
      !description.trim() ||
      !companySize.trim() ||
      !location.trim()
    ) {
      setError("Please complete all required business details.");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.set("businessCategory", businessCategory.trim());
      formData.set("industry", industry.trim());
      formData.set("description", description.trim());
      formData.set("companySize", companySize.trim());
      formData.set("location", location.trim());
      formData.set("removeLogo", logoRemoved ? "true" : "false");
      if (logoFile) {
        formData.set("logo", logoFile);
      }

      const response = await fetch("/api/onboarding/business", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Unable to save your business details.",
        );
      }

      const payload = (await response.json()) as {
        business?: { logoPath: string | null; featurePreferences: string[] };
      };

      if (payload.business?.logoPath) {
        setLogoPreview(payload.business.logoPath);
        setLogoFile(null);
      }

      if (payload.business?.featurePreferences?.length) {
        setSelectedFeatures(payload.business.featurePreferences);
      }

      setLogoRemoved(false);
      setCurrentStep((step) => Math.min(step + 1, stepDefinitions.length - 1));
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We couldn't save your business details. Try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFeatureStep() {
    if (isLoading) return;
    setError(null);

    if (selectedFeatures.length === 0) {
      setError("Choose at least one feature to continue.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/onboarding/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: selectedFeatures }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Unable to save your feature preferences.",
        );
      }

      setCurrentStep((step) => Math.min(step + 1, stepDefinitions.length - 1));
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We couldn't save your feature preferences. Try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTeamStep() {
    if (isLoading) return;
    setError(null);

    const preparedMembers = teamMembers
      .map((member) => ({
        email: member.email.trim().toLowerCase(),
        role: member.role,
      }))
      .filter((member) => member.email);

    if (preparedMembers.length === 0) {
      setError("Add at least one teammate email before finishing.");
      return;
    }

    if (preparedMembers.length > 20) {
      setError("You can invite up to 20 teammates at once.");
      return;
    }

    const invalidMember = preparedMembers.find(
      (member) => !EMAIL_REGEX.test(member.email),
    );

    if (invalidMember) {
      setError(`"${invalidMember.email}" doesn't look like a valid email address.`);
      return;
    }

    const seenEmails = new Set<string>();
    const duplicate = preparedMembers.find((member) => {
      if (seenEmails.has(member.email)) {
        return true;
      }
      seenEmails.add(member.email);
      return false;
    });

    if (duplicate) {
      setError(`"${duplicate.email}" is listed more than once. Remove duplicates to continue.`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/onboarding/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          members: preparedMembers.map((member) => ({
            email: member.email,
            role: member.role,
          })),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Unable to invite your teammates.",
        );
      }

      const payload = (await response.json()) as {
        teamMembers?: ExistingInvite[];
      };

      if (payload.teamMembers) {
        setExistingInvites(
          payload.teamMembers.filter((member) => member.inviteStatus !== "accepted"),
        );
      }

      await fetch("/api/onboarding/complete", { method: "POST" });

      router.push("/app");
      router.refresh();
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We couldn't finish onboarding. Try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleNext() {
    if (currentStep === 0) {
      void handleBusinessStep();
    } else if (currentStep === 1) {
      void handleFeatureStep();
    } else {
      void handleTeamStep();
    }
  }

  function handleBack() {
    if (isLoading) return;
    setError(null);
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function toggleFeature(featureId: string) {
    setSelectedFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId],
    );
  }

  const stepTitle = stepDefinitions[currentStep]?.title ?? "";

  return (
    <div className="space-y-10">
      <header className="rounded-3xl border border-white/10 bg-neutral-900/80 px-8 py-10 text-neutral-100">
        <p className="text-xs uppercase tracking-[0.4em] text-[#3eb6fd]">
          Alias onboarding
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Let&apos;s finish setting things up
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Complete these three quick steps so we can personalize your workspace and
          get your team collaborating faster.
        </p>
      </header>

      <section className="rounded-3xl border border-white/10 bg-neutral-900/70 p-8 text-neutral-100">
        <div className="space-y-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-neutral-400">
                Step {currentStep + 1} of {stepDefinitions.length}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {stepTitle}
              </h2>
              <p className="mt-1 max-w-xl text-sm text-neutral-400">
                {stepDefinitions[currentStep]?.description}
              </p>
            </div>
            <div className="flex w-full max-w-sm items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0064d6] via-[#23a5fe] to-[#3eb6fd] transition-all duration-500"
                  style={{ width: `${stepProgress}%` }}
                />
              </div>
              <span className="text-sm text-neutral-300">
                {Math.round(stepProgress)}%
              </span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/60">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentStep * 100}%)` }}
            >
              <div className="min-w-full space-y-6 p-6 md:p-8">
                {initializing && currentStep === 0 ? (
                  <p className="text-sm text-neutral-400">
                    Loading your business details...
                  </p>
                ) : (
                  <>
                    <div className="grid gap-6 md:grid-cols-2">
                      <label className="block">
                        <span className="text-sm text-neutral-300">
                          Business category
                        </span>
                        <input
                          type="text"
                          className={inputClass}
                          placeholder="Agency, SaaS, E-commerce..."
                          value={businessCategory}
                          onChange={(event) => setBusinessCategory(event.target.value)}
                          disabled={isLoading}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm text-neutral-300">
                          Industry
                        </span>
                        <input
                          type="text"
                          className={inputClass}
                          placeholder="Marketing, Finance, Operations..."
                          value={industry}
                          onChange={(event) => setIndustry(event.target.value)}
                          disabled={isLoading}
                        />
                      </label>
                    </div>

                    <label className="block">
                      <span className="text-sm text-neutral-300">
                        Describe what you do (one line)
                      </span>
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="We help ops teams automate daily workflows."
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        disabled={isLoading}
                        maxLength={200}
                      />
                    </label>

                    <div className="grid gap-6 md:grid-cols-2">
                      <label className="block">
                        <span className="text-sm text-neutral-300">Company size</span>
                        <select
                          className={inputClass}
                          value={companySize}
                          onChange={(event) => setCompanySize(event.target.value)}
                          disabled={isLoading}
                        >
                          <option value="">Select size</option>
                          {companySizeOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-sm text-neutral-300">Where are you based?</span>
                        <input
                          type="text"
                          className={inputClass}
                          placeholder="City, Country"
                          value={location}
                          onChange={(event) => setLocation(event.target.value)}
                          disabled={isLoading}
                        />
                      </label>
                    </div>

                    <div className="flex flex-col gap-4 rounded-xl border border-dashed border-white/10 bg-neutral-900/50 p-6 md:flex-row md:items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-200">
                          Upload your logo
                        </p>
                        <p className="mt-1 text-xs text-neutral-400">
                          Recommended: square PNG, JPG, SVG, or WEBP no larger than 5MB.
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          className="mt-4 text-xs text-neutral-300"
                          onChange={(event) => {
                            const nextFile = event.target.files?.[0] ?? null;
                            setLogoFile(nextFile);
                            if (nextFile) {
                              setLogoRemoved(false);
                            }
                          }}
                          disabled={isLoading}
                        />
                        {logoPreview ? (
                          <button
                            type="button"
                            className="mt-2 text-xs text-neutral-400 underline hover:text-neutral-200"
                            onClick={() => {
                              setLogoFile(null);
                              if (!initializing) {
                                setLogoPreview(null);
                              }
                              setLogoRemoved(true);
                            }}
                            disabled={isLoading}
                          >
                            Remove logo
                          </button>
                        ) : null}
                      </div>
                      {logoPreview ? (
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-neutral-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={logoPreview}
                            alt="Business logo preview"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-white/10 bg-neutral-900 text-sm text-neutral-500">
                          No logo
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="min-w-full space-y-6 p-6 md:p-8">
                {initializing && currentStep === 1 ? (
                  <p className="text-sm text-neutral-400">
                    Loading your feature preferences...
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-neutral-300">
                      Select the features you&apos;re most excited to activate first. We&apos;ll recommend a tailored setup plan.
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      {featureOptions.map((feature) => {
                        const isSelected = selectedFeatures.includes(feature.id);
                        return (
                          <button
                            type="button"
                            key={feature.id}
                            onClick={() => toggleFeature(feature.id)}
                            className={`rounded-2xl border p-4 text-left transition ${
                              isSelected
                                ? "border-[#23a5fe] bg-[#23a5fe]/10 text-neutral-100 shadow-[0_0_25px_rgba(35,165,254,0.2)]"
                                : "border-white/10 bg-neutral-900/50 text-neutral-300 hover:border-[#23a5fe]/60 hover:text-neutral-100"
                            }`}
                            disabled={isLoading}
                          >
                            <p className="font-semibold text-white">{feature.label}</p>
                            <p className="mt-2 text-sm text-neutral-400">
                              {feature.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                    {selectedFeatures.length > 0 ? (
                      <p className="text-xs text-[#3eb6fd]">
                        {selectedFeatures.length} feature
                        {selectedFeatures.length > 1 ? "s" : ""} selected
                      </p>
                    ) : null}
                  </>
                )}
              </div>

              <div className="min-w-full space-y-6 p-6 md:p-8">
                <p className="text-sm text-neutral-300">
                  Invite the teammates who will collaborate inside Alias. We&apos;ll send invites and keep you posted as they join.
                </p>

                <div className="space-y-4">
                  {teamMembers.map((member, index) => (
                    <div
                      key={`member-${index}`}
                      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-neutral-900/60 p-4 md:flex-row md:items-center"
                    >
                      <div className="flex-1">
                        <label className="block text-sm text-neutral-300">
                          Teammate email
                        </label>
                        <input
                          type="email"
                          className={inputClass}
                          placeholder="teammate@company.com"
                          value={member.email}
                          onChange={(event) =>
                            updateTeamMember(index, "email", event.target.value)
                          }
                          disabled={isLoading}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm text-neutral-300">
                          Role
                        </label>
                        <select
                          className={inputClass}
                          value={member.role}
                          onChange={(event) =>
                            updateTeamMember(index, "role", event.target.value)
                          }
                          disabled={isLoading}
                        >
                          {teamRoleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-xs text-neutral-500">
                          {
                            teamRoleOptions.find(
                              (option) => option.value === member.role,
                            )?.description
                          }
                        </p>
                      </div>
                      {teamMembers.length > 1 ? (
                        <button
                          type="button"
                          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-neutral-300 transition hover:border-[#ff9b9b] hover:text-[#ff9b9b]"
                          onClick={() => removeTeamMember(index)}
                          disabled={isLoading}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="rounded-xl border border-dashed border-white/20 px-4 py-2 text-sm text-neutral-300 transition hover:border-[#23a5fe] hover:text-white"
                  onClick={addTeamMember}
                  disabled={isLoading || teamMembers.length >= 10}
                >
                  + Add another teammate
                </button>

                {existingInvites.length > 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-4">
                    <p className="text-sm font-semibold text-neutral-200">
                      Pending invites
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-neutral-300">
                      {existingInvites.map((invite) => (
                        <li key={invite.id} className="flex items-center justify-between">
                          <div>
                            <p>{invite.email}</p>
                            <p className="text-xs text-neutral-500">
                              {formatRoleLabel(invite.role)}
                            </p>
                          </div>
                          <span className="text-xs uppercase tracking-wide text-neutral-500">
                            {formatInviteStatus(invite.inviteStatus)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-[#ff9b9b]/40 bg-[#ff9b9b]/10 px-4 py-3 text-sm text-[#ff9b9b]">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 0 || isLoading}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-neutral-300 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={isLoading || initializing}
              className="rounded-xl bg-gradient-to-r from-[#0064d6] via-[#23a5fe] to-[#3eb6fd] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(35,165,254,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading
                ? "Saving..."
                : currentStep === stepDefinitions.length - 1
                  ? "Finish onboarding"
                  : "Save & continue"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

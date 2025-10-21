export const metadata = {
  title: "Finish setting up your Alias account",
};

const steps = [
  {
    title: "Connect your workspace details",
    description:
      "Share the basics about your team so we can tailor the dashboard to what matters most.",
  },
  {
    title: "Invite collaborators",
    description:
      "Bring in the teammates who will help run automations, approve workflows, and monitor outcomes.",
  },
  {
    title: "Configure data sources",
    description:
      "Hook Alias into the systems that power operations, finance, and marketing for richer insights.",
  },
];

export default function OnboardingPage() {
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
          We&apos;ve sent a verification link to your inbox. Once you confirm
          your email, complete the steps below to activate your workspace.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.title}
            className="rounded-3xl border border-white/10 bg-neutral-900/40 p-6 text-neutral-200"
          >
            <h2 className="text-base font-semibold text-white">{step.title}</h2>
            <p className="mt-3 text-sm text-neutral-400">
              {step.description}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}

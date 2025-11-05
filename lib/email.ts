import nodemailer from "nodemailer";
import type { AppointmentBookingStatus } from "@/types/appointments";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT
  ? Number.parseInt(process.env.SMTP_PORT, 10)
  : undefined;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const gmailUser = process.env.GMAIL_USER;
const gmailPass = process.env.GMAIL_PASS;
const emailFrom = process.env.EMAIL_FROM ?? smtpUser ?? gmailUser ?? undefined;

let transporter: nodemailer.Transporter | null = null;

function createTransporter(): nodemailer.Transporter {
  if (gmailUser && gmailPass) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });
  }

  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort ?? 587,
      secure: (smtpPort ?? 587) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  throw new Error(
    "Email transport is not fully configured. Provide Gmail or SMTP credentials."
  );
}

function getTransporter() {
  if (!transporter) {
    transporter = createTransporter();
  }

  return transporter;
}

function baseUrl() {
  const fallback = "http://localhost:3000";
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  return (envUrl ?? fallback).replace(/\/$/, "");
}

export function emailDeliveryConfigured() {
  return Boolean(
    (gmailUser && gmailPass) || (smtpHost && smtpUser && smtpPass)
  );
}

type VerificationEmailPayload = {
  recipient: string;
  code: string;
};

export async function sendVerificationEmail({
  recipient,
  code,
}: VerificationEmailPayload) {
  const verifyUrl = `${baseUrl()}/auth/verify?code=${encodeURIComponent(code)}`;
  const fromAddress =
    emailFrom ?? gmailUser ?? smtpUser ?? "no-reply@alias.app";

  if (!emailDeliveryConfigured()) {
    console.warn(
      "[email] Delivery skipped – configure GMAIL_USER/GMAIL_PASS or SMTP_HOST/SMTP_USER/SMTP_PASS to enable sending."
    );
    console.info(`[email] Verification link for ${recipient}: ${verifyUrl}`);
    return;
  }

  const transport = getTransporter();

  await transport.sendMail({
    from: fromAddress,
    to: recipient,
    subject: "Verify your Alias account",
    text: [
      "Welcome to Alias!",
      "",
      "Confirm your email address to activate your account:",
      verifyUrl,
      "",
      "If you didn't create an Alias account you can safely ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: sans-serif; line-height: 1.5; color: #0f172a;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Welcome to Alias</h1>
        <p style="margin: 0 0 16px;">Confirm your email address to activate your account.</p>
        <p style="margin: 0 0 24px;">
          <a href="${verifyUrl}" style="display: inline-block; padding: 12px 20px; border-radius: 999px; background: linear-gradient(90deg,#0064d6,#23a5fe,#3eb6fd); text-decoration: none; color: #0b1120; font-weight: 600;">
            Verify email
          </a>
        </p>
        <p style="margin: 0;">
          Or copy and paste this link into your browser:<br/>
          <a href="${verifyUrl}">${verifyUrl}</a>
        </p>
        <p style="margin-top: 24px; font-size: 12px; color: #475569;">
          If you didn't create an Alias account you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

type PasswordResetEmailPayload = {
  recipient: string;
  code: string;
};

export async function sendPasswordResetEmail({
  recipient,
  code,
}: PasswordResetEmailPayload) {
  const resetUrl = `${baseUrl()}/auth/reset?code=${encodeURIComponent(code)}`;
  const fromAddress =
    emailFrom ?? gmailUser ?? smtpUser ?? "no-reply@alias.app";

  if (!emailDeliveryConfigured()) {
    console.warn(
      "[email] Delivery skipped – configure GMAIL_USER/GMAIL_PASS or SMTP_HOST/SMTP_USER/SMTP_PASS to enable sending."
    );
    console.info(`[email] Password reset link for ${recipient}: ${resetUrl}`);
    return;
  }

  const transport = getTransporter();

  await transport.sendMail({
    from: fromAddress,
    to: recipient,
    subject: "Reset your Alias password",
    text: [
      "We received a request to reset your Alias password.",
      "",
      "Use the link below to choose a new password. This link is valid for 1 hour.",
      resetUrl,
      "",
      "If you didn't request this reset you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: sans-serif; line-height: 1.5; color: #0f172a;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Reset your password</h1>
        <p style="margin: 0 0 16px;">Use the button below to choose a new password. This link expires in 1 hour.</p>
        <p style="margin: 0 0 24px;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 20px; border-radius: 999px; background: linear-gradient(90deg,#0064d6,#23a5fe,#3eb6fd); text-decoration: none; color: #0b1120; font-weight: 600;">
            Reset password
          </a>
        </p>
        <p style="margin: 0;">
          Or copy and paste this link into your browser:<br/>
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="margin-top: 24px; font-size: 12px; color: #475569;">
          If you didn't request this reset you can ignore this email.
        </p>
      </div>
    `,
  });
}

type TeamInviteEmailPayload = {
  recipient: string;
  inviterName: string;
  businessName: string;
  role: "admin" | "guest";
  resetCode: string;
  expiresAt: Date;
};

export async function sendTeamInviteEmail({
  recipient,
  inviterName,
  businessName,
  role,
  resetCode,
  expiresAt,
}: TeamInviteEmailPayload) {
  const resetUrl = `${baseUrl()}/auth/reset?code=${encodeURIComponent(
    resetCode
  )}`;
  const fromAddress =
    emailFrom ?? gmailUser ?? smtpUser ?? "no-reply@alias.app";
  const roleLabel = role === "admin" ? "Admin" : "Guest";
  const expiresLabel = expiresAt.toUTCString();

  if (!emailDeliveryConfigured()) {
    console.warn(
      "[email] Delivery skipped – configure GMAIL_USER/GMAIL_PASS or SMTP_HOST/SMTP_USER/SMTP_PASS to enable sending."
    );
    console.info(
      `[email] Team invite for ${recipient}: ${resetUrl} (role: ${roleLabel}, invited by ${inviterName})`
    );
    return;
  }

  const transport = getTransporter();

  await transport.sendMail({
    from: fromAddress,
    to: recipient,
    subject: `${inviterName} invited you to ${businessName} on Alias`,
    text: [
      `${inviterName} invited you to join ${businessName} on Alias as a ${roleLabel}.`,
      "",
      "Set your password to get started:",
      resetUrl,
      "",
      `This link expires on ${expiresLabel}. If you weren’t expecting this invitation you can ignore it.`,
    ].join("\n"),
    html: `
      <div style="font-family: sans-serif; line-height: 1.5; color: #0f172a;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">You're invited to ${businessName}</h1>
        <p style="margin: 0 0 12px;">
          ${inviterName} added you as a <strong>${roleLabel}</strong> on Alias. Set your password to jump in.
        </p>
        <p style="margin: 0 0 24px;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 20px; border-radius: 999px; background: linear-gradient(90deg,#0064d6,#23a5fe,#3eb6fd); text-decoration: none; color: #0b1120; font-weight: 600;">
            Set password & sign in
          </a>
        </p>
        <p style="margin: 0 0 16px;">
          Or copy and paste this link into your browser:<br/>
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="margin: 0; font-size: 12px; color: #475569;">
          This link expires on ${expiresLabel}. If you weren’t expecting this invitation you can ignore it.
        </p>
      </div>
    `,
  });
}

function formatBookingWindow(
  startIso: string,
  endIso: string,
  timezone: string
) {
  const start = new Date(startIso);
  const end = new Date(endIso);

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  });

  const zoneFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "short",
  });

  const tzLabel = zoneFormatter.format(start).split(" ").pop() ?? timezone;

  return {
    dateLabel: dateFormatter.format(start),
    timeLabel: `${timeFormatter.format(start)} - ${timeFormatter.format(
      end
    )} ${tzLabel}`,
  };
}

type AppointmentConfirmationEmailOptions = {
  recipient: string;
  guestName: string;
  calendarName: string;
  businessName?: string | null;
  startTimeIso: string;
  endTimeIso: string;
  timezone: string;
  locationSummary?: string | null;
  meetingUrl?: string | null;
  notes?: string | null;
  status: AppointmentBookingStatus;
};

type AppointmentNotificationEmailOptions =
  AppointmentConfirmationEmailOptions & {
    guestEmail: string;
    calendarId: string;
    reason?: string | null;
  };

function resolveFromAddress() {
  return emailFrom ?? gmailUser ?? smtpUser ?? "no-reply@alias.app";
}

export async function sendAppointmentConfirmationEmail(
  options: AppointmentConfirmationEmailOptions
) {
  const fromAddress = resolveFromAddress();
  const isPending = options.status === "pending";
  const isCancelled = options.status === "cancelled";
  const label = formatBookingWindow(
    options.startTimeIso,
    options.endTimeIso,
    options.timezone
  );
  const experienceLabel = options.businessName ?? "the team";

  if (!emailDeliveryConfigured()) {
    console.warn(
      "[email] Delivery skipped – configure GMAIL_USER/GMAIL_PASS or SMTP_HOST/SMTP_USER/SMTP_PASS to enable sending."
    );
    console.info(
      `[email] Confirmation for ${options.recipient}: ${options.calendarName} on ${label.dateLabel} ${label.timeLabel}`
    );
    return;
  }

  const transport = getTransporter();

  const locationLine = options.locationSummary
    ? `Where: ${options.locationSummary}`
    : "Where: Details to follow";
  const meetingLink =
    !isCancelled && options.meetingUrl && options.meetingUrl.length > 0
      ? `Join link: ${options.meetingUrl}`
      : null;

  const notesBlock = options.notes
    ? `
Notes from you: ${options.notes}
`
    : "";

  const subject = isPending
    ? `We received your booking request for ${options.calendarName}`
    : `You're booked for ${options.calendarName}`;

  await transport.sendMail({
    from: fromAddress,
    to: options.recipient,
    subject,
    text: `Hi ${options.guestName},

${
  isPending
    ? `Thanks for requesting a time with ${experienceLabel}. We just received your booking and will confirm shortly.
`
    : `Your time with ${experienceLabel} is confirmed.
`
}
When: ${label.dateLabel} · ${label.timeLabel}
${locationLine}
${
  meetingLink
    ? `${meetingLink}
`
    : ""
}${notesBlock}
${
  isPending
    ? "We'll email you again once the team confirms your booking."
    : "If anything changes, reply to this email and the team will help."
}
`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #0f172a;">
        <h1 style="font-size: 26px; margin-bottom: 12px;">${
          isPending ? "We received your request" : "You're scheduled!"
        }</h1>
        <p style="margin: 0 0 16px;">Hi ${options.guestName}, ${
      isPending
        ? `we just received your booking request with <strong>${experienceLabel}</strong>. We'll confirm the details shortly.`
        : `your time with <strong>${experienceLabel}</strong> is confirmed.`
    }</p>
        <div style="border-radius: 16px; background: #f1f7ff; padding: 16px 20px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px; font-weight: 600; color: #0b3a75;">${
            options.calendarName
          }</p>
          <p style="margin: 0;">${label.dateLabel}</p>
          <p style="margin: 4px 0 0;">${label.timeLabel}</p>
          <p style="margin: 12px 0 0;">${locationLine}</p>
          ${
            meetingLink
              ? `<p style="margin: 8px 0 0;"><a href="${options.meetingUrl}" style="color: #0064d6;">Join meeting →</a></p>`
              : ""
          }
        </div>
        ${
          options.notes
            ? `<p style="margin: 0 0 16px;">Notes you shared:<br/><em>${options.notes}</em></p>`
            : ""
        }
        <p style="margin: 0 0 8px;">${
          isPending
            ? "We'll send a confirmation email once the team approves your booking."
            : "Need to make a change? Reply to this email and we'll help."
        }</p>
        <p style="margin: 12px 0 0; font-size: 12px; color: #475569;">Sent by Alias scheduling.</p>
      </div>
    `,
  });
}

export async function sendAppointmentNotificationEmail(
  options: AppointmentNotificationEmailOptions
) {
  const fromAddress = resolveFromAddress();
  const isPending = options.status === "pending";
  const isCancelled = options.status === "cancelled";
  const label = formatBookingWindow(
    options.startTimeIso,
    options.endTimeIso,
    options.timezone
  );
  const siteBase = baseUrl();
  const manageUrl = `${siteBase}/app/appointment-scheduler/${options.calendarId}`;

  if (!emailDeliveryConfigured()) {
    console.warn(
      "[email] Delivery skipped – configure GMAIL_USER/GMAIL_PASS or SMTP_HOST/SMTP_USER/SMTP_PASS to enable sending."
    );
    console.info(
      `[email] Internal booking alert for ${options.recipient}: ${options.calendarName} with ${options.guestName} on ${label.dateLabel} ${label.timeLabel}`
    );
    return;
  }

  const transport = getTransporter();

  const locationLine = options.locationSummary
    ? `Location: ${options.locationSummary}`
    : "Location: Details to share";
  const meetingLink =
    options.meetingUrl && options.meetingUrl.length > 0
      ? `Join link: ${options.meetingUrl}`
      : null;

  const notesBlock = options.notes
    ? `
Guest notes: ${options.notes}
`
    : "";

  const subject = isCancelled
    ? `Booking cancelled: ${options.calendarName} with ${options.guestName}`
    : isPending
    ? `Booking request: ${options.calendarName} with ${options.guestName}`
    : `New booking: ${options.calendarName} with ${options.guestName}`;

  await transport.sendMail({
    from: fromAddress,
    to: options.recipient,
    replyTo: options.guestEmail,
    subject,
    text: `Heads up! ${options.guestName} (${options.guestEmail}) ${
      isCancelled ? "cancelled" : isPending ? "requested" : "booked"
    } ${options.calendarName}.

When: ${label.dateLabel} · ${label.timeLabel}
${locationLine}
${
  meetingLink
    ? `${meetingLink}
`
    : ""
}${notesBlock}${
      isCancelled && options.reason
        ? `
Reason: ${options.reason}
`
        : ""
    }
${
  isPending
    ? "Open the calendar to approve or reschedule:"
    : isCancelled
    ? "Open the calendar to follow up or remove the slot:"
    : "View the calendar:"
} ${manageUrl}
`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #0f172a;">
        <h1 style="font-size: 24px; margin-bottom: 12px;">${
          isCancelled
            ? "Booking cancelled"
            : isPending
            ? "New booking request"
            : "New booking confirmed"
        }</h1>
        <p style="margin: 0 0 16px;"><strong>${options.guestName}</strong> (${
      options.guestEmail
    }) just ${
      isCancelled ? "cancelled" : isPending ? "requested" : "booked"
    } <strong>${options.calendarName}</strong>.</p>
        <div style="border-radius: 16px; background: #f1f7ff; padding: 16px 20px; margin-bottom: 16px;">
          <p style="margin: 0;">${label.dateLabel}</p>
          <p style="margin: 4px 0 0;">${label.timeLabel}</p>
          <p style="margin: 12px 0 0;">${locationLine}</p>
          ${
            meetingLink
              ? `<p style="margin: 8px 0 0;"><a href="${options.meetingUrl}" style="color: #0064d6;">Join meeting →</a></p>`
              : ""
          }
        </div>
        ${
          options.notes
            ? `<p style="margin: 0 0 16px;">Guest notes:<br/><em>${options.notes}</em></p>`
            : ""
        }
        ${
          isCancelled && options.reason
            ? `<p style="margin: 0 0 12px;">Reason:<br/><em>${options.reason}</em></p>`
            : ""
        }
        <p style="margin: 0 0 12px;">${
          isPending
            ? "Open the calendar to approve or reschedule this request:"
            : isCancelled
            ? "Open the calendar to follow up or adjust availability:"
            : "Open the calendar to review or reschedule:"
        }</p>
        <p style="margin: 0 0 16px;">
          <a href="${manageUrl}" style="display: inline-block; padding: 12px 22px; border-radius: 999px; background: linear-gradient(90deg,#0064d6,#23a5fe,#3eb6fd); color: #0b1120; text-decoration: none; font-weight: 600;">View calendar</a>
        </p>
        <p style="margin: 0; font-size: 12px; color: #475569;">Sent by Alias scheduling.</p>
      </div>
    `,
  });
}

type AppointmentDeclinedEmailOptions = {
  recipient: string;
  guestName: string;
  calendarName: string;
  businessName?: string | null;
  startTimeIso: string;
  endTimeIso: string;
  timezone: string;
  reason?: string;
};

export async function sendAppointmentDeclinedEmail(
  options: AppointmentDeclinedEmailOptions
) {
  const fromAddress = resolveFromAddress();
  const label = formatBookingWindow(
    options.startTimeIso,
    options.endTimeIso,
    options.timezone
  );
  const experienceLabel = options.businessName ?? "our team";

  if (!emailDeliveryConfigured()) {
    console.warn(
      "[email] Delivery skipped – configure GMAIL_USER/GMAIL_PASS or SMTP_HOST/SMTP_USER/SMTP_PASS to enable sending."
    );
    console.info(
      `[email] Decline for ${options.recipient}: ${options.calendarName} on ${label.dateLabel} ${label.timeLabel}`
    );
    return;
  }

  const transport = getTransporter();

  await transport.sendMail({
    from: fromAddress,
    to: options.recipient,
    subject: `Update on your booking for ${options.calendarName}`,
    text: `Hi ${options.guestName},

Thank you for requesting time with ${experienceLabel}. We won't be able to host ${
      options.calendarName
    } on ${label.dateLabel} (${label.timeLabel}).
${
  options.reason
    ? `
Reason provided: ${options.reason}
`
    : ""
}
Feel free to pick another slot from the booking link or reply to this email and we'll coordinate directly.

`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #0f172a;">
        <h1 style="font-size: 24px; margin-bottom: 12px;">We need to reschedule</h1>
        <p style="margin: 0 0 16px;">Hi ${
          options.guestName
        }, thanks for requesting time with ${experienceLabel}. We won't be able to host <strong>${
      options.calendarName
    }</strong> on the requested slot.</p>
        <div style="border-radius: 16px; background: #fef3f2; padding: 16px 20px; margin-bottom: 16px; border: 1px solid #fecaca;">
          <p style="margin: 0; font-weight: 600; color: #b91c1c;">Originally requested</p>
          <p style="margin: 4px 0 0;">${label.dateLabel}</p>
          <p style="margin: 0;">${label.timeLabel}</p>
        </div>
        ${
          options.reason
            ? `<p style="margin: 0 0 16px;">Reason provided:<br/><em>${options.reason}</em></p>`
            : ""
        }
        <p style="margin: 0 0 12px;">You can pick another time from the booking link or reply to this email and we'll coordinate.</p>
        <p style="margin: 12px 0 0; font-size: 12px; color: #475569;">Sent by Alias scheduling.</p>
      </div>
    `,
  });
}

type EventRegistrationConfirmationOptions = {
  recipient: string;
  attendeeName: string;
  eventTitle: string;
  businessName: string;
  startTimeIso: string;
  endTimeIso: string;
  timezone: string;
  locationSummary: string;
  virtualMeetingUrl?: string;
};

type EventRegistrationNotificationOptions = {
  recipient: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  eventTitle: string;
  businessName: string;
  startTimeIso: string;
  endTimeIso: string;
  timezone: string;
  locationSummary: string;
  notes?: string;
};

export async function sendEventRegistrationConfirmationEmail(
  options: EventRegistrationConfirmationOptions
) {
  const fromAddress = resolveFromAddress();
  const timing = formatBookingWindow(
    options.startTimeIso,
    options.endTimeIso,
    options.timezone
  );

  if (!emailDeliveryConfigured()) {
    console.warn(
      "[email] Delivery skipped – configure GMAIL_USER/GMAIL_PASS or SMTP_HOST/SMTP_USER/SMTP_PASS to enable sending."
    );
    console.info(
      `[email] Event confirmation for ${options.recipient}: ${options.eventTitle} on ${timing.dateLabel} ${timing.timeLabel}`
    );
    return;
  }

  const transport = getTransporter();

  await transport.sendMail({
    from: fromAddress,
    to: options.recipient,
    subject: `You're registered for ${options.eventTitle}`,
    text: `Hi ${options.attendeeName},

You're confirmed for ${options.eventTitle} with ${options.businessName}.

When: ${timing.dateLabel} · ${timing.timeLabel}
Where: ${options.locationSummary}
${
  options.virtualMeetingUrl
    ? `Join link: ${options.virtualMeetingUrl}
`
    : ""
}
We’ll send any event updates straight to this email.
`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #0f172a;">
        <h1 style="font-size: 26px; margin-bottom: 12px;">You're in!</h1>
        <p style="margin: 0 0 16px;">Hi ${options.attendeeName}, you're confirmed for <strong>${options.eventTitle}</strong> with ${options.businessName}.</p>
        <div style="border-radius: 16px; background: linear-gradient(135deg,#f5f9ff,#e6f2ff); padding: 20px 24px; margin-bottom: 16px; border: 1px solid #cfe4ff;">
          <p style="margin: 0 0 6px; font-weight: 600; color: #0b3a75;">${options.eventTitle}</p>
          <p style="margin: 0;">${timing.dateLabel}</p>
          <p style="margin: 4px 0 0;">${timing.timeLabel}</p>
          <p style="margin: 12px 0 0;">Location: ${options.locationSummary}</p>
          ${
            options.virtualMeetingUrl
              ? `<p style="margin: 8px 0 0;"><a href="${options.virtualMeetingUrl}" style="color: #0064d6;">Join event →</a></p>`
              : ""
          }
        </div>
        <p style="margin: 0 0 12px;">We'll email you here if anything changes. If you need to update your registration just reply to this message.</p>
        <p style="margin: 12px 0 0; font-size: 12px; color: #475569;">Sent by Alias events.</p>
      </div>
    `,
  });
}

export async function sendEventRegistrationNotificationEmail(
  options: EventRegistrationNotificationOptions
) {
  const fromAddress = resolveFromAddress();
  const timing = formatBookingWindow(
    options.startTimeIso,
    options.endTimeIso,
    options.timezone
  );

  if (!emailDeliveryConfigured()) {
    console.warn(
      "[email] Delivery skipped – configure GMAIL_USER/GMAIL_PASS or SMTP_HOST/SMTP_USER/SMTP_PASS to enable sending."
    );
    console.info(
      `[email] Event registration alert: ${options.attendeeName} for ${options.eventTitle} on ${timing.dateLabel} ${timing.timeLabel}`
    );
    return;
  }

  const transport = getTransporter();

  await transport.sendMail({
    from: fromAddress,
    to: options.recipient,
    replyTo: options.attendeeEmail,
    subject: `New attendee for ${options.eventTitle}`,
    text: `${options.attendeeName} (${options.attendeeEmail}${
      options.attendeePhone ? ` · ${options.attendeePhone}` : ""
    }) just registered for ${options.eventTitle}.

When: ${timing.dateLabel} · ${timing.timeLabel}
Location: ${options.locationSummary}
${
  options.notes
    ? `
Notes: ${options.notes}
`
    : ""
}
`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #0f172a;">
        <h1 style="font-size: 24px; margin-bottom: 12px;">New attendee registered</h1>
        <p style="margin: 0 0 12px;"><strong>${options.attendeeName}</strong> (<a href="mailto:${options.attendeeEmail}" style="color:#0064d6;">${options.attendeeEmail}</a>${
      options.attendeePhone
        ? ` · <a href="tel:${options.attendeePhone}" style="color:#0064d6;">${options.attendeePhone}</a>`
        : ""
    }) signed up for <strong>${options.eventTitle}</strong>.</p>
        <div style="border-radius: 16px; background: #f1f7ff; padding: 18px 22px; margin-bottom: 16px; border: 1px solid #cfe4ff;">
          <p style="margin: 0;">${timing.dateLabel}</p>
          <p style="margin: 4px 0 0;">${timing.timeLabel}</p>
          <p style="margin: 12px 0 0;">Location: ${options.locationSummary}</p>
        </div>
        ${
          options.notes
            ? `<p style="margin: 0 0 16px;">Attendee notes:<br/><em>${options.notes}</em></p>`
            : ""
        }
        <p style="margin: 0; font-size: 12px; color: #475569;">Sent by Alias events.</p>
      </div>
    `,
  });
}

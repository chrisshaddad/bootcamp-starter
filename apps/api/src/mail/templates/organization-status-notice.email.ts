import {
  baseLayout,
  emailFootnote,
  emailHeading,
  emailParagraph,
} from './base-layout';

// The non-ACTIVE half of OrganizationStatus. Kept as a local union (rather
// than importing the Prisma enum) so templates stay dependency-free, matching
// due-reminder.email.ts's reminderType.
export type OrganizationBlockedStatus =
  | 'PENDING'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'INACTIVE';

interface OrganizationStatusNoticeEmailParams {
  adminName: string;
  organizationName: string;
  status: OrganizationBlockedStatus;
}

interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

/**
 * Explains, in the recipient's inbox, why a library's staff can't get in.
 *
 * Serves two callers: a staff sign-in attempt against a non-ACTIVE library
 * (sent instead of a magic link, so /auth/magic-link can keep answering
 * "check your email" without revealing whether the account exists), and the
 * proactive notification when a SUPER_ADMIN rejects a library.
 */
export function organizationStatusNoticeEmail({
  adminName,
  organizationName,
  status,
}: OrganizationStatusNoticeEmailParams): EmailContent {
  const { subject, heading, paragraphs, footnote } =
    COPY[status](organizationName);

  // The copy below carries inline <strong> emphasis for the HTML part, so the
  // plain-text alternative has to drop the markup rather than print it.
  const plain = [...paragraphs, footnote].map((line) =>
    line.replace(/<[^>]+>/g, ''),
  );
  const text = `${heading}\n\nHi ${adminName},\n\n${plain.join('\n\n')}`;

  const html = baseLayout({
    previewText: heading,
    bodyHtml: `
      ${emailHeading(heading)}
      ${emailParagraph(`Hi <strong>${adminName}</strong>,`)}
      ${paragraphs.map(emailParagraph).join('\n')}
      ${emailFootnote(footnote)}
    `,
  });

  return { subject, text, html };
}

interface StatusCopy {
  subject: string;
  heading: string;
  /** Body paragraphs, in order. May contain inline HTML emphasis. */
  paragraphs: string[];
  /** Closing line, rendered smaller/muted. */
  footnote: string;
}

const COPY: Record<
  OrganizationBlockedStatus,
  (organizationName: string) => StatusCopy
> = {
  PENDING: (org) => ({
    subject: `${org} is still awaiting approval`,
    heading: 'Still awaiting approval',
    paragraphs: [
      `We can't sign you in yet - <strong>${org}</strong> is still being reviewed by a NextShelf administrator.`,
      `As soon as it's approved we'll email you a sign-in link. There's nothing you need to do in the meantime.`,
    ],
    footnote:
      'If you think this is taking too long, get in touch with NextShelf support.',
  }),
  REJECTED: (org) => ({
    subject: `About your ${org} registration`,
    heading: 'Your registration was not approved',
    paragraphs: [
      `A NextShelf administrator reviewed <strong>${org}</strong> and wasn't able to approve it, so the library isn't available on NextShelf.`,
    ],
    footnote:
      'If you believe this was a mistake, get in touch with NextShelf support and we can take another look.',
  }),
  SUSPENDED: (org) => ({
    subject: `Access to ${org} is paused`,
    heading: 'Access is currently paused',
    paragraphs: [
      `We can't sign you in right now - a NextShelf administrator has suspended <strong>${org}</strong>.`,
      "Your library's catalog, members, and loan history are all still intact; access resumes as soon as the suspension is lifted.",
    ],
    footnote: 'Get in touch with NextShelf support to sort this out.',
  }),
  INACTIVE: (org) => ({
    subject: `${org} is not currently active`,
    heading: 'This library is not active',
    paragraphs: [
      `We can't sign you in right now - <strong>${org}</strong> isn't currently active on NextShelf.`,
    ],
    footnote: 'Get in touch with NextShelf support to reactivate it.',
  }),
};

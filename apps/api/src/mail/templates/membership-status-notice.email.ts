import {
  baseLayout,
  emailButton,
  emailFootnote,
  emailHeading,
  emailParagraph,
} from './base-layout';

export type MembershipStatusNoticeType =
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'ended';

interface MembershipStatusNoticeParams {
  patronName: string;
  organizationName: string;
  status: MembershipStatusNoticeType;
  browseLink?: string;
}

interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const STATUS_COPY: Record<
  MembershipStatusNoticeType,
  { heading: string; body: string; subject: string; ctaLabel?: string }
> = {
  approved: {
    heading: 'Your membership is approved',
    body: 'You can now sign in, browse the catalog, and manage your library activity online.',
    subject: 'Membership approved',
    ctaLabel: 'Browse the catalog',
  },
  rejected: {
    heading: 'Your membership request was declined',
    body: 'This library is unable to approve your request at the moment. If you think this was a mistake, contact the library directly.',
    subject: 'Membership request declined',
  },
  suspended: {
    heading: 'Your membership is suspended',
    body: 'Your library membership is currently suspended, so portal access is paused until it is restored.',
    subject: 'Membership suspended',
  },
  ended: {
    heading: 'Your membership has ended',
    body: 'Your library membership is no longer active. If you believe this is incorrect, contact the library team.',
    subject: 'Membership ended',
  },
};

export function membershipStatusNoticeEmail({
  patronName,
  organizationName,
  status,
  browseLink,
}: MembershipStatusNoticeParams): EmailContent {
  const copy = STATUS_COPY[status];
  const subject = `${copy.subject} at ${organizationName}`;
  const text = `${copy.heading}

Hi ${patronName},

${copy.body}

Organization: ${organizationName}
${
  browseLink && status === 'approved'
    ? `
Browse: ${browseLink}`
    : ''
}
`;

  const html = baseLayout({
    previewText: subject,
    bodyHtml: `
      ${emailHeading(copy.heading)}
      ${emailParagraph(`Hi ${patronName},`)}
      ${emailParagraph(copy.body)}
      ${emailParagraph(`Organization: ${organizationName}`)}
      ${browseLink && copy.ctaLabel ? `<p style="margin:0 0 8px;">${emailButton(copy.ctaLabel, browseLink)}</p>` : ''}
      ${emailFootnote('If you have questions about this update, contact the library team.')}
    `,
  });

  return { subject, text, html };
}

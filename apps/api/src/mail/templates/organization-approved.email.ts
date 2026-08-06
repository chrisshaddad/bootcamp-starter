import {
  baseLayout,
  emailButton,
  emailFootnote,
  emailHeading,
  emailParagraph,
} from './base-layout';

interface OrganizationApprovedEmailParams {
  adminName: string;
  organizationName: string;
  signInLink: string;
}

interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

/**
 * Sent when a SUPER_ADMIN approves a pending library. This - not the
 * registration email - is what carries the ORG_ADMIN's first sign-in link,
 * because approval is the moment the library actually gains access. Uses the
 * long (7-day) token expiry, like a staff invitation, since the admin isn't
 * sitting at the keyboard waiting for it.
 */
export function organizationApprovedEmail({
  adminName,
  organizationName,
  signInLink,
}: OrganizationApprovedEmailParams): EmailContent {
  const text = `${organizationName} is approved!\n\nGood news, ${adminName} - a NextShelf administrator has approved ${organizationName}. Your library is now live.\n\nUse the link below to sign in and start adding your catalog, staff, and members:\n\n${signInLink}\n\nThis link will expire in 7 days. After that you can always request a new one from the sign-in page.`;

  const html = baseLayout({
    previewText: `${organizationName} has been approved - sign in to get started`,
    bodyHtml: `
      ${emailHeading(`${organizationName} is approved!`)}
      ${emailParagraph(`Good news, <strong>${adminName}</strong> - a NextShelf administrator has approved <strong>${organizationName}</strong>. Your library is now live.`)}
      ${emailParagraph('Use the button below to sign in and start adding your catalog, staff, and members.')}
      <p style="margin:0 0 8px;">${emailButton('Sign in to NextShelf', signInLink)}</p>
      ${emailFootnote('This link will expire in 7 days. After that you can always request a new one from the sign-in page.')}
    `,
  });

  return {
    subject: `${organizationName} has been approved`,
    text,
    html,
  };
}

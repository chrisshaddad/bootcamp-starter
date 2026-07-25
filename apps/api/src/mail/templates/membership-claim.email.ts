import {
  baseLayout,
  emailButton,
  emailFootnote,
  emailHeading,
  emailParagraph,
} from './base-layout';

interface MembershipClaimEmailParams {
  patronName: string;
  organizationName: string;
  libraryCardNumber: string;
  claimLink: string;
}

interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export function membershipClaimEmail({
  patronName,
  organizationName,
  libraryCardNumber,
  claimLink,
}: MembershipClaimEmailParams): EmailContent {
  const text = `You're all set to manage your ${organizationName} account online\n\nHi ${patronName},\n\nYour library card ${libraryCardNumber} at ${organizationName} is now linked to an online account. Click the link below to sign in and start browsing, reserving, and buying online:\n\n${claimLink}\n\nThis link will expire in 7 days.\n\nIf you weren't expecting this email, you can safely ignore it.`;

  const html = baseLayout({
    previewText: `Your library card ${libraryCardNumber} at ${organizationName} is now linked online`,
    bodyHtml: `
      ${emailHeading(`You're all set to manage your ${organizationName} account online`)}
      ${emailParagraph(`Hi ${patronName}, your library card <strong>${libraryCardNumber}</strong> at <strong>${organizationName}</strong> is now linked to an online account.`)}
      ${emailParagraph('Click the button below to sign in and start browsing, reserving, and buying online. This link will expire in 7 days.')}
      <p style="margin:0 0 8px;">${emailButton('Sign In', claimLink)}</p>
      ${emailFootnote("If you weren't expecting this email, you can safely ignore it.")}
    `,
  });

  return {
    subject: `Your ${organizationName} library card is now linked online`,
    text,
    html,
  };
}

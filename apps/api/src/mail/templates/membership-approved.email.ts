import {
  baseLayout,
  emailButton,
  emailFootnote,
  emailHeading,
  emailParagraph,
} from './base-layout';

interface MembershipApprovedEmailParams {
  patronName: string;
  organizationName: string;
  browseLink: string;
}

interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export function membershipApprovedEmail({
  patronName,
  organizationName,
  browseLink,
}: MembershipApprovedEmailParams): EmailContent {
  const text = `Your membership at ${organizationName} is approved!\n\nHi ${patronName},\n\nA staff member has approved your membership request for ${organizationName}. You can now sign in to the customer portal, browse the catalog, and activate this library from My Libraries.\n\n${browseLink}\n\nIf you already have the portal open, refresh the page to see your new membership status.`;

  const html = baseLayout({
    previewText: `Your ${organizationName} membership is approved`,
    bodyHtml: `
      ${emailHeading(`Your membership at ${organizationName} is approved!`)}
      ${emailParagraph(`Hi <strong>${patronName}</strong>, a staff member has approved your membership request for <strong>${organizationName}</strong>.`)}
      ${emailParagraph('You can now sign in to the customer portal, browse the catalog, and activate this library from My Libraries.')}
      <p style="margin:0 0 8px;">${emailButton('Browse the catalog', browseLink)}</p>
      ${emailFootnote('If you already have the portal open, refresh the page to see your new membership status.')}
    `,
  });

  return {
    subject: `Your membership at ${organizationName} is approved`,
    text,
    html,
  };
}

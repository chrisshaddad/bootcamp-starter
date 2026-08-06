import {
  baseLayout,
  emailFootnote,
  emailHeading,
  emailParagraph,
} from './base-layout';

interface OrganizationRegistrationReceivedEmailParams {
  adminName: string;
  organizationName: string;
}

interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

/**
 * Sent the moment a library self-registers. Deliberately contains NO sign-in
 * link - a library has no access until a NextShelf administrator approves it,
 * so shipping a magic link here would just be a button that 403s.
 */
export function organizationRegistrationReceivedEmail({
  adminName,
  organizationName,
}: OrganizationRegistrationReceivedEmailParams): EmailContent {
  const text = `Thanks, ${adminName}!\n\nWe've received your registration for ${organizationName}.\n\nA NextShelf administrator now reviews every new library before it goes live. Once ${organizationName} is approved we'll email you a sign-in link so you can set up your catalog, staff, and members.\n\nThere's nothing you need to do in the meantime.\n\nIf you didn't register this library, you can safely ignore this email.`;

  const html = baseLayout({
    previewText: `We've received your registration for ${organizationName}`,
    bodyHtml: `
      ${emailHeading(`Thanks, ${adminName}!`)}
      ${emailParagraph(`We've received your registration for <strong>${organizationName}</strong>.`)}
      ${emailParagraph(`A NextShelf administrator reviews every new library before it goes live. Once <strong>${organizationName}</strong> is approved, we'll email you a sign-in link so you can set up your catalog, staff, and members.`)}
      ${emailParagraph("There's nothing you need to do in the meantime.")}
      ${emailFootnote("If you didn't register this library, you can safely ignore this email.")}
    `,
  });

  return {
    subject: `We've received your registration for ${organizationName}`,
    text,
    html,
  };
}

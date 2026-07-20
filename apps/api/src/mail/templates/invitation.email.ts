import {
  baseLayout,
  emailButton,
  emailFootnote,
  emailHeading,
  emailParagraph,
} from './base-layout';

interface InvitationEmailParams {
  inviterName: string;
  organizationName: string;
  invitationLink: string;
}

interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export function invitationEmail({
  inviterName,
  organizationName,
  invitationLink,
}: InvitationEmailParams): EmailContent {
  const text = `You're invited to ${organizationName}\n\n${inviterName} has invited you to join ${organizationName} on NextShelf.\n\nClick the link below to accept the invitation and create your account:\n\n${invitationLink}\n\nThis invitation will expire in 7 days.\n\nIf you weren't expecting this invitation, you can safely ignore this email.`;

  const html = baseLayout({
    previewText: `${inviterName} invited you to join ${organizationName} on NextShelf`,
    bodyHtml: `
      ${emailHeading(`You're invited to ${organizationName}`)}
      ${emailParagraph(`<strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on NextShelf.`)}
      ${emailParagraph('Click the button below to accept the invitation and create your account. This invitation will expire in 7 days.')}
      <p style="margin:0 0 8px;">${emailButton('Accept Invitation', invitationLink)}</p>
      ${emailFootnote("If you weren't expecting this invitation, you can safely ignore this email.")}
    `,
  });

  return {
    subject: `You've been invited to join ${organizationName}`,
    text,
    html,
  };
}

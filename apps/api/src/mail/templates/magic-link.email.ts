import {
  baseLayout,
  emailButton,
  emailFootnote,
  emailHeading,
  emailParagraph,
} from './base-layout';

interface MagicLinkEmailParams {
  magicLink: string;
  userName?: string;
}

interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export function magicLinkEmail({
  magicLink,
  userName,
}: MagicLinkEmailParams): EmailContent {
  const heading = userName
    ? `Welcome back, ${userName}`
    : 'Sign in to your library';

  const text = `${heading}\n\nClick the link below to sign in to your account:\n\n${magicLink}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this link, you can safely ignore this email.`;

  const html = baseLayout({
    previewText: 'Your NextShelf sign-in link',
    bodyHtml: `
      ${emailHeading(heading)}
      ${emailParagraph('Click the button below to access your account. This link will expire in 15 minutes.')}
      <p style="margin:0 0 8px;">${emailButton('Sign in to NextShelf', magicLink)}</p>
      ${emailFootnote("If you didn't request this link, you can safely ignore this email.")}
    `,
  });

  return { subject: 'Sign in to NextShelf', text, html };
}

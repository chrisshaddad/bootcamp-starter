import {
  baseLayout,
  emailButton,
  emailFootnote,
  emailHeading,
  emailParagraph,
} from './base-layout';

export type CustomerBookNoticeType =
  | 'rental-accepted'
  | 'rental-rejected'
  | 'pickup-ready'
  | 'order-placed';

interface CustomerBookNoticeParams {
  patronName: string;
  organizationName: string;
  type: CustomerBookNoticeType;
  bookTitle?: string;
  dueDate?: string;
  itemTitles?: string[];
  total?: string;
  reason?: string;
  actionLink?: string;
  actionLabel?: string;
}

interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const TYPE_COPY: Record<
  CustomerBookNoticeType,
  { heading: string; subject: string; intro: string }
> = {
  'rental-accepted': {
    heading: 'Your rental is confirmed',
    subject: 'Rental confirmed',
    intro: 'Your requested item is now checked out and ready for you.',
  },
  'rental-rejected': {
    heading: 'Your rental request was declined',
    subject: 'Rental request declined',
    intro: 'We could not complete this rental request.',
  },
  'pickup-ready': {
    heading: 'Your hold is ready for pickup',
    subject: 'Hold ready for pickup',
    intro: 'A copy has been set aside for you and is waiting at the library.',
  },
  'order-placed': {
    heading: 'Your order has been placed',
    subject: 'Order placed',
    intro: 'We have received your order and are processing it now.',
  },
};

function renderList(items: string[]): string {
  if (items.length === 0) {
    return '';
  }

  return `
    <ul style="margin:0 0 20px; padding-left:20px; color:#4a3218; font-size:15px; line-height:1.6;">
      ${items.map((item) => `<li>${item}</li>`).join('')}
    </ul>
  `;
}

export function customerBookNoticeEmail({
  patronName,
  organizationName,
  type,
  bookTitle,
  dueDate,
  itemTitles = [],
  total,
  reason,
  actionLink,
  actionLabel,
}: CustomerBookNoticeParams): EmailContent {
  const copy = TYPE_COPY[type];
  const subject = `${copy.subject} at ${organizationName}`;

  const detailLines: string[] = [];

  if (bookTitle) {
    detailLines.push(`Title: ${bookTitle}`);
  }

  if (dueDate) {
    detailLines.push(`Due date: ${new Date(dueDate).toLocaleDateString()}`);
  }

  if (total) {
    detailLines.push(`Total: $${total}`);
  }

  if (reason) {
    detailLines.push(`Reason: ${reason}`);
  }

  const itemBlock = itemTitles.length
    ? renderList(itemTitles.map((item) => item))
    : '';

  const text = `${copy.heading}

Hi ${patronName},

${copy.intro}

${detailLines.join('\n')}${detailLines.length > 0 ? '\n' : ''}
${itemTitles.length > 0 ? `Items: ${itemTitles.join(', ')}\n` : ''}`;

  const html = baseLayout({
    previewText: subject,
    bodyHtml: `
      ${emailHeading(copy.heading)}
      ${emailParagraph(`Hi ${patronName},`)}
      ${emailParagraph(copy.intro)}
      ${detailLines.map((line) => emailParagraph(line)).join('')}
      ${itemBlock}
      ${actionLink && actionLabel ? `<p style="margin:0 0 8px;">${emailButton(actionLabel, actionLink)}</p>` : ''}
      ${emailFootnote(`Organization: ${organizationName}`)}
    `,
  });

  return { subject, text, html };
}

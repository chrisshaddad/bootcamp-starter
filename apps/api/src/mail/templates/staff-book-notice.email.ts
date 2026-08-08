import {
  baseLayout,
  emailDateStamp,
  emailFootnote,
  emailHeading,
  emailParagraph,
} from './base-layout';

export type StaffBookNoticeType =
  | 'membership-request'
  | 'reservation-created'
  | 'order-placed'
  | 'overdue-return';

interface StaffBookNoticeParams {
  staffName?: string;
  organizationName: string;
  type: StaffBookNoticeType;
  patronName?: string;
  patronEmail?: string;
  libraryCardNumber?: string;
  bookTitle?: string;
  itemTitles?: string[];
  total?: string;
  dueDate?: string;
}

interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const TYPE_COPY: Record<
  StaffBookNoticeType,
  { heading: string; subject: string; intro: string }
> = {
  'membership-request': {
    heading: 'New membership request',
    subject: 'New membership request',
    intro: 'A customer has requested access to this library.',
  },
  'reservation-created': {
    heading: 'New book reservation',
    subject: 'New book reservation',
    intro: 'A customer reserved a book and may need a copy prepared.',
  },
  'order-placed': {
    heading: 'New book order',
    subject: 'New book order placed',
    intro: 'A customer has placed a new order in the portal.',
  },
  'overdue-return': {
    heading: 'Overdue rental alert',
    subject: 'Overdue rental alert',
    intro: 'A rental has moved into overdue status and needs follow-up.',
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

export function staffBookNoticeEmail({
  staffName,
  organizationName,
  type,
  patronName,
  patronEmail,
  libraryCardNumber,
  bookTitle,
  itemTitles = [],
  total,
  dueDate,
}: StaffBookNoticeParams): EmailContent {
  const copy = TYPE_COPY[type];
  const subject = `${copy.subject} for ${organizationName}`;

  const lines: string[] = [];

  if (patronName) {
    lines.push(`Patron: ${patronName}`);
  }

  if (patronEmail) {
    lines.push(`Email: ${patronEmail}`);
  }

  if (libraryCardNumber) {
    lines.push(`Card number: ${libraryCardNumber}`);
  }

  if (bookTitle) {
    lines.push(`Book: ${bookTitle}`);
  }

  if (total) {
    lines.push(`Total: $${total}`);
  }

  const text = `${copy.heading}

${staffName ? `Hi ${staffName},\n\n` : ''}${copy.intro}

${lines.join('\n')}${lines.length > 0 ? '\n' : ''}
${itemTitles.length > 0 ? `Items: ${itemTitles.join(', ')}\n` : ''}${dueDate ? `Due date: ${new Date(dueDate).toLocaleDateString()}\n` : ''}`;

  const html = baseLayout({
    previewText: subject,
    bodyHtml: `
      ${emailHeading(copy.heading)}
      ${staffName ? emailParagraph(`Hi ${staffName},`) : ''}
      ${emailParagraph(copy.intro)}
      ${lines.map((line) => emailParagraph(line)).join('')}
      ${itemTitles.length > 0 ? renderList(itemTitles) : ''}
      ${dueDate ? emailDateStamp({ label: 'Due date', date: new Date(dueDate).toLocaleDateString(), color: '#a86215', background: '#fff5e8' }) : ''}
      ${emailFootnote(`Organization: ${organizationName}`)}
    `,
  });

  return { subject, text, html };
}

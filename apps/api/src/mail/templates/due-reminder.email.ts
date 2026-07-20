import {
  baseLayout,
  emailDateStamp,
  emailFootnote,
  emailHeading,
  emailParagraph,
} from './base-layout';

type ReminderType = 'DUE_IN_5_DAYS' | 'DUE_TOMORROW' | 'DUE_TODAY';

interface DueReminderEmailParams {
  userName?: string;
  bookTitle: string;
  // ISO string - job data must be JSON-serializable, so this isn't a Date.
  dueDate: string;
  reminderType: ReminderType;
}

interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const PHRASE_BY_TYPE: Record<ReminderType, (date: string) => string> = {
  DUE_IN_5_DAYS: (date) => `is due in 5 days, on ${date}`,
  DUE_TOMORROW: (date) => `is due tomorrow, ${date}`,
  DUE_TODAY: (date) => `is due today, ${date}`,
};

const HEADING_BY_TYPE: Record<ReminderType, string> = {
  DUE_IN_5_DAYS: 'Your book is due soon',
  DUE_TOMORROW: 'Your book is due tomorrow',
  DUE_TODAY: 'Your book is due today',
};

const SUBJECT_BY_TYPE: Record<ReminderType, (title: string) => string> = {
  DUE_IN_5_DAYS: (title) => `Reminder: "${title}" is due in 5 days`,
  DUE_TOMORROW: (title) => `Reminder: "${title}" is due tomorrow`,
  DUE_TODAY: (title) => `Reminder: "${title}" is due today`,
};

// DUE_TODAY reads as more urgent than a routine heads-up - same warm palette
// as the app's own OVERDUE/error treatment, so the escalation feels
// consistent with what the patron would see in the product itself.
const STAMP_BY_TYPE: Record<
  ReminderType,
  { color: string; background: string }
> = {
  DUE_IN_5_DAYS: { color: '#985c1e', background: '#fef8ec' },
  DUE_TOMORROW: { color: '#78481c', background: '#ffde65' },
  DUE_TODAY: { color: '#c02337', background: '#ffedec' },
};

export function dueReminderEmail({
  userName,
  bookTitle,
  dueDate,
  reminderType,
}: DueReminderEmailParams): EmailContent {
  const greeting = userName ? `Hi ${userName} -` : 'Hi there -';
  const formattedDate = new Date(dueDate).toLocaleDateString();
  const stamp = STAMP_BY_TYPE[reminderType];

  const text = `${HEADING_BY_TYPE[reminderType]}\n\n${greeting} "${bookTitle}" ${PHRASE_BY_TYPE[reminderType](formattedDate)}. Please return it on time to avoid a late fee.\n\nIf you've already returned it, you can safely ignore this email.`;

  const html = baseLayout({
    previewText: `"${bookTitle}" ${PHRASE_BY_TYPE[reminderType](formattedDate)}`,
    bodyHtml: `
      ${emailHeading(HEADING_BY_TYPE[reminderType])}
      ${emailParagraph(`${greeting} <strong>"${bookTitle}"</strong> ${PHRASE_BY_TYPE[reminderType](formattedDate)}. Please return it on time to avoid a late fee.`)}
      ${emailDateStamp({
        label: 'Return by',
        date: formattedDate,
        color: stamp.color,
        background: stamp.background,
      })}
      ${emailFootnote("If you've already returned it, you can safely ignore this email.")}
    `,
  });

  return { subject: SUBJECT_BY_TYPE[reminderType](bookTitle), text, html };
}

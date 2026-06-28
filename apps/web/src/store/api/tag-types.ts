export const TAG_TYPES = [
  'Me',
  'Org',
  'Membership',
  'Subscription',
  'Payment',
  'Timeline',
  'Building',
] as const;

export type TagType = (typeof TAG_TYPES)[number];

export const TAG_TYPES = [
  'Me',
  'Org',
  'Membership',
  'Subscription',
  'Payment',
  'Timeline',
  'Building',
  'Floor',
  'Apartment',
  'Renter',
  'Lease',
  'Vendor',
  'MaintenanceRequest',
  'WorkOrder',
  'Expense',
  'Invoice',
] as const;

export type TagType = (typeof TAG_TYPES)[number];

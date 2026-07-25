import { recordCreateRequestSchema } from '@repo/contracts';

describe('recordCreateRequestSchema — prescription dosage', () => {
  const basePrescription = {
    recordType: 'PRESCRIPTION' as const,
    recordDate: '2026-01-01',
    prescription: {
      prescriptionDate: '2026-01-01',
      items: [
        {
          medicationName: 'Amoxicillin',
          dosage: 'one tablet',
          frequency: 'twice daily',
          route: 'ORAL',
        },
      ],
    },
  };

  it('accepts a free-text dosage with no digits', () => {
    const result = recordCreateRequestSchema.safeParse(basePrescription);

    expect(result.success).toBe(true);
  });

  it('still rejects an empty dosage', () => {
    const result = recordCreateRequestSchema.safeParse({
      ...basePrescription,
      prescription: {
        ...basePrescription.prescription,
        items: [{ ...basePrescription.prescription.items[0], dosage: '' }],
      },
    });

    expect(result.success).toBe(false);
  });
});

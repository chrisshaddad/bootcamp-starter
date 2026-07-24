import { z } from 'zod';
import { modalityTypeSchema } from './modality-type.schema';
import { prescriptionRouteSchema } from './prescription-route.schema';

// ---- Per-type detail payloads (create) --------------------------------

export const labResultDetailInputSchema = z.object({
  testName: z.string().min(1),
  testDate: z.string(), // ISO date
  labName: z.string().optional(),
});

export const consultationDetailInputSchema = z.object({
  chiefComplaint: z.string().min(1),
  findings: z.string().optional(),
  diagnosis: z.string().optional(),
  plan: z.string().optional(),
  followUpDate: z.string().optional(),
});

export const scanDetailInputSchema = z.object({
  modalityType: modalityTypeSchema,
  bodyPart: z.string().min(1),
  radiologistName: z.string().optional(),
  findings: z.string().optional(),
});

export const vaccinationDetailInputSchema = z.object({
  vaccineName: z.string().min(1),
  doseNumber: z.coerce.number().int().positive().optional(),
  administeredDate: z.string(),
  nextDoseDate: z.string().optional(),
  batchNumber: z.string().optional(),
  administeredBy: z.string().optional(),
});

export const prescriptionItemInputSchema = z.object({
  medicationName: z.string().min(1),
  dosage: z
    .string()
    .min(1)
    .regex(/\d/, 'Dosage should include a number (e.g. 500mg, 2 tablets)'),
  frequency: z.string().min(1),
  duration: z.string().optional(),
  route: prescriptionRouteSchema,
  notes: z.string().optional(),
});

export const prescriptionDetailInputSchema = z
  .object({
    prescriptionDate: z.string(),
    items: z.array(prescriptionItemInputSchema).min(1),
  })
  .refine(
    (data) => {
      const names = data.items.map((item) =>
        item.medicationName.trim().toLowerCase(),
      );
      return new Set(names).size === names.length;
    },
    {
      message: 'Each medication can only appear once in a prescription',
      path: ['items'],
    },
  );

// ---- Common base fields shared by every record type -------------------

const baseFields = {
  recordDate: z.string(), // ISO date the event occurred
  institutionOfOrigin: z.string().optional(),
  requestedBy: z.string().optional(),
  notes: z.string().optional(),
};

// Request for POST /patients/:patientId/records — discriminated on recordType
// so each type carries exactly its own structured detail.
export const recordCreateRequestSchema = z.discriminatedUnion('recordType', [
  z.object({
    recordType: z.literal('LAB_RESULT'),
    ...baseFields,
    labResult: labResultDetailInputSchema,
  }),
  z.object({
    recordType: z.literal('CONSULTATION'),
    ...baseFields,
    consultation: consultationDetailInputSchema,
  }),
  z.object({
    recordType: z.literal('SCAN'),
    ...baseFields,
    scan: scanDetailInputSchema,
  }),
  z.object({
    recordType: z.literal('VACCINATION'),
    ...baseFields,
    vaccination: vaccinationDetailInputSchema,
  }),
  z.object({
    recordType: z.literal('PRESCRIPTION'),
    ...baseFields,
    prescription: prescriptionDetailInputSchema,
  }),
]);
export type RecordCreateRequest = z.infer<typeof recordCreateRequestSchema>;

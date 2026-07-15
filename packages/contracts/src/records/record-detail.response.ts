import { z } from 'zod';
import { recordTypeSchema } from './record-type.schema';
import { modalityTypeSchema } from './modality-type.schema';
import { prescriptionRouteSchema } from './prescription-route.schema';
import { recordFileResponseSchema } from './record-file.response';
import { dateSchema } from '../common';

// ---- Per-type detail payloads (response) ------------------------------

export const labResultDetailResponseSchema = z.object({
  testName: z.string(),
  testDate: dateSchema,
  labName: z.string().nullable(),
});

export const consultationDetailResponseSchema = z.object({
  chiefComplaint: z.string(),
  findings: z.string().nullable(),
  diagnosis: z.string().nullable(),
  plan: z.string().nullable(),
  followUpDate: dateSchema.nullable(),
});

export const scanDetailResponseSchema = z.object({
  modalityType: modalityTypeSchema,
  bodyPart: z.string(),
  radiologistName: z.string().nullable(),
  findings: z.string().nullable(),
});

export const vaccinationDetailResponseSchema = z.object({
  vaccineName: z.string(),
  doseNumber: z.number().nullable(),
  administeredDate: dateSchema,
  nextDoseDate: dateSchema.nullable(),
  batchNumber: z.string().nullable(),
  administeredBy: z.string().nullable(),
});

export const prescriptionItemResponseSchema = z.object({
  id: z.uuid(),
  medicationName: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string().nullable(),
  route: prescriptionRouteSchema,
  notes: z.string().nullable(),
});

export const prescriptionDetailResponseSchema = z.object({
  prescriptionDate: dateSchema,
  items: z.array(prescriptionItemResponseSchema),
});

// ---- Full record ------------------------------------------------------

// Response from GET /records/:id — the base record plus exactly one populated
// detail block (matching recordType) and any file attachments.
export const recordDetailResponseSchema = z.object({
  id: z.uuid(),
  patientId: z.uuid(),
  recordType: recordTypeSchema,
  recordDate: dateSchema,
  institutionOfOrigin: z.string().nullable(),
  requestedBy: z.string().nullable(),
  notes: z.string().nullable(),
  isVoid: z.boolean(),
  uploadedByName: z.string(),
  files: z.array(recordFileResponseSchema),

  labResult: labResultDetailResponseSchema.nullable(),
  consultation: consultationDetailResponseSchema.nullable(),
  scan: scanDetailResponseSchema.nullable(),
  vaccination: vaccinationDetailResponseSchema.nullable(),
  prescription: prescriptionDetailResponseSchema.nullable(),

  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type RecordDetailResponse = z.infer<typeof recordDetailResponseSchema>;

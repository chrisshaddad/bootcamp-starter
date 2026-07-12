import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ReadStream } from 'fs';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FileStorageService } from '../files/file-storage.service';
import { isProfessionalAssigned } from '../common/access/patient-access';
import type { User } from '@repo/db';
import type {
  RecordCreateRequest,
  RecordListQuery,
  RecordListResponse,
  RecordDetailResponse,
  RecordFileResponse,
  RecordType,
} from '@repo/contracts';

export interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

type RecordScope = {
  id: string;
  patientId: string;
  institutionId: string;
  patientUserId: string;
};

@Injectable()
export class MedicalRecordsService {
  private readonly logger = new Logger(MedicalRecordsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly fileStorage: FileStorageService,
  ) {}

  async create(
    patientId: string,
    data: RecordCreateRequest,
    actor: User,
  ): Promise<RecordDetailResponse> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, institutionId: true, userId: true },
    });

    if (!patient || patient.institutionId !== actor.institutionId) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    // A professional may only add records for patients they are assigned to.
    const assignment = await this.prisma.assignment.findFirst({
      where: { professionalId: actor.id, patientId, status: 'ACTIVE' },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenException('You are not assigned to this patient');
    }

    const recordId = await this.prisma.$transaction(async (tx) => {
      const record = await tx.medicalRecord.create({
        data: {
          patientId,
          uploadedById: actor.id,
          assignmentId: assignment.id,
          institutionId: actor.institutionId,
          recordType: data.recordType,
          recordDate: new Date(data.recordDate),
          institutionOfOrigin: data.institutionOfOrigin ?? null,
          requestedBy: data.requestedBy ?? null,
          notes: data.notes ?? null,
        },
      });

      switch (data.recordType) {
        case 'LAB_RESULT':
          await tx.labResultDetail.create({
            data: {
              recordId: record.id,
              testName: data.labResult.testName,
              testDate: new Date(data.labResult.testDate),
              labName: data.labResult.labName ?? null,
            },
          });
          break;
        case 'CONSULTATION':
          await tx.consultationDetail.create({
            data: {
              recordId: record.id,
              chiefComplaint: data.consultation.chiefComplaint,
              findings: data.consultation.findings ?? null,
              diagnosis: data.consultation.diagnosis ?? null,
              plan: data.consultation.plan ?? null,
              followUpDate: data.consultation.followUpDate
                ? new Date(data.consultation.followUpDate)
                : null,
            },
          });
          break;
        case 'SCAN':
          await tx.scanDetail.create({
            data: {
              recordId: record.id,
              modalityType: data.scan.modalityType,
              bodyPart: data.scan.bodyPart,
              radiologistName: data.scan.radiologistName ?? null,
              findings: data.scan.findings ?? null,
            },
          });
          break;
        case 'VACCINATION':
          await tx.vaccinationDetail.create({
            data: {
              recordId: record.id,
              vaccineName: data.vaccination.vaccineName,
              doseNumber: data.vaccination.doseNumber ?? null,
              administeredDate: new Date(data.vaccination.administeredDate),
              nextDoseDate: data.vaccination.nextDoseDate
                ? new Date(data.vaccination.nextDoseDate)
                : null,
              batchNumber: data.vaccination.batchNumber ?? null,
              administeredBy: data.vaccination.administeredBy ?? null,
            },
          });
          break;
        case 'PRESCRIPTION':
          await tx.prescription.create({
            data: {
              recordId: record.id,
              prescriptionDate: new Date(data.prescription.prescriptionDate),
              items: {
                create: data.prescription.items.map((item) => ({
                  medicationName: item.medicationName,
                  dosage: item.dosage,
                  frequency: item.frequency,
                  duration: item.duration ?? null,
                  route: item.route,
                  notes: item.notes ?? null,
                })),
              },
            },
          });
          break;
      }

      return record.id;
    });

    await this.notifications.create({
      recipientId: patient.userId,
      senderId: actor.id,
      title: this.notificationTitle(data.recordType),
      body: `A new ${this.readableType(data.recordType)} was added to your records.`,
      linkedEntityType: 'MEDICAL_RECORD',
      linkedEntityId: recordId,
    });

    this.logger.log(`Record ${recordId} created for patient ${patientId}`);
    return this.buildDetail(recordId);
  }

  async findForPatient(
    patientId: string,
    query: RecordListQuery,
    actor: User,
  ): Promise<RecordListResponse> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, institutionId: true, userId: true },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    await this.assertCanViewPatient(patient, actor);

    const records = await this.prisma.medicalRecord.findMany({
      where: {
        patientId,
        ...(query.recordType ? { recordType: query.recordType } : {}),
      },
      orderBy: { recordDate: 'desc' },
      include: {
        uploadedBy: { select: { fullName: true } },
        _count: { select: { files: true } },
        labResultDetail: { select: { testName: true } },
        consultationDetail: { select: { chiefComplaint: true } },
        scanDetail: { select: { modalityType: true, bodyPart: true } },
        vaccinationDetail: { select: { vaccineName: true } },
        prescription: { select: { _count: { select: { items: true } } } },
      },
    });

    return {
      records: records.map((r) => ({
        id: r.id,
        recordType: r.recordType,
        recordDate: r.recordDate,
        title: this.deriveTitle(r),
        uploadedByName: r.uploadedBy.fullName,
        fileCount: r._count.files,
        createdAt: r.createdAt,
      })),
    };
  }

  async findOne(id: string, actor: User): Promise<RecordDetailResponse> {
    await this.getAccessibleRecord(id, actor);
    return this.buildDetail(id);
  }

  async addFile(
    recordId: string,
    file: UploadedFile,
    actor: User,
  ): Promise<RecordFileResponse> {
    const record = await this.getAccessibleRecord(recordId, actor);

    // Only the assigned professional may attach files.
    if (
      !(await isProfessionalAssigned(this.prisma, actor.id, record.patientId))
    ) {
      throw new ForbiddenException('You are not assigned to this patient');
    }

    const { storedName } = await this.fileStorage.saveFile({
      buffer: file.buffer,
      originalName: file.originalname,
    });

    const created = await this.prisma.recordFile.create({
      data: {
        recordId,
        fileName: file.originalname,
        fileUrl: storedName,
        mimeType: file.mimetype,
      },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        uploadedAt: true,
      },
    });

    this.logger.log(`File ${created.id} attached to record ${recordId}`);
    return created;
  }

  async downloadFile(
    recordId: string,
    fileId: string,
    actor: User,
  ): Promise<{ stream: ReadStream; fileName: string; mimeType: string }> {
    await this.getAccessibleRecord(recordId, actor);

    const file = await this.prisma.recordFile.findFirst({
      where: { id: fileId, recordId },
      select: { fileName: true, fileUrl: true, mimeType: true },
    });

    if (!file || !this.fileStorage.fileExists(file.fileUrl)) {
      throw new NotFoundException('File not found');
    }

    return {
      stream: this.fileStorage.getFileStream(file.fileUrl),
      fileName: file.fileName,
      mimeType: file.mimeType,
    };
  }

  // ---- access helpers --------------------------------------------------

  private async getAccessibleRecord(
    recordId: string,
    actor: User,
  ): Promise<RecordScope> {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id: recordId },
      select: {
        id: true,
        patientId: true,
        institutionId: true,
        patient: { select: { userId: true } },
      },
    });

    if (!record) {
      throw new NotFoundException(`Record with ID ${recordId} not found`);
    }

    const scope: RecordScope = {
      id: record.id,
      patientId: record.patientId,
      institutionId: record.institutionId,
      patientUserId: record.patient.userId,
    };

    await this.assertCanViewRecord(scope, actor);
    return scope;
  }

  private async assertCanViewRecord(
    record: RecordScope,
    actor: User,
  ): Promise<void> {
    switch (actor.role) {
      case 'INSTITUTION_ADMIN':
        if (record.institutionId !== actor.institutionId) {
          throw new NotFoundException(`Record with ID ${record.id} not found`);
        }
        return;
      case 'PROFESSIONAL':
        if (
          record.institutionId !== actor.institutionId ||
          !(await isProfessionalAssigned(
            this.prisma,
            actor.id,
            record.patientId,
          ))
        ) {
          throw new ForbiddenException('You are not assigned to this patient');
        }
        return;
      case 'PATIENT':
        if (record.patientUserId !== actor.id) {
          throw new ForbiddenException('You can only view your own records');
        }
        return;
      default:
        // STAFF have no access to clinical records.
        throw new ForbiddenException('Access denied');
    }
  }

  private async assertCanViewPatient(
    patient: { id: string; institutionId: string; userId: string },
    actor: User,
  ): Promise<void> {
    switch (actor.role) {
      case 'INSTITUTION_ADMIN':
        if (patient.institutionId !== actor.institutionId) {
          throw new NotFoundException(
            `Patient with ID ${patient.id} not found`,
          );
        }
        return;
      case 'PROFESSIONAL':
        if (
          patient.institutionId !== actor.institutionId ||
          !(await isProfessionalAssigned(this.prisma, actor.id, patient.id))
        ) {
          throw new ForbiddenException('You are not assigned to this patient');
        }
        return;
      case 'PATIENT':
        if (patient.userId !== actor.id) {
          throw new ForbiddenException('You can only view your own records');
        }
        return;
      default:
        throw new ForbiddenException('Access denied');
    }
  }

  // ---- mapping helpers -------------------------------------------------

  private deriveTitle(record: {
    recordType: RecordType;
    labResultDetail: { testName: string } | null;
    consultationDetail: { chiefComplaint: string } | null;
    scanDetail: { modalityType: string; bodyPart: string } | null;
    vaccinationDetail: { vaccineName: string } | null;
    prescription: { _count: { items: number } } | null;
  }): string {
    switch (record.recordType) {
      case 'LAB_RESULT':
        return record.labResultDetail?.testName ?? 'Lab Result';
      case 'CONSULTATION':
        return record.consultationDetail?.chiefComplaint ?? 'Consultation';
      case 'SCAN':
        return record.scanDetail
          ? `${record.scanDetail.modalityType} — ${record.scanDetail.bodyPart}`
          : 'Scan';
      case 'VACCINATION':
        return record.vaccinationDetail?.vaccineName ?? 'Vaccination';
      case 'PRESCRIPTION':
        return `Prescription (${record.prescription?._count.items ?? 0} item(s))`;
      default:
        return 'Record';
    }
  }

  private readableType(type: RecordType): string {
    return type.toLowerCase().replace(/_/g, ' ');
  }

  private notificationTitle(type: RecordType): string {
    return type === 'LAB_RESULT' ? 'New lab result' : 'New medical record';
  }

  private async buildDetail(id: string): Promise<RecordDetailResponse> {
    const record = await this.prisma.medicalRecord.findUniqueOrThrow({
      where: { id },
      include: {
        uploadedBy: { select: { fullName: true } },
        files: {
          orderBy: { uploadedAt: 'desc' },
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            uploadedAt: true,
          },
        },
        labResultDetail: true,
        consultationDetail: true,
        scanDetail: true,
        vaccinationDetail: true,
        prescription: { include: { items: true } },
      },
    });

    return {
      id: record.id,
      patientId: record.patientId,
      recordType: record.recordType,
      recordDate: record.recordDate,
      institutionOfOrigin: record.institutionOfOrigin,
      requestedBy: record.requestedBy,
      notes: record.notes,
      isVoid: record.isVoid,
      uploadedByName: record.uploadedBy.fullName,
      files: record.files,
      labResult: record.labResultDetail
        ? {
            testName: record.labResultDetail.testName,
            testDate: record.labResultDetail.testDate,
            labName: record.labResultDetail.labName,
          }
        : null,
      consultation: record.consultationDetail
        ? {
            chiefComplaint: record.consultationDetail.chiefComplaint,
            findings: record.consultationDetail.findings,
            diagnosis: record.consultationDetail.diagnosis,
            plan: record.consultationDetail.plan,
            followUpDate: record.consultationDetail.followUpDate,
          }
        : null,
      scan: record.scanDetail
        ? {
            modalityType: record.scanDetail.modalityType,
            bodyPart: record.scanDetail.bodyPart,
            radiologistName: record.scanDetail.radiologistName,
            findings: record.scanDetail.findings,
          }
        : null,
      vaccination: record.vaccinationDetail
        ? {
            vaccineName: record.vaccinationDetail.vaccineName,
            doseNumber: record.vaccinationDetail.doseNumber,
            administeredDate: record.vaccinationDetail.administeredDate,
            nextDoseDate: record.vaccinationDetail.nextDoseDate,
            batchNumber: record.vaccinationDetail.batchNumber,
            administeredBy: record.vaccinationDetail.administeredBy,
          }
        : null,
      prescription: record.prescription
        ? {
            prescriptionDate: record.prescription.prescriptionDate,
            items: record.prescription.items.map((item) => ({
              id: item.id,
              medicationName: item.medicationName,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
              route: item.route,
              notes: item.notes,
            })),
          }
        : null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}

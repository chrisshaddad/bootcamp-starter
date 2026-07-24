import { Test, TestingModule } from '@nestjs/testing';
import { RecordsController } from './records.controller';
import { PatientRecordsController } from './patient-records.controller';
import { MedicalRecordsService } from './medical-records.service';

describe('MedicalRecords controllers', () => {
  let records: RecordsController;
  let patientRecords: PatientRecordsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecordsController, PatientRecordsController],
      providers: [
        {
          provide: MedicalRecordsService,
          useValue: {
            create: jest.fn(),
            findForPatient: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            addFile: jest.fn(),
            downloadFile: jest.fn(),
          },
        },
      ],
    }).compile();

    records = module.get<RecordsController>(RecordsController);
    patientRecords = module.get<PatientRecordsController>(
      PatientRecordsController,
    );
  });

  it('should be defined', () => {
    expect(records).toBeDefined();
    expect(patientRecords).toBeDefined();
  });
});

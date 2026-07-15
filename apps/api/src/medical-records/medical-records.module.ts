import { Module } from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { PatientRecordsController } from './patient-records.controller';
import { RecordsController } from './records.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [NotificationsModule, FilesModule],
  providers: [MedicalRecordsService],
  controllers: [PatientRecordsController, RecordsController],
})
export class MedicalRecordsModule {}

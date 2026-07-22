import { Module } from '@nestjs/common';
import { SavedCandidatesController } from './saved-candidates.controller';
import { SavedCandidatesService } from './saved-candidates.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SavedCandidatesController],
  providers: [SavedCandidatesService],
})
export class SavedCandidatesModule {}

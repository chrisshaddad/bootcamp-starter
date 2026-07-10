import { Global, Module } from '@nestjs/common';
import { LeaseStatusService } from './lease-status.service';

@Global()
@Module({
  providers: [LeaseStatusService],
  exports: [LeaseStatusService],
})
export class LeaseStatusModule {}

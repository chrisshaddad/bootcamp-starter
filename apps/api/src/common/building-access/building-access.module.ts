import { Global, Module } from '@nestjs/common';
import { BuildingAccessService } from './building-access.service';

@Global()
@Module({
  providers: [BuildingAccessService],
  exports: [BuildingAccessService],
})
export class BuildingAccessModule {}

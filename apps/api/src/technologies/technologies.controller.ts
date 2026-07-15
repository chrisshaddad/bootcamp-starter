import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TechnologiesService } from './technologies.service';
import { Public } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  technologyExploreQuerySchema,
  type TechnologyExploreQuery,
} from '@repo/contracts';

@ApiTags('technologies')
@Controller('technologies')
export class TechnologiesController {
  constructor(private readonly techService: TechnologiesService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Search global technologies for autocomplete dropdowns',
  })
  @ApiResponse({
    status: 200,
    description: 'List of technologies matching criteria.',
  })
  async explore(
    @Query(new ZodValidationPipe(technologyExploreQuerySchema))
    query: TechnologyExploreQuery,
  ) {
    const results = await this.techService.explore(query);

    // Select strictly necessary public properties avoiding raw DB fields like createdAt/updatedAt
    return results.map((tech) => ({
      id: tech.id,
      name: tech.name,
      slug: tech.slug,
      category: tech.category,
    }));
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { UpdateOrgDto } from './dto/update-org.dto';
import { TimelineService } from '@/modules/timeline/timeline.service';

@Injectable()
export class OrgService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
  ) {}

  async findOne(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        subscription: {
          select: {
            status: true,
            currentPeriodEnd: true,
            priceId: true,
          },
        },
      },
    });

    if (!org) throw new NotFoundException('Organisation not found.');
    return org;
  }

  async update(orgId: string, actorId: string, dto: UpdateOrgDto) {
    const org = await this.prisma.organization.update({
      where: { id: orgId },
      data: { name: dto.name },
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'org.updated',
      targetType: 'Organization',
      targetId: orgId,
      metadata: { name: dto.name },
    });

    return org;
  }
}

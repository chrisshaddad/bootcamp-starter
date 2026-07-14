import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TechnologyExploreQuery } from '@repo/contracts';
import { Prisma } from '@repo/db';

@Injectable()
export class TechnologiesService {
  constructor(private prisma: PrismaService) {}

  async explore(query: TechnologyExploreQuery) {
    const where: Prisma.TechnologyWhereInput = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query.category) {
      where.category = query.category;
    }

    return this.prisma.technology.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 50, // Limit autocomplete results
    });
  }
}

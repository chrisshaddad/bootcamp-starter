import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { AlertListResponse, AlertResponse } from '@repo/contracts';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
    },
  ): Promise<AlertListResponse> {
    const { page = 1, limit = 20, status } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId };
    if (status) where.status = status;

    const [alerts, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.alert.count({ where }),
    ]);

    return {
      alerts: alerts.map((a) => this.toResponse(a)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, organizationId: string): Promise<AlertResponse> {
    const alert = await this.prisma.alert.findFirst({
      where: { id, organizationId },
    });

    if (!alert) {
      throw new NotFoundException(`Alert ${id} not found`);
    }

    return this.toResponse(alert);
  }

  async dismiss(id: string, organizationId: string): Promise<AlertResponse> {
    await this.findOne(id, organizationId);

    const alert = await this.prisma.alert.update({
      where: { id },
      data: { status: 'DISMISSED', resolvedAt: new Date() },
    });

    this.logger.log(`Alert ${id} dismissed`);
    return this.toResponse(alert);
  }

  /**
   * Evaluate goal progress and create/update threshold alerts.
   * Called by a nightly scheduler or after every dashboard compute.
   */
  async evaluateGoalAlerts(
    organizationId: string,
    goalProgress: Array<{
      goalId: string;
      progressPct: number;
      currentAmount: string;
      targetAmount: string;
    }>,
  ): Promise<void> {
    for (const gp of goalProgress) {
      const goal = await this.prisma.goal.findFirst({
        where: { id: gp.goalId, organizationId },
      });

      if (!goal) continue;

      // Default alert thresholds: 80% achieved for profit/revenue, 80% spent for expense limit
      const thresholdPct = 80;
      const shouldTrigger = gp.progressPct >= thresholdPct;

      if (!shouldTrigger) continue;

      // Check if we already have a TRIGGERED alert for this goal
      const existing = await this.prisma.alert.findFirst({
        where: {
          organizationId,
          goalId: gp.goalId,
          status: { in: ['ACTIVE', 'TRIGGERED'] },
        },
      });

      if (existing) {
        // Update to TRIGGERED if not already
        if (existing.status === 'ACTIVE') {
          await this.prisma.alert.update({
            where: { id: existing.id },
            data: { status: 'TRIGGERED', triggeredAt: new Date() },
          });
        }
      } else {
        const isExpenseLimit = goal.type === 'EXPENSE_LIMIT';
        const title = isExpenseLimit
          ? `Expense limit ${thresholdPct}% reached`
          : `Goal ${thresholdPct}% achieved`;

        const message = isExpenseLimit
          ? `Your expense limit goal has reached ${gp.progressPct.toFixed(1)}% of $${gp.targetAmount}. Current spend: $${gp.currentAmount}.`
          : `Your ${goal.type.toLowerCase().replace('_', ' ')} goal has reached ${gp.progressPct.toFixed(1)}% of $${gp.targetAmount}. Current: $${gp.currentAmount}.`;

        await this.prisma.alert.create({
          data: {
            organizationId,
            goalId: gp.goalId,
            status: 'TRIGGERED',
            title,
            message,
            thresholdPct: thresholdPct.toString(),
            triggeredAt: new Date(),
          },
        });

        this.logger.log(
          `Alert created for goal ${gp.goalId} (${gp.progressPct.toFixed(1)}%)`,
        );
      }
    }
  }

  private toResponse(a: any): AlertResponse {
    return {
      id: a.id,
      organizationId: a.organizationId,
      goalId: a.goalId,
      status: a.status,
      title: a.title,
      message: a.message,
      thresholdPct: a.thresholdPct ? a.thresholdPct.toString() : null,
      triggeredAt: a.triggeredAt ? a.triggeredAt.toISOString() : null,
      resolvedAt: a.resolvedAt ? a.resolvedAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import {
  BuildingAccessService,
  ORG_WIDE_BUILDING_ROLES,
} from '@/common/building-access/building-access.service';
import { Role } from '@/common/enums';
import { ExpenseCategory, ExpenseResponse } from '@repo/contracts';

type ExpenseRow = {
  id: string;
  orgId: string;
  buildingId: string | null;
  vendorId: string | null;
  workOrderId: string | null;
  category: string;
  amount: Prisma.Decimal;
  incurredAt: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly buildingAccess: BuildingAccessService,
  ) {}

  // ── Format helpers ────────────────────────────────────────────────────────

  private formatExpense(expense: ExpenseRow): ExpenseResponse {
    return {
      id: expense.id,
      orgId: expense.orgId,
      buildingId: expense.buildingId,
      vendorId: expense.vendorId,
      workOrderId: expense.workOrderId,
      category: expense.category as ExpenseCategory,
      amount: expense.amount.toString(),
      incurredAt: expense.incurredAt.toISOString(),
      notes: expense.notes,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }

  // ── CRUD (read) ───────────────────────────────────────────────────────────

  async findAll(
    orgId: string,
    callerId: string,
    callerRole: Role,
  ): Promise<{ data: ExpenseResponse[] }> {
    const allowedBuildingIds = await this.buildingAccess.getAllowedBuildingIds(
      orgId,
      callerId,
      callerRole,
    );

    const expenses = await this.prisma.expense.findMany({
      where: {
        orgId,
        ...(allowedBuildingIds && { buildingId: { in: allowedBuildingIds } }),
      },
      orderBy: { incurredAt: 'desc' },
    });

    return { data: expenses.map((e) => this.formatExpense(e)) };
  }

  async findOne(
    orgId: string,
    callerId: string,
    callerRole: Role,
    expenseId: string,
  ): Promise<{ data: ExpenseResponse }> {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, orgId },
    });
    if (!expense) throw new NotFoundException('Expense not found.');

    if (expense.buildingId) {
      await this.buildingAccess.assertBuildingAccess(
        orgId,
        callerId,
        callerRole,
        expense.buildingId,
      );
    } else if (!ORG_WIDE_BUILDING_ROLES.has(callerRole)) {
      // Org-wide expense (no building): building-scoped roles never see it.
      throw new ForbiddenException(
        'You are not permitted to view this expense.',
      );
    }

    return { data: this.formatExpense(expense) };
  }
}

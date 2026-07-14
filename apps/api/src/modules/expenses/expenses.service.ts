import {
  BadRequestException,
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
import { TimelineService } from '@/modules/timeline/timeline.service';
import { Role } from '@/common/enums';
import { ExpenseCategory, ExpenseResponse } from '@repo/contracts';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

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
    private readonly timeline: TimelineService,
  ) {}

  private assertWriteAccess(callerRole: Role): void {
    if (callerRole !== Role.ORG_ADMIN && callerRole !== Role.FINANCE) {
      throw new ForbiddenException(
        'Only an org admin or finance user can write to expenses.',
      );
    }
  }

  /**
   * Resolves the effective vendorId for a create/update payload. If
   * workOrderId is provided, auto-fills vendorId from that Work Order's own
   * vendorId when vendorId is omitted, and rejects when both are provided
   * but disagree.
   */
  private async resolveVendorId(
    orgId: string,
    vendorId: string | null | undefined,
    workOrderId: string | null | undefined,
  ): Promise<string | null | undefined> {
    if (!workOrderId) return vendorId;

    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, orgId },
      select: { vendorId: true },
    });

    if (vendorId === undefined) return workOrder?.vendorId ?? undefined;
    if (workOrder && vendorId !== workOrder.vendorId) {
      throw new BadRequestException(
        "vendorId does not match the Work Order's assigned vendor.",
      );
    }
    return vendorId;
  }

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

  // ── CRUD (write) ──────────────────────────────────────────────────────────

  async create(
    orgId: string,
    actorId: string,
    callerRole: Role,
    dto: CreateExpenseDto,
  ): Promise<{ data: ExpenseResponse }> {
    this.assertWriteAccess(callerRole);

    if (!dto.category || dto.amount === undefined || !dto.incurredAt) {
      throw new BadRequestException(
        'category, amount, and incurredAt are required.',
      );
    }

    const vendorId = await this.resolveVendorId(
      orgId,
      dto.vendorId,
      dto.workOrderId,
    );

    const expense = await this.prisma.expense.create({
      data: {
        orgId,
        buildingId: dto.buildingId,
        vendorId,
        workOrderId: dto.workOrderId,
        category: dto.category,
        amount: dto.amount,
        incurredAt: new Date(dto.incurredAt),
        notes: dto.notes,
      },
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'expense.created',
      targetType: 'Expense',
      targetId: expense.id,
      metadata: {
        category: expense.category,
        amount: expense.amount.toString(),
      },
    });

    return { data: this.formatExpense(expense) };
  }

  async update(
    orgId: string,
    actorId: string,
    callerRole: Role,
    expenseId: string,
    dto: UpdateExpenseDto,
  ): Promise<{ data: ExpenseResponse }> {
    this.assertWriteAccess(callerRole);

    const existing = await this.prisma.expense.findFirst({
      where: { id: expenseId, orgId },
    });
    if (!existing) throw new NotFoundException('Expense not found.');

    const vendorId = await this.resolveVendorId(
      orgId,
      dto.vendorId,
      dto.workOrderId,
    );

    const expense = await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        ...(dto.buildingId !== undefined && { buildingId: dto.buildingId }),
        ...(vendorId !== undefined && { vendorId }),
        ...(dto.workOrderId !== undefined && { workOrderId: dto.workOrderId }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.incurredAt !== undefined && {
          incurredAt: new Date(dto.incurredAt),
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'expense.updated',
      targetType: 'Expense',
      targetId: expenseId,
      metadata: { changes: Object.keys(dto) },
    });

    return { data: this.formatExpense(expense) };
  }

  async remove(
    orgId: string,
    actorId: string,
    callerRole: Role,
    expenseId: string,
  ): Promise<{ data: { id: string } }> {
    this.assertWriteAccess(callerRole);

    const existing = await this.prisma.expense.findFirst({
      where: { id: expenseId, orgId },
    });
    if (!existing) throw new NotFoundException('Expense not found.');

    await this.prisma.expense.delete({ where: { id: expenseId } });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'expense.deleted',
      targetType: 'Expense',
      targetId: expenseId,
      metadata: { category: existing.category },
    });

    return { data: { id: expenseId } };
  }
}

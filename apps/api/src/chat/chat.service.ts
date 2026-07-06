import { Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type ToolSet,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import {
  dashboardQuerySchema,
  expenseQuerySchema,
  saleQuerySchema,
} from '@repo/contracts';
import { DashboardService } from '../dashboard/dashboard.service';
import { ExpensesService } from '../expenses/expenses.service';
import { GoalsService } from '../goals/goals.service';
import { ProductsService } from '../products/products.service';
import { SalesService } from '../sales/sales.service';

// Gemini 2.5 Flash: fast, free-tier friendly, supports tool calling.
const CHAT_MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are Margin's assistant for small business owners.
You help owners understand the profitability of their products and services in
plain, encouraging language. Keep answers concise and concrete.

You have read-only tools to look up the owner's real data:
- businessSummary: revenue, costs, gross/net margin, break-even, expense breakdown,
  per-product contribution, monthly trend, and goal progress for a period. Prefer this
  for any "how is my business doing / what's my margin / am I profitable" question.
- topNExpenses, listProducts, listSales, listGoals: itemised lookups when the owner
  asks about specific expenses, products, sales, or targets.
All figures are already computed for you — never do the arithmetic yourself, read it
from the tool results. Call a tool whenever a question needs figures.
Never invent numbers — if the needed data is unavailable, say so plainly and explain
what you would need to answer it.`;

// The model may pass looser types (e.g. strings for numbers/booleans), so every
// numeric/boolean input is coerced. Limits are clamped so a tool call can never pull
// an unbounded result set into the model's context.
const topNExpensesInputSchema = expenseQuerySchema
  .pick({ categoryId: true, dateFrom: true, dateTo: true, search: true })
  .extend({
    limit: z.coerce.number().int().min(1).max(10).default(10),
  });

const listSalesInputSchema = saleQuerySchema
  .pick({ productId: true, dateFrom: true, dateTo: true, search: true })
  .extend({
    limit: z.coerce.number().int().min(1).max(20).default(20),
  });

const listProductsInputSchema = z.object({
  activeOnly: z.coerce
    .boolean()
    .default(false)
    .describe('Only include products currently marked active.'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const listGoalsInputSchema = z.object({
  activeOnly: z.coerce
    .boolean()
    .default(true)
    .describe('Only include goals that are currently active.'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly expensesService: ExpensesService,
    private readonly productsService: ProductsService,
    private readonly salesService: SalesService,
    private readonly goalsService: GoalsService,
  ) {}

  /**
   * Builds the read-only toolset the model may call, all scoped to a single
   * organization. Every tool delegates to a domain service so the metrics stay
   * computed in code — the model only interprets the results.
   */
  private buildTools(organizationId: string): ToolSet {
    return {
      businessSummary: tool({
        description:
          'Get the full financial summary (revenue, costs, gross/net margin, ' +
          'break-even, expense breakdown, per-product contribution, monthly trend, ' +
          'and goal progress) for a date range. Defaults to the current month.',
        inputSchema: dashboardQuerySchema,
        execute: (query) =>
          this.dashboardService.getMetrics(organizationId, query),
      }),

      topNExpenses: tool({
        description:
          'Get the top expenses for the organization, sorted by amount descending.',
        inputSchema: topNExpensesInputSchema,
        execute: (query) =>
          this.expensesService.getTopNExpenses(organizationId, {
            ...query,
            page: 1,
            limit: Math.min(query.limit, 10),
          }),
      }),

      listProducts: tool({
        description:
          "List the organization's products with their unit price and cost.",
        inputSchema: listProductsInputSchema,
        execute: ({ activeOnly, limit }) =>
          this.productsService.findAll(organizationId, {
            page: 1,
            limit,
            activeOnly,
          }),
      }),

      listSales: tool({
        description:
          'List recent sales, each with computed revenue and gross profit. ' +
          'Filter by product, date range, or a text search.',
        inputSchema: listSalesInputSchema,
        execute: ({ limit, ...filters }) =>
          this.salesService.findAll(organizationId, {
            ...filters,
            page: 1,
            limit,
          }),
      }),

      listGoals: tool({
        description:
          "List the organization's goals (revenue, profit, or expense targets).",
        inputSchema: listGoalsInputSchema,
        execute: ({ activeOnly, limit }) =>
          this.goalsService.findAll(organizationId, {
            page: 1,
            limit,
            activeOnly,
          }),
      }),
    };
  }

  /**
   * Streams a chat completion for the given conversation directly to the HTTP
   * response, using the AI SDK's UI message stream protocol that `useChat` expects.
   * The service owns the piping so the controller stays thin and the streamed
   * result type never crosses a public boundary (avoids a TS declaration-emit issue).
   */
  async streamChat(
    messages: UIMessage[],
    res: Response,
    organizationId: string,
  ): Promise<void> {
    const result = streamText({
      model: google(CHAT_MODEL),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: this.buildTools(organizationId),
      stopWhen: stepCountIs(5),
      onError: ({ error }) => {
        this.logger.error(
          'Chat streaming failed',
          error instanceof Error ? error.stack : String(error),
        );
      },
    });

    result.pipeUIMessageStreamToResponse(res);
  }
}

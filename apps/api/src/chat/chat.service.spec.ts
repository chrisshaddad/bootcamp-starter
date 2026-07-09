jest.mock('ai', () => ({
  streamText: jest.fn(),
  convertToModelMessages: jest.fn(),
  stepCountIs: jest.fn((count: number) => count),
  tool: jest.fn((config) => config),
}));
jest.mock('@ai-sdk/google', () => ({
  google: jest.fn(() => 'mock-model'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import type { UIMessage } from 'ai';
import { convertToModelMessages, streamText } from 'ai';
import { DashboardService } from '../dashboard/dashboard.service';
import { ExpensesService } from '../expenses/expenses.service';
import { GoalsService } from '../goals/goals.service';
import { ProductsService } from '../products/products.service';
import { SalesService } from '../sales/sales.service';
import { ChatService } from './chat.service';

const mockStreamText = streamText as unknown as jest.Mock;
const mockConvertToModelMessages =
  convertToModelMessages as unknown as jest.Mock;

describe('ChatService', () => {
  let service: ChatService;
  const pipeUIMessageStreamToResponse = jest.fn();
  const getMetrics = jest.fn();
  const getTopNExpenses = jest.fn();
  const findProducts = jest.fn();
  const findSales = jest.fn();
  const findGoals = jest.fn();

  const listResult = {
    meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
  };

  /** Grabs the tools record from the single streamText call. */
  const toolsFromStream = async (text: string) => {
    const messages = [
      { id: '1', role: 'user', parts: [{ type: 'text', text }] },
    ] as unknown as UIMessage[];
    await service.streamChat(messages, {} as Response, 'org-123');
    return mockStreamText.mock.calls[0][0].tools;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConvertToModelMessages.mockResolvedValue([]);
    mockStreamText.mockReturnValue({ pipeUIMessageStreamToResponse });
    getMetrics.mockResolvedValue({ totalRevenue: '0.00' });
    getTopNExpenses.mockResolvedValue({ expenses: [], ...listResult });
    findProducts.mockResolvedValue({ products: [], ...listResult });
    findSales.mockResolvedValue({ sales: [], ...listResult });
    findGoals.mockResolvedValue({ goals: [], ...listResult });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: DashboardService, useValue: { getMetrics } },
        { provide: ExpensesService, useValue: { getTopNExpenses } },
        { provide: ProductsService, useValue: { findAll: findProducts } },
        { provide: SalesService, useValue: { findAll: findSales } },
        { provide: GoalsService, useValue: { findAll: findGoals } },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('converts the messages and pipes the stream to the response', async () => {
    const messages = [
      { id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
    ] as unknown as UIMessage[];
    const res = {} as Response;

    await service.streamChat(messages, res, 'org-123');

    expect(mockConvertToModelMessages).toHaveBeenCalledWith(messages);
    expect(mockStreamText).toHaveBeenCalledTimes(1);
    expect(pipeUIMessageStreamToResponse).toHaveBeenCalledWith(res);
  });

  it('exposes the full read-only toolset', async () => {
    const tools = await toolsFromStream('what tools do you have');

    expect(Object.keys(tools).sort()).toEqual([
      'businessSummary',
      'listGoals',
      'listProducts',
      'listSales',
      'topNExpenses',
    ]);
  });

  it('routes businessSummary to the dashboard metrics for the org', async () => {
    const tools = await toolsFromStream('how is my business doing');

    await tools.businessSummary.execute({ dateFrom: '2026-01-01' });

    expect(getMetrics).toHaveBeenCalledWith('org-123', {
      dateFrom: '2026-01-01',
    });
  });

  it('clamps the topNExpenses limit to 10', async () => {
    const tools = await toolsFromStream('top expenses');

    await tools.topNExpenses.execute({ limit: 25, search: 'office' });

    expect(getTopNExpenses).toHaveBeenCalledWith('org-123', {
      limit: 10,
      page: 1,
      search: 'office',
    });
  });

  it('passes listSales filters and page through to the sales service', async () => {
    const tools = await toolsFromStream('recent sales');

    await tools.listSales.execute({ limit: 5, productId: 'prod-1' });

    expect(findSales).toHaveBeenCalledWith('org-123', {
      limit: 5,
      page: 1,
      productId: 'prod-1',
    });
  });

  it('forwards activeOnly to listProducts and listGoals', async () => {
    const tools = await toolsFromStream('active products and goals');

    await tools.listProducts.execute({ activeOnly: true, limit: 20 });
    await tools.listGoals.execute({ activeOnly: false, limit: 20 });

    expect(findProducts).toHaveBeenCalledWith('org-123', {
      page: 1,
      limit: 20,
      activeOnly: true,
    });
    expect(findGoals).toHaveBeenCalledWith('org-123', {
      page: 1,
      limit: 20,
      activeOnly: false,
    });
  });
});

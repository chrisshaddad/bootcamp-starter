jest.mock('ai', () => ({
  streamText: jest.fn(),
  convertToModelMessages: jest.fn(),
}));
jest.mock('@ai-sdk/google', () => ({
  google: jest.fn(() => 'mock-model'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import type { UIMessage } from 'ai';
import { convertToModelMessages, streamText } from 'ai';
import { ChatService } from './chat.service';

const mockStreamText = streamText as unknown as jest.Mock;
const mockConvertToModelMessages =
  convertToModelMessages as unknown as jest.Mock;

describe('ChatService', () => {
  let service: ChatService;
  const pipeUIMessageStreamToResponse = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConvertToModelMessages.mockResolvedValue([]);
    mockStreamText.mockReturnValue({ pipeUIMessageStreamToResponse });

    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatService],
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

    await service.streamChat(messages, res);

    expect(mockConvertToModelMessages).toHaveBeenCalledWith(messages);
    expect(mockStreamText).toHaveBeenCalledTimes(1);
    expect(pipeUIMessageStreamToResponse).toHaveBeenCalledWith(res);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import type { UIMessage } from 'ai';
import type { ChatRequest } from '@repo/contracts';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

describe('ChatController', () => {
  let controller: ChatController;
  const streamChat = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: ChatService, useValue: { streamChat } }],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    streamChat.mockReset();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates the messages and response to ChatService.streamChat', async () => {
    const messages = [
      { id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
    ] as unknown as UIMessage[];
    const res = {} as Response;
    const user = { organizationId: 'org-123' } as any;

    await controller.chat({ messages } as unknown as ChatRequest, user, res);

    expect(streamChat).toHaveBeenCalledWith(messages, res, 'org-123');
  });
});

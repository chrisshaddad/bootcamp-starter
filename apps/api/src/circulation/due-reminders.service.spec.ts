import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { DueRemindersService } from './due-reminders.service';
import { PrismaService } from '../database/prisma.service';
import { MAIL_QUEUE } from '../mail/mail.constants';

describe('DueRemindersService', () => {
  let service: DueRemindersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DueRemindersService,
        {
          provide: PrismaService,
          useValue: {
            rental: {
              updateMany: jest.fn(),
              findMany: jest.fn(),
            },
            $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
              callback({
                rental: { updateMany: jest.fn(), findMany: jest.fn() },
              }),
            ),
          },
        },
        {
          provide: getQueueToken(MAIL_QUEUE),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DueRemindersService>(DueRemindersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

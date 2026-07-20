import { Job } from 'bullmq';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationJobData } from './notifications.constants';

describe('NotificationsProcessor', () => {
  const jobData: NotificationJobData = {
    orgId: 'org-1',
    userId: 'sub-123',
    type: 'support_ticket.acknowledged',
    title: 'Support ticket received',
    body: 'We got it.',
  };

  function makeProcessor() {
    const notifications: any = {
      persist: jest.fn().mockResolvedValue(undefined),
    };
    const email: any = { deliver: jest.fn().mockResolvedValue(undefined) };
    const processor = new NotificationsProcessor(notifications, email);
    return { processor, notifications, email };
  }

  it('persists the in-app notification and runs the email step', async () => {
    const { processor, notifications, email } = makeProcessor();
    await processor.process({ data: jobData } as Job<NotificationJobData>);
    expect(notifications.persist).toHaveBeenCalledWith(jobData);
    expect(email.deliver).toHaveBeenCalledWith(jobData);
  });

  it('persists BEFORE attempting email so an email issue cannot lose the notification', async () => {
    const { processor, notifications, email } = makeProcessor();
    const order: string[] = [];
    notifications.persist.mockImplementation(async () => {
      order.push('persist');
    });
    email.deliver.mockImplementation(async () => {
      order.push('email');
    });
    await processor.process({ data: jobData } as Job<NotificationJobData>);
    expect(order).toEqual(['persist', 'email']);
  });
});

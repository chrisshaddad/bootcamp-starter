import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/prisma.service';
import type { NotificationPreferencesUpdateRequest } from '@repo/contracts';

@Injectable()
export class SettingsService {
  constructor(private readonly db: DatabaseService) {}

  async getNotificationPreferences(userId: string) {
    const preference = await this.db.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { projectInvitationEmails: true },
    });

    return preference;
  }

  async updateNotificationPreferences(
    userId: string,
    data: NotificationPreferencesUpdateRequest,
  ) {
    const preference = await this.db.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
      select: { projectInvitationEmails: true },
    });

    return preference;
  }
}

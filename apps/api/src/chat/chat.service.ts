import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly db: DatabaseService) {}

  /** Send a message to the AI assistant and get a response grounded in gym data */
  async sendMessage(
    message: string,
    gymId: string | null,
    userId: string,
    userRole: string,
  ): Promise<{
    reply: string;
    sources?: { type: string; id: string; title: string }[];
  }> {
    // Build gym context
    const context = await this.buildContext(gymId, userId, userRole);

    // Try to use LLM if API key is configured
    const apiKey = process.env.CHAT_LLM_API_KEY;
    if (apiKey) {
      try {
        return await this.callLLM(message, context, apiKey);
      } catch (error) {
        this.logger.warn(
          'LLM call failed, falling back to rule-based response',
          error,
        );
      }
    }

    // Fallback: rule-based response using the context data
    return this.generateFallbackResponse(message, context);
  }

  /** Build structured context from gym data for the AI */
  private async buildContext(
    gymId: string | null,
    userId: string,
    userRole: string,
  ): Promise<GymContext> {
    if (!gymId) {
      // SUPER_ADMIN: provide platform-level stats
      const gymCount = await this.db.gym.count();
      const userCount = await this.db.user.count();
      return {
        role: userRole,
        platform: { totalGyms: gymCount, totalUsers: userCount },
      };
    }

    if (userRole === 'MEMBER') {
      const [gym, upcomingSessions, member] = await Promise.all([
        this.db.gym.findFirst({
          where: { id: gymId },
          select: { name: true },
        }),
        this.db.gymSession.findMany({
          where: { gymId, status: 'SCHEDULED', startsAt: { gte: new Date() } },
          orderBy: { startsAt: 'asc' },
          take: 5,
          select: {
            id: true,
            title: true,
            startsAt: true,
            endsAt: true,
            capacity: true,
          },
        }),
        this.db.member.findFirst({
          where: { gymId, userId },
          select: {
            id: true,
            name: true,
            subscriptions: {
              where: { status: 'ACTIVE' },
              select: {
                id: true,
                startDate: true,
                endDate: true,
                plan: { select: { name: true } },
              },
              take: 5,
            },
            bookings: {
              where: {
                status: 'BOOKED',
                session: { startsAt: { gte: new Date() } },
              },
              select: {
                id: true,
                session: { select: { title: true, startsAt: true } },
              },
              take: 5,
            },
            checkIns: {
              orderBy: { checkedInAt: 'desc' },
              take: 5,
              select: { checkedInAt: true, checkedOutAt: true },
            },
          },
        }),
      ]);

      let memberData: MemberPersonalData | undefined;
      if (member) {
        memberData = {
          name: member.name,
          activeSubscriptions: member.subscriptions.map((s) => ({
            planName: s.plan?.name ?? 'Unknown Plan',
            endDate: s.endDate.toISOString(),
          })),
          upcomingBookings: member.bookings.map((b) => ({
            sessionTitle: b.session.title,
            startsAt: b.session.startsAt.toISOString(),
          })),
          recentCheckIns: member.checkIns.map((c) => ({
            checkedInAt: c.checkedInAt.toISOString(),
            checkedOutAt: c.checkedOutAt ? c.checkedOutAt.toISOString() : null,
          })),
          recentCheckInsCount: member.checkIns.length,
        };
      }

      return {
        role: userRole,
        gym: {
          name: gym?.name ?? 'Unknown Gym',
          upcomingSessions: upcomingSessions.map((s) => ({
            id: s.id,
            title: s.title,
            startsAt: s.startsAt.toISOString(),
            endsAt: s.endsAt.toISOString(),
            capacity: s.capacity,
          })),
        },
        member: memberData,
      };
    }

    // Gym-scoped context for ORG_ADMIN
    const [
      gym,
      memberCount,
      activeMemberCount,
      planCount,
      activeSubs,
      upcomingSessions,
      recentCheckins,
    ] = await Promise.all([
      this.db.gym.findFirst({
        where: { id: gymId },
        select: { name: true, maxCapacity: true },
      }),
      this.db.member.count({ where: { gymId } }),
      this.db.member.count({ where: { gymId, status: 'ACTIVE' } }),
      this.db.membershipPlan.count({ where: { gymId, isActive: true } }),
      this.db.subscription.count({ where: { gymId, status: 'ACTIVE' } }),
      this.db.gymSession.findMany({
        where: { gymId, status: 'SCHEDULED', startsAt: { gte: new Date() } },
        orderBy: { startsAt: 'asc' },
        take: 5,
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          capacity: true,
        },
      }),
      this.db.checkIn.count({
        where: {
          gymId,
          checkedInAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringSoonCount = await this.db.subscription.count({
      where: {
        gymId,
        status: 'ACTIVE',
        endDate: { lte: thirtyDaysFromNow, gte: new Date() },
      },
    });

    return {
      role: userRole,
      gym: {
        name: gym?.name ?? 'Unknown Gym',
        maxCapacity: gym?.maxCapacity ?? null,
        totalMembers: memberCount,
        activeMembers: activeMemberCount,
        activePlans: planCount,
        activeSubscriptions: activeSubs,
        todaysCheckins: recentCheckins,
        expiringSoonCount,
        upcomingSessions: upcomingSessions.map((s) => ({
          id: s.id,
          title: s.title,
          startsAt: s.startsAt.toISOString(),
          endsAt: s.endsAt.toISOString(),
          capacity: s.capacity,
        })),
      },
    };
  }

  /** Call the LLM API with structured context */
  private async callLLM(
    message: string,
    context: GymContext,
    apiKey: string,
  ): Promise<{
    reply: string;
    sources?: { type: string; id: string; title: string }[];
  }> {
    const model = process.env.CHAT_LLM_MODEL || 'gpt-4o-mini';
    const systemPrompt = this.buildSystemPrompt(context);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    const reply =
      data.choices?.[0]?.message?.content ?? 'I could not generate a response.';

    return { reply };
  }

  /** Build the system prompt with gym context */
  private buildSystemPrompt(context: GymContext): string {
    let prompt = `You are GymFlow Assistant, an AI helper for a gym management platform. You are friendly, concise, and helpful. Answer questions based on the gym data provided below. If you don't know something, say so honestly. Format responses in markdown when helpful.\n\n`;

    if (context.platform) {
      prompt += `## Platform Overview\n- Total gyms: ${context.platform.totalGyms}\n- Total users: ${context.platform.totalUsers}\n\n`;
    }

    if (context.gym && context.role !== 'MEMBER') {
      prompt += `## Gym: ${context.gym.name}\n`;
      if (context.gym.totalMembers !== undefined)
        prompt += `- Total members: ${context.gym.totalMembers}\n`;
      if (context.gym.activeMembers !== undefined)
        prompt += `- Active members: ${context.gym.activeMembers}\n`;
      if (context.gym.activePlans !== undefined)
        prompt += `- Active plans: ${context.gym.activePlans}\n`;
      if (context.gym.activeSubscriptions !== undefined)
        prompt += `- Active subscriptions: ${context.gym.activeSubscriptions}\n`;
      if (context.gym.todaysCheckins !== undefined)
        prompt += `- Today's check-ins: ${context.gym.todaysCheckins}\n`;
      if (context.gym.maxCapacity)
        prompt += `- Max capacity: ${context.gym.maxCapacity}\n`;
      if (context.gym.expiringSoonCount && context.gym.expiringSoonCount > 0) {
        prompt += `- Subscriptions expiring within 30 days: ${context.gym.expiringSoonCount}\n`;
      }
    } else if (context.gym && context.role === 'MEMBER') {
      prompt += `## Gym: ${context.gym.name}\n`;
    }

    if (context.gym && context.gym.upcomingSessions.length > 0) {
      prompt += `\n### Available / Upcoming Sessions at ${context.gym.name}\n`;
      for (const s of context.gym.upcomingSessions) {
        prompt += `- ${s.title}: ${new Date(s.startsAt).toLocaleString()} to ${new Date(s.endsAt).toLocaleTimeString()} (capacity: ${s.capacity})\n`;
      }
      prompt += '\n';
    }

    if (context.member) {
      prompt += `## Your Member Profile: ${context.member.name}\n`;
      if (context.member.activeSubscriptions.length > 0) {
        prompt += `### Active Subscriptions\n`;
        for (const s of context.member.activeSubscriptions) {
          prompt += `- ${s.planName} (expires: ${new Date(s.endDate).toLocaleDateString()})\n`;
        }
      } else {
        prompt += `- No active subscriptions.\n`;
      }
      if (context.member.upcomingBookings.length > 0) {
        prompt += `### Upcoming Bookings\n`;
        for (const b of context.member.upcomingBookings) {
          prompt += `- ${b.sessionTitle} at ${new Date(b.startsAt).toLocaleString()}\n`;
        }
      } else {
        prompt += `- No upcoming bookings.\n`;
      }
      prompt += `- Recent check-ins count: ${context.member.recentCheckInsCount}\n\n`;
    }

    prompt += `User role: ${context.role}\n`;
    prompt += `\nSystem FAQs & Domain Knowledge:\n- **Check-ins**: Members check in via QR code from their portal or managers check them in manually from the Check-ins tab. Live Capacity tracks members currently checked in without a checkout timestamp.\n- **Subscriptions**: Subscriptions link a Member to a Membership Plan (Monthly, Annual, etc.). Active subscriptions allow members to book classes and check in.\n- **Sessions & Bookings**: Managers create classes under Schedule/Sessions. Members can reserve slots until capacity is full.\n`;
    prompt += `\nGuidelines:\n- Answer questions friendly and thoroughly based on the data and FAQs above\n- If asked how to do something (like check in or subscribe), give clear step-by-step instructions\n- Keep responses concise and well-formatted in markdown\n`;

    return prompt;
  }

  /** Generate a rule-based response when no LLM is available */
  private generateFallbackResponse(
    message: string,
    context: GymContext,
  ): {
    reply: string;
    sources?: { type: string; id: string; title: string }[];
  } {
    const lower = message.toLowerCase();
    const isHowToOrWhat =
      lower.includes('how to') ||
      lower.includes('how do') ||
      lower.includes('how can') ||
      lower.includes('what is') ||
      lower.includes('what are') ||
      lower.includes('explain');

    // Member Portal Chat Fallback
    if (context.role === 'MEMBER' && context.member) {
      if (
        lower.includes('subscription') ||
        lower.includes('expire') ||
        lower.includes('expir') ||
        lower.includes('plan')
      ) {
        let explanation = '';
        if (isHowToOrWhat) {
          explanation = `### What are Subscriptions?\n**Subscriptions** link your account to a recurring **Membership Plan** (such as Monthly, Quarterly, or Annual tiers). Having an active subscription grants you full access to book gym sessions and check in at the facility.\n\n`;
        }
        if (context.member.activeSubscriptions.length > 0) {
          const subList = context.member.activeSubscriptions
            .map(
              (s) =>
                `- **${s.planName}** — expires on ${new Date(s.endDate).toLocaleDateString()}`,
            )
            .join('\n');
          return {
            reply: `${explanation}Here are details for your active subscription(s):\n\n${subList}\n\nYou can manage or view all available tiers on the **Plans** tab.`,
          };
        }
        return {
          reply: `${explanation}You don't currently have an active subscription at **${context.gym?.name ?? 'your gym'}**. Check out the **Plans** section to choose a membership tier!`,
        };
      }

      if (
        lower.includes('check-in') ||
        lower.includes('checkin') ||
        lower.includes('check in') ||
        lower.includes('history') ||
        lower.includes('visit')
      ) {
        let explanation = '';
        if (isHowToOrWhat || lower.includes('how')) {
          explanation = `### How to Check In at ${context.gym?.name ?? 'Your Gym'}\n1. **QR Code Check-In**: Open your portal and click **Check In** or **Show Check-in QR Code**. Present this QR pass at the front desk scanner upon arrival.\n2. **Manual Check-In**: Front desk staff can also check you in manually by searching your name on their staff check-in dashboard.\n3. **Checking Out**: When you leave, staff can check you out or your visit timer will close automatically upon facility departure.\n\n`;
        }
        if (context.member.recentCheckIns.length > 0) {
          const checkinList = context.member.recentCheckIns
            .map(
              (c) =>
                `- Checked in on **${new Date(c.checkedInAt).toLocaleDateString()}** at ${new Date(c.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${c.checkedOutAt ? ` (Checked out at ${new Date(c.checkedOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ' — **Currently inside gym**'}`,
            )
            .join('\n');
          return {
            reply: `${explanation}Here is your recent check-in history:\n\n${checkinList}`,
          };
        }
        return {
          reply: `${explanation}You haven't checked in at **${context.gym?.name ?? 'your gym'}** recently.`,
        };
      }

      if (
        lower.includes('session') ||
        lower.includes('class') ||
        lower.includes('book') ||
        lower.includes('schedule') ||
        lower.includes('available')
      ) {
        let explanation = '';
        if (isHowToOrWhat || lower.includes('how')) {
          explanation = `### How to Book Sessions\n1. Navigate to the **Schedule** or **Bookings** page.\n2. Browse upcoming classes like Yoga Flow, HIIT Circuit, or Bootcamp.\n3. Click **Register** or **Book Spot** on any open class before capacity is reached.\n\n`;
        }
        if (lower.includes('my') || lower.includes('booking')) {
          if (context.member.upcomingBookings.length > 0) {
            const bookingList = context.member.upcomingBookings
              .map(
                (b) =>
                  `- **${b.sessionTitle}** — scheduled for ${new Date(b.startsAt).toLocaleString()}`,
              )
              .join('\n');
            return {
              reply: `${explanation}Here are your upcoming booked sessions:\n\n${bookingList}`,
            };
          }
        }
        if (context.gym && context.gym.upcomingSessions.length > 0) {
          const sessionList = context.gym.upcomingSessions
            .map(
              (s) =>
                `- **${s.title}** on ${new Date(s.startsAt).toLocaleDateString()} at ${new Date(s.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Capacity: ${s.capacity})`,
            )
            .join('\n');
          return {
            reply: `${explanation}Here are the upcoming sessions at **${context.gym?.name ?? 'your gym'}**:\n\n${sessionList}\n\nVisit the **Bookings** page to reserve your spot!`,
          };
        }
        return {
          reply: `${explanation}There are currently no upcoming sessions scheduled at **${context.gym?.name ?? 'your gym'}**. Check back soon!`,
        };
      }

      if (
        lower.includes('hello') ||
        lower.includes('hi') ||
        lower.includes('hey')
      ) {
        return {
          reply: `Hi **${context.member.name}**! I'm your GymFlow Assistant for **${context.gym?.name ?? 'your gym'}**. Ask me about:\n- **How to check in or use QR passes**\n- **What subscriptions are & your active tiers**\n- **How to book classes or check upcoming schedule**\n- **Your check-in history**`,
        };
      }

      return {
        reply: `Hi **${context.member.name}**! I'm your GymFlow Assistant for **${context.gym?.name ?? 'your gym'}**. I can help you with:\n- **Check-ins & QR Code Guide** *(e.g., "How do I check in?")*\n- **Subscriptions Guide & Status** *(e.g., "What are subscriptions?")*\n- **Sessions & Bookings Guide** *(e.g., "How do I book a class?")*\n- **Check-in history** *(e.g., "My check-in history")*\n\nWhat would you like to know today?`,
      };
    }

    // ORG_ADMIN Fallback
    if (context.gym && context.role !== 'MEMBER') {
      if (
        lower.includes('check-in') ||
        lower.includes('checkin') ||
        lower.includes('check in') ||
        lower.includes('today') ||
        lower.includes('visit')
      ) {
        let explanation = '';
        if (isHowToOrWhat || lower.includes('how')) {
          explanation = `### How Check-Ins Work\n- **QR Code Scanner**: On the **Check-ins** page, click **Scan QR** to open the webcam and scan member portal check-in passes.\n- **Manual Check-In**: Search a member by name or email on the Check-ins page and click **Check In**.\n- **Checking Out**: Active visitors inside the building appear under **Live Occupancy**. When they leave, click **Check Out** to accurately maintain live capacity counts.\n\n`;
        }
        return {
          reply: `${explanation}There have been **${context.gym.todaysCheckins ?? 0}** check-ins at **${context.gym.name}** today. You can track real-time activity and scanner controls on the **Check-ins** tab.`,
        };
      }

      if (
        lower.includes('subscription') ||
        lower.includes('expir') ||
        lower.includes('subscribe')
      ) {
        let explanation = '';
        if (isHowToOrWhat || lower.includes('how')) {
          explanation = `### What are Subscriptions?\n**Subscriptions** connect a **Member** to a **Membership Plan** (e.g., Monthly ($49.99/30d), Annual ($399.99/365d)). Active subscriptions grant members self-service portal access, session booking rights, and facility check-in privileges.\n- **To Assign or Renew**: Go to the **Members** page, click on any member, and manage their active/custom subscriptions.\n- **Expiring Alerts**: Your dashboard highlights subscriptions expiring within 30 days so your team can reach out for renewals.\n\n`;
        }
        return {
          reply: `${explanation}**${context.gym.name}** currently has **${context.gym.activeSubscriptions ?? 0}** active subscriptions. ${
            (context.gym.expiringSoonCount ?? 0) > 0
              ? `There are **${context.gym.expiringSoonCount}** subscriptions expiring within the next 30 days.`
              : 'No subscriptions are expiring within the next 30 days.'
          }`,
        };
      }

      if (
        lower.includes('session') ||
        lower.includes('schedule') ||
        lower.includes('class') ||
        lower.includes('booking')
      ) {
        let explanation = '';
        if (isHowToOrWhat || lower.includes('how')) {
          explanation = `### How to Manage Sessions & Bookings\n1. Go to the **Schedule** tab and click **Add Session**.\n2. Set the class name (e.g., Yoga Flow), date, time window, capacity limit, and assign an active instructor.\n3. Members can book slots through their self-service portal, or you can register members directly from the session detail page.\n\n`;
        }
        if (context.gym.upcomingSessions.length > 0) {
          const sessionList = context.gym.upcomingSessions
            .map(
              (s) =>
                `- **${s.title}** on ${new Date(s.startsAt).toLocaleDateString()} at ${new Date(s.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Capacity: ${s.capacity})`,
            )
            .join('\n');
          return {
            reply: `${explanation}Here are the next upcoming sessions at **${context.gym.name}**:\n\n${sessionList}`,
          };
        }
        return {
          reply: `${explanation}There are currently no upcoming sessions scheduled at **${context.gym.name}**. You can create new sessions from the **Schedule** page.`,
        };
      }

      if (lower.includes('plan')) {
        let explanation = '';
        if (isHowToOrWhat || lower.includes('how')) {
          explanation = `### What are Membership Plans?\n**Membership Plans** define the pricing, billing period, and perks for your gym (e.g., Starter Monthly, Annual Tier, Day Pass). Go to the **Plans** tab to create, edit, or toggle the status of your recurring tiers.\n\n`;
        }
        return {
          reply: `${explanation}**${context.gym.name}** currently has **${context.gym.activePlans ?? 0}** active membership plans. You can manage them directly from the **Plans** page.`,
        };
      }

      if (lower.includes('capacity') || lower.includes('live')) {
        return {
          reply: `### How Live Capacity Works\n**Live Capacity** compares the number of members currently inside the building (**checked in** right now without a checkout timestamp) against your gym's **Max Capacity limit**.\n\n${
            context.gym.maxCapacity
              ? `The maximum capacity for **${context.gym.name}** is currently set to **${context.gym.maxCapacity}** members.`
              : `No maximum capacity has been set for **${context.gym.name}**. You can configure this anytime by clicking **Manage Max Capacity** on your dashboard.`
          }`,
        };
      }

      if (lower.includes('member')) {
        let explanation = '';
        if (isHowToOrWhat || lower.includes('how')) {
          explanation = `### How to Manage Members\nGo to the **Members** tab to add new customers, invite them to the self-service portal via email, and assign membership subscriptions or view check-in logs.\n\n`;
        }
        return {
          reply: `${explanation}Your gym **${context.gym.name}** currently has **${context.gym.totalMembers ?? 0}** total members, of which **${context.gym.activeMembers ?? 0}** have active subscriptions.`,
        };
      }

      if (
        lower.includes('hello') ||
        lower.includes('hi') ||
        lower.includes('hey') ||
        lower.includes('help') ||
        lower.includes('status') ||
        lower.includes('overview') ||
        lower.includes('summary')
      ) {
        return {
          reply: `Here's a quick overview of **${context.gym.name}**:\n\n- 👥 **${context.gym.activeMembers ?? 0}** active members (${context.gym.totalMembers ?? 0} total)\n- 📊 **${context.gym.activeSubscriptions ?? 0}** active subscriptions\n- 🗓️ **${context.gym.upcomingSessions.length}** upcoming sessions\n- ✅ **${context.gym.todaysCheckins ?? 0}** check-ins today\n\n**Common Guides You Can Ask Me:**\n- *"How do I check in members or use QR passes?"*\n- *"What are subscriptions and how do I assign them?"*\n- *"How do I book or schedule classes?"*\n- *"What is Live Capacity?"*`,
        };
      }

      // Default gym response
      return {
        reply: `Here's a quick overview of **${context.gym.name}**:\n\n- 👥 **${context.gym.activeMembers ?? 0}** active members (${context.gym.totalMembers ?? 0} total)\n- 📊 **${context.gym.activeSubscriptions ?? 0}** active subscriptions\n- 🗓️ **${context.gym.upcomingSessions.length}** upcoming sessions\n- ✅ **${context.gym.todaysCheckins ?? 0}** check-ins today\n\nAsk me how to check in, what subscriptions are, how to book sessions, or how capacity works for step-by-step guides!`,
      };
    }

    if (context.platform) {
      return {
        reply: `Hello SUPER_ADMIN! Here is the platform summary:\n\n- Total Gyms: **${context.platform.totalGyms}**\n- Total Users: **${context.platform.totalUsers}**\n\nYou can manage gyms and system settings across the platform.`,
      };
    }

    return {
      reply: `I'm your GymFlow Assistant! I can help you with comprehensive guides and information about your gym. Try asking:\n- **"How do I check in?"**\n- **"What are subscriptions?"**\n- **"How do I book sessions?"**\n- **"What is Live Capacity?"**\n\nWhat would you like to explore today?`,
    };
  }
}

// Type definitions for internal use
interface GymContext {
  role: string;
  platform?: { totalGyms: number; totalUsers: number };
  gym?: {
    name: string;
    maxCapacity?: number | null;
    totalMembers?: number;
    activeMembers?: number;
    activePlans?: number;
    activeSubscriptions?: number;
    todaysCheckins?: number;
    expiringSoonCount?: number;
    upcomingSessions: {
      id: string;
      title: string;
      startsAt: string;
      endsAt: string;
      capacity: number;
    }[];
  };
  member?: MemberPersonalData;
}

interface MemberPersonalData {
  name: string;
  activeSubscriptions: { planName: string; endDate: string }[];
  upcomingBookings: { sessionTitle: string; startsAt: string }[];
  recentCheckIns: { checkedInAt: string; checkedOutAt: string | null }[];
  recentCheckInsCount: number;
}

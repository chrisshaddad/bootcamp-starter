import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage, ChatResponse } from '@repo/contracts';
import type { User } from '@repo/db';
import { StatsService } from '../stats/stats.service';
import {
  buildSystemPrompt,
  CHAT_MAX_TOKENS,
  CHAT_MAX_TOOL_ITERATIONS,
  CHAT_MODEL,
} from './chat.constants';

// A data tool the assistant may call. `roles` gates which callers even see the
// tool (mirroring the platform's own authorization); `run` derives everything
// from the session actor, so the model can never widen its own scope. The tool
// takes no input for exactly that reason — there is nothing for the model to
// supply that could point at another tenant.
interface DataTool {
  name: string;
  description: string;
  roles: User['role'][];
  run: (actor: User) => Promise<unknown>;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  // Constructed lazily so the API still boots without a key (the /chat route
  // then fails cleanly per-request instead of crashing startup).
  private readonly client: Anthropic | null;

  constructor(private readonly stats: StatsService) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        'ANTHROPIC_API_KEY is not set — the /chat assistant will be unavailable.',
      );
    }
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  // The full tool catalogue. Each entry maps to an existing, tenant-scoped
  // StatsService method; the role list matches what StatsController already
  // exposes, so the assistant can never read data the caller couldn't fetch
  // through the normal API.
  private readonly tools: DataTool[] = [
    {
      name: 'get_platform_stats',
      description:
        'Platform-wide totals for the super-admin overview: user counts by status, pharmacies (and how many have a branch), branches, and the medicine catalog (total, priced, barcoded, new this week).',
      roles: ['SUPER_ADMIN'],
      run: () => this.stats.platform(),
    },
    {
      name: 'get_pharmacy_stats',
      description:
        "The current user's pharmacy dashboard: branch count, employee count, total open inquiries and low-stock medicines, plus a per-branch breakdown (staff, open inquiries, low stock, near-expiry batches).",
      roles: ['PHARMACY_ADMIN'],
      run: (actor) => this.stats.pharmacy(actor),
    },
    {
      name: 'get_branch_stats',
      description:
        "The current user's own branch dashboard: low-stock medicine count, near-expiry batch count, open inquiry count, and a short recent-activity feed.",
      roles: ['PHARMACY_MANAGER', 'PHARMACY_EMPLOYEE'],
      run: (actor) => this.stats.branch(actor),
    },
  ];

  async chat(actor: User, messages: ChatMessage[]): Promise<ChatResponse> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'The assistant is not configured. Please try again later.',
      );
    }

    // Only expose the tools this caller is permitted to use. A tool the model
    // can't see is a tool it can't call.
    const allowed = this.tools.filter((tool) =>
      tool.roles.includes(actor.role),
    );
    const toolByName = new Map(allowed.map((tool) => [tool.name, tool]));
    const toolDefs: Anthropic.Tool[] = allowed.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    }));

    const system = buildSystemPrompt(actor);
    const conversation: Anthropic.MessageParam[] = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    try {
      for (let i = 0; i < CHAT_MAX_TOOL_ITERATIONS; i++) {
        const response = await this.client.messages.create({
          model: CHAT_MODEL,
          max_tokens: CHAT_MAX_TOKENS,
          system,
          messages: conversation,
          tools: toolDefs.length > 0 ? toolDefs : undefined,
        });

        if (response.stop_reason !== 'tool_use') {
          return { reply: this.extractText(response) };
        }

        // Resolve every tool call the model made this turn, then feed all the
        // results back in a single user turn (required for parallel tool use).
        conversation.push({ role: 'assistant', content: response.content });
        const toolResults = await Promise.all(
          response.content
            .filter(
              (block): block is Anthropic.ToolUseBlock =>
                block.type === 'tool_use',
            )
            .map((block) => this.runTool(actor, toolByName, block)),
        );
        conversation.push({ role: 'user', content: toolResults });
      }

      this.logger.warn(
        `Chat tool loop hit the ${CHAT_MAX_TOOL_ITERATIONS}-iteration cap for user ${actor.id}.`,
      );
      return {
        reply:
          "I wasn't able to finish looking that up. Could you rephrase or narrow the question?",
      };
    } catch (error) {
      this.logger.error('Chat completion failed.', error);
      throw new ServiceUnavailableException(
        'The assistant is temporarily unavailable. Please try again.',
      );
    }
  }

  // Execute one tool call. Failures (e.g. the actor has no branch) are returned
  // to the model as an error result rather than thrown, so it can explain the
  // problem to the user in natural language.
  private async runTool(
    actor: User,
    toolByName: Map<string, DataTool>,
    block: Anthropic.ToolUseBlock,
  ): Promise<Anthropic.ToolResultBlockParam> {
    const tool = toolByName.get(block.name);
    if (!tool) {
      return {
        type: 'tool_result',
        tool_use_id: block.id,
        content: `Unknown or unavailable tool: ${block.name}`,
        is_error: true,
      };
    }

    try {
      const data = await tool.run(actor);
      return {
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(data),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch data.';
      return {
        type: 'tool_result',
        tool_use_id: block.id,
        content: message,
        is_error: true,
      };
    }
  }

  private extractText(response: Anthropic.Message): string {
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();
    return text.length > 0
      ? text
      : "I'm not sure how to help with that. Try asking about a MedFind page, feature, or your own metrics.";
  }
}

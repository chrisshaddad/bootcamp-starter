import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  GoogleGenAI,
  ApiError,
  type Content,
  type Part,
  type FunctionDeclaration,
} from '@google/genai';
import { BooksService } from '../catalog/books.service';
import type {
  ChatRequest,
  ChatResponse,
  ChatReferencedBook,
} from '@repo/contracts';

// A Google-maintained alias for the current recommended Flash model, rather
// than a pinned version string that Google can (and did) deprecate.
const MODEL = 'gemini-flash-latest';
const MAX_TOOL_ITERATIONS = 3;
const MAX_RESULTS = 20;
const DEFAULT_RESULTS = 10;

const SYSTEM_PROMPT = `You are NextShelf's library assistant, helping a patron browse the catalog of their currently active library.

You can search the catalog with the search_catalog tool. Use it whenever the patron asks what's available, asks about a specific title or author, or wants a recommendation.

You cannot take any actions yourself - you cannot add books to the cart, place holds, or buy anything. If the patron wants to do one of those things, tell them to use the Reserve or Buy buttons on the book's page.

Only discuss this library's catalog and reading-related questions. Politely decline unrelated topics. Never invent or describe a book the search_catalog tool did not actually return.`;

const SEARCH_CATALOG_TOOL: FunctionDeclaration = {
  name: 'search_catalog',
  description:
    "Search the current library's book catalog by title, ISBN, or keyword. Returns matching books with authors, category names, price range, and availability. Call this whenever the patron asks what's available, asks about a title/author, or wants a recommendation.",
  parametersJsonSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Keywords, title, or ISBN to search for.',
      },
      limit: {
        type: 'integer',
        description: `Max results (default ${DEFAULT_RESULTS}, max ${MAX_RESULTS}).`,
      },
    },
    required: ['query'],
  },
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private client: GoogleGenAI | null = null;

  constructor(private readonly booksService: BooksService) {
    if (process.env.GEMINI_API_KEY) {
      this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      this.logger.log('Gemini client initialized');
    } else {
      this.logger.warn('GEMINI_API_KEY not set. Chat functionality disabled.');
    }
  }

  async chat(
    organizationId: string,
    request: ChatRequest,
  ): Promise<ChatResponse> {
    if (!this.client) {
      throw new ServiceUnavailableException('AI chat is not configured');
    }
    const client = this.client;

    const contents: Content[] = request.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const collectedBooks = new Map<string, ChatReferencedBook>();

    try {
      for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
        const response = await client.models.generateContent({
          model: MODEL,
          contents,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            tools: [{ functionDeclarations: [SEARCH_CATALOG_TOOL] }],
            maxOutputTokens: 1024,
          },
        });

        const calls = response.functionCalls;
        if (!calls || calls.length === 0) {
          return this.toResponse(response.text, collectedBooks);
        }

        // Echo back the model's own parts verbatim (not reconstructed from
        // `calls`) - Gemini 3.x requires each functionCall part's
        // thoughtSignature to round-trip unchanged for multi-turn tool use.
        const modelParts = response.candidates?.[0]?.content?.parts ?? [];
        contents.push({ role: 'model', parts: modelParts });

        // Execute every call, scoped to organizationId from the
        // authenticated request - never from the model's own arguments.
        const responseParts: Part[] = [];
        for (const call of calls) {
          const output = await this.executeTool(
            organizationId,
            call.name,
            call.args,
            collectedBooks,
          );
          responseParts.push({
            functionResponse: {
              id: call.id,
              name: call.name,
              response: { output },
            },
          });
        }
        contents.push({ role: 'user', parts: responseParts });
      }

      // Exhausted the iteration cap while still wanting a tool - force one
      // final text-only reply so the conversation never just hangs.
      const final = await client.models.generateContent({
        model: MODEL,
        contents,
        config: { systemInstruction: SYSTEM_PROMPT, maxOutputTokens: 1024 },
      });
      return this.toResponse(final.text, collectedBooks);
    } catch (err) {
      if (err instanceof ApiError) {
        this.logger.error(`Gemini API error (${err.status}): ${err.message}`);
        throw new ServiceUnavailableException(
          'AI chat is temporarily unavailable',
        );
      }
      throw err;
    }
  }

  private async executeTool(
    organizationId: string,
    name: string | undefined,
    args: Record<string, unknown> | undefined,
    collectedBooks: Map<string, ChatReferencedBook>,
  ): Promise<unknown> {
    if (name !== 'search_catalog') {
      return { error: `Unknown tool: ${name}` };
    }

    const query = typeof args?.query === 'string' ? args.query : '';
    const rawLimit = Number(args?.limit);
    const limit = Math.min(
      Math.max(
        Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : DEFAULT_RESULTS,
        1,
      ),
      MAX_RESULTS,
    );

    const { books } = await this.booksService.findAll(organizationId, {
      search: query,
      limit,
      hasCopies: true,
    });

    for (const book of books) {
      collectedBooks.set(book.id, { id: book.id, title: book.title });
    }

    // Compact summary for the model - omits internal ids so they can't leak
    // into prose; referencedBooks (above) is the structured source of truth
    // the frontend uses to render book links.
    return books.map((book) => ({
      title: book.title,
      authors: book.authors.map((a) => a.name),
      categories: book.categories.map((c) => c.name),
      priceRange: this.priceRangeText(book.conditionPrices),
      availableCopies: book.availableCopies,
    }));
  }

  private priceRangeText(conditionPrices: { buyPrice: string }[]): string {
    if (conditionPrices.length === 0) return 'not for sale';
    const prices = conditionPrices.map((cp) => Number(cp.buyPrice));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max
      ? `$${min.toFixed(2)}`
      : `$${min.toFixed(2)}-$${max.toFixed(2)}`;
  }

  private toResponse(
    text: string | undefined,
    collectedBooks: Map<string, ChatReferencedBook>,
  ): ChatResponse {
    return {
      message: {
        role: 'assistant',
        content:
          text?.trim() ||
          "Sorry, I couldn't come up with a reply. Could you try rephrasing that?",
      },
      referencedBooks: [...collectedBooks.values()].slice(0, 8),
    };
  }
}

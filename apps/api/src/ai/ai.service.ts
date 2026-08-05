import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;
  private extractor: any = null;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Feature 1: Repo Summarizer (still uses OpenAI gpt-4o-mini)
  async summarizeRepository(
    readmeContent: string | null,
  ): Promise<{ title: string; shortDescription: string; fullDescription: string } | null> {
    if (!readmeContent || readmeContent.length < 50) return null;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert developer portfolio copywriter. Extract the project metadata from the provided README. Return JSON.',
          },
          {
            role: 'user',
            content: `Analyze this README and return a JSON object with "title" (string, max 60 chars), "shortDescription" (string, 1 sentence punchy summary), and "fullDescription" (string, 2 paragraphs explaining the problem it solves and how it works).\n\nREADME:\n${readmeContent.slice(0, 8000)}`,
          },
        ],
        response_format: { type: 'json_object' },
      });

      return JSON.parse(response.choices[0]?.message?.content || '{}');
    } catch (error) {
      this.logger.error('Failed to generate repo summary', error);
      return null;
    }
  }

  // Feature 6: Profile Enhancer (still uses OpenAI gpt-4o-mini)
  async enhanceProfile(
    currentBio: string,
    headline: string,
  ): Promise<{ bio: string; headline: string }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a technical recruiter. Improve this developer profile to be highly attractive. Fix grammar, make it professional, engaging, and action-oriented. Return JSON with "headline" and "bio".',
          },
          {
            role: 'user',
            content: `Current Headline: ${headline}\nCurrent Bio: ${currentBio}`,
          },
        ],
        response_format: { type: 'json_object' },
      });
      return JSON.parse(response.choices[0]?.message?.content || '{}');
    } catch (error) {
      this.logger.error('Failed to enhance profile', error);
      throw error;
    }
  }

  // Feature 2: LOCAL FREE Vector Embeddings (Zero OpenAI Tokens Required)
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!this.extractor) {
        // Dynamic import to support NestJS CommonJS runtime
        const { pipeline } = await (eval('import("@xenova/transformers")') as Promise<typeof import('@xenova/transformers')>);
        this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      }

      const output = await this.extractor(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data); // Returns 384-dimensional vector array
    } catch (error) {
      this.logger.error('Failed to generate local embedding', error);
      return [];
    }
  }
}
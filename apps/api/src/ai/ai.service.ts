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

  // Feature 1: Repo Summarizer (Powered by OpenAI gpt-5.4-nano)
  async summarizeRepository(readmeContent: string | null): Promise<{
    title: string;
    shortDescription: string;
    fullDescription: string;
  } | null> {
    if (!readmeContent || readmeContent.length < 50) return null;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5.4-nano',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert developer portfolio copywriter. Extract project metadata from the provided README. Respond ONLY with raw valid JSON.',
          },
          {
            role: 'user',
            content: `Analyze this README and return a JSON object with keys "title" (string, max 60 chars), "shortDescription" (string, 1 sentence punchy summary), and "fullDescription" (string, 2 paragraphs explaining the problem it solves and how it works).\n\nREADME:\n${readmeContent.slice(0, 8000)}`,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      return content ? JSON.parse(content) : null;
    } catch (error) {
      this.logger.error('Failed to generate repo summary with OpenAI', error);
      return null;
    }
  }

  // Feature 6: Context-Aware Profile Enhancer (Powered by OpenAI gpt-5.4-nano)
  async enhanceProfile(
    currentBio: string,
    headline: string,
    projects: Array<{
      title: string;
      shortDescription?: string | null;
      technologies?: string[];
    }> = [],
  ): Promise<{ bio: string; headline: string }> {
    try {
      const projectContext =
        projects.length > 0
          ? projects
              .map(
                (p) =>
                  `- ${p.title}: ${p.shortDescription || ''} (Tech: ${p.technologies?.join(', ') || 'N/A'})`,
              )
              .join('\n')
          : 'No projects uploaded yet.';

      const response = await this.openai.chat.completions.create({
        model: 'gpt-5.4-nano',
        messages: [
          {
            role: 'system',
            content:
              'You are an elite technical recruiter. Improve this developer profile to be highly attractive. Fix grammar, make it professional, engaging, and action-oriented. Weave in their actual portfolio projects and technical skills. Respond ONLY with raw valid JSON containing keys "headline" and "bio".',
          },
          {
            role: 'user',
            content: `Current Headline: ${headline}\nCurrent Bio: ${currentBio}\n\nDeveloper's Portfolio Projects:\n${projectContext}`,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
      throw new Error('No text returned from OpenAI');
    } catch (error) {
      this.logger.error('Failed to enhance profile with OpenAI', error);
      throw error;
    }
  }

  // Feature 2: Local Free Vector Embeddings (Transformers.js)
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!this.extractor) {
        const { pipeline } = await (eval(
          'import("@xenova/transformers")',
        ) as Promise<typeof import('@xenova/transformers')>);
        this.extractor = await pipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2',
        );
      }

      const output = await this.extractor(text, {
        pooling: 'mean',
        normalize: true,
      });
      return Array.from(output.data);
    } catch (error) {
      this.logger.error('Failed to generate local embedding', error);
      return [];
    }
  }
}

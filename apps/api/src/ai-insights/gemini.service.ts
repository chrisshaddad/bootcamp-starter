import { Injectable, Logger } from '@nestjs/common';

/**
 * Swappable AI interface. Currently backed by Gemini (google-generativeai).
 * All arithmetic is done BEFORE calling this service — we pass pre-computed
 * metrics and ask the model only for language-based recommendations.
 */
export interface InsightPayload {
  type: string;
  periodStart: string;
  periodEnd: string;
  metrics: Record<string, unknown>;
}

export interface StructuredInsight {
  title: string;
  summary: string;
  recommendations: string[];
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey = process.env.GEMINI_API_KEY;
  private readonly model = 'gemini-2.0-flash';

  async generateInsight(payload: InsightPayload): Promise<StructuredInsight> {
    if (!this.apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY not set — returning placeholder insight',
      );
      return this.placeholderInsight(payload);
    }

    const prompt = this.buildPrompt(payload);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              summary: { type: 'STRING' },
              recommendations: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
            },
            required: ['title', 'summary', 'recommendations'],
          },
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${err}`);
      }

      const result = (await response.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty Gemini response');

      const parsed = JSON.parse(text) as StructuredInsight;
      this.validateInsight(parsed);
      return parsed;
    } catch (err) {
      this.logger.error('Gemini insight generation failed', err);
      return this.placeholderInsight(payload);
    }
  }

  private buildPrompt(payload: InsightPayload): string {
    const metricsStr = Object.entries(payload.metrics)
      .map(([k, v]) => `- ${k}: ${String(v)}`)
      .join('\n');

    return `You are a financial analyst assistant for a small business profitability tool.

The user wants a ${payload.type} insight for the period ${payload.periodStart} to ${payload.periodEnd}.

Pre-computed metrics (do NOT re-calculate these; they are already accurate):
${metricsStr}

Provide:
1. A concise title (max 10 words)
2. A 2–3 sentence summary explaining what the metrics mean for the business
3. 3–5 specific, actionable recommendations based on these numbers

Respond as JSON matching the schema exactly. Do not include any markdown. Do not perform arithmetic.`;
  }

  private validateInsight(insight: unknown): asserts insight is StructuredInsight {
    if (
      typeof insight !== 'object' ||
      insight === null ||
      typeof (insight as Record<string, unknown>).title !== 'string' ||
      typeof (insight as Record<string, unknown>).summary !== 'string' ||
      !Array.isArray((insight as Record<string, unknown>).recommendations)
    ) {
      throw new Error('Invalid insight structure from Gemini');
    }
  }

  private placeholderInsight(payload: InsightPayload): StructuredInsight {
    return {
      title: `${payload.type} Analysis — ${payload.periodStart}`,
      summary:
        'AI insights are not available at this time. Configure your GEMINI_API_KEY environment variable to enable them. Your pre-computed metrics are shown in the dashboard.',
      recommendations: [
        'Review your top expense categories for potential reductions.',
        'Identify your highest-margin products and consider increasing their sales volume.',
        'Set monthly revenue and profit goals to track progress over time.',
      ],
    };
  }
}

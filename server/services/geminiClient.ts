import { GoogleGenAI, ThinkingLevel } from '@google/genai';

let cachedClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new ApiError(
      503,
      'GEMINI_API_KEY is not configured. Please set your Gemini API key in Settings > Secrets.',
      'MISSING_GEMINI_KEY'
    );
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedClient;
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = 'API_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const GEMINI_MODELS = {
  GENERAL_AND_MAPS: 'gemini-4-hydrogen',
  FAST_EXTRACTION: 'gemini-3.1-flash-lite',
  IMAGE_PRO: 'gemini-3-pro-image-preview',
} as const;

export async function withRetryAndTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs = 55000,
  maxRetries = 1
): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new ApiError(504, 'AI request timed out. Please try again.', 'TIMEOUT')), timeoutMs)
        ),
      ]);
      return result;
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable =
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('DEADLINE_EXCEEDED');

      if (!isRetryable || attempt >= maxRetries) {
        throw normalizeGeminiError(err);
      }
      const delayMs = 600 * Math.pow(2, attempt) + Math.floor(Math.random() * 250);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt += 1;
    }
  }

  throw normalizeGeminiError(lastError);
}

export function normalizeGeminiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
    return new ApiError(
      403,
      'Gemini API key permission denied or invalid. Please verify your API key in Settings > Secrets.',
      'GEMINI_PERMISSION_DENIED'
    );
  }
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
    return new ApiError(
      429,
      'Gemini API rate limit or quota reached. Please wait a moment or select a billing-enabled key in Settings > Secrets.',
      'GEMINI_QUOTA_EXCEEDED'
    );
  }
  if (msg.includes('NOT_FOUND') || msg.includes('404')) {
    return new ApiError(
      404,
      `Requested Gemini model is unavailable: ${msg}`,
      'GEMINI_MODEL_NOT_FOUND'
    );
  }
  return new ApiError(500, msg || 'Gemini API request failed.', 'GEMINI_ERROR');
}

export { ThinkingLevel };

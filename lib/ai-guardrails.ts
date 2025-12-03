/**
 * AI Performance Guardrails
 *
 * Provides utilities for:
 * - Text chunking with size limits
 * - Request timeouts
 * - Error logging and graceful fallbacks
 * - Rate limiting awareness
 */

import "server-only";

// =============================================================================
// Configuration
// =============================================================================

/** Maximum characters per chunk for document processing */
export const MAX_CHUNK_SIZE = 12000;

/** Maximum tokens to request from AI (prevents runaway costs) */
export const MAX_OUTPUT_TOKENS = 4000;

/** Default timeout for AI requests in milliseconds */
export const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds

/** Extended timeout for larger documents */
export const EXTENDED_TIMEOUT_MS = 120000; // 2 minutes

// =============================================================================
// Text Chunking
// =============================================================================

export type TextChunk = {
  index: number;
  text: string;
  startChar: number;
  endChar: number;
};

/**
 * Split text into manageable chunks for AI processing
 * Tries to split on paragraph/sentence boundaries
 */
export function chunkText(
  text: string,
  maxChunkSize: number = MAX_CHUNK_SIZE
): TextChunk[] {
  if (!text || text.length <= maxChunkSize) {
    return [
      {
        index: 0,
        text,
        startChar: 0,
        endChar: text.length,
      },
    ];
  }

  const chunks: TextChunk[] = [];
  let currentPos = 0;
  let chunkIndex = 0;

  while (currentPos < text.length) {
    let endPos = Math.min(currentPos + maxChunkSize, text.length);

    // If not at the end, try to find a good break point
    if (endPos < text.length) {
      // Look for paragraph break
      const paragraphBreak = text.lastIndexOf("\n\n", endPos);
      if (paragraphBreak > currentPos + maxChunkSize * 0.5) {
        endPos = paragraphBreak + 2;
      } else {
        // Look for sentence break
        const sentenceBreak = text.lastIndexOf(". ", endPos);
        if (sentenceBreak > currentPos + maxChunkSize * 0.5) {
          endPos = sentenceBreak + 2;
        } else {
          // Look for any newline
          const lineBreak = text.lastIndexOf("\n", endPos);
          if (lineBreak > currentPos + maxChunkSize * 0.5) {
            endPos = lineBreak + 1;
          }
          // Otherwise just cut at maxChunkSize
        }
      }
    }

    chunks.push({
      index: chunkIndex,
      text: text.slice(currentPos, endPos),
      startChar: currentPos,
      endChar: endPos,
    });

    currentPos = endPos;
    chunkIndex++;
  }

  return chunks;
}

/**
 * Estimate token count (rough approximation)
 * GPT models use ~4 chars per token on average for English
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if text is within safe processing limits
 */
export function isWithinLimits(text: string): boolean {
  return text.length <= MAX_CHUNK_SIZE;
}

// =============================================================================
// Timeout Utilities
// =============================================================================

/**
 * Create a promise that rejects after a timeout
 */
export function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new AITimeoutError(`AI request timed out after ${ms}ms`));
    }, ms);
  });
}

/**
 * Wrap a promise with a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  return Promise.race([promise, createTimeout(timeoutMs)]);
}

/**
 * Get appropriate timeout based on text size
 */
export function getTimeoutForSize(textLength: number): number {
  if (textLength > MAX_CHUNK_SIZE) {
    return EXTENDED_TIMEOUT_MS;
  }
  if (textLength > MAX_CHUNK_SIZE / 2) {
    return DEFAULT_TIMEOUT_MS * 1.5;
  }
  return DEFAULT_TIMEOUT_MS;
}

// =============================================================================
// Error Types
// =============================================================================

export class AITimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AITimeoutError";
  }
}

export class AIRateLimitError extends Error {
  retryAfterMs?: number;

  constructor(message: string, retryAfterMs?: number) {
    super(message);
    this.name = "AIRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class AIContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIContentError";
  }
}

// =============================================================================
// Error Logging
// =============================================================================

export type AIErrorLogEntry = {
  timestamp: string;
  errorType: string;
  message: string;
  context?: Record<string, unknown>;
  stack?: string;
};

const errorLog: AIErrorLogEntry[] = [];
const MAX_ERROR_LOG_SIZE = 100;

/**
 * Log an AI error for monitoring
 */
export function logAIError(
  error: Error,
  context?: Record<string, unknown>
): void {
  const entry: AIErrorLogEntry = {
    timestamp: new Date().toISOString(),
    errorType: error.name,
    message: error.message,
    context,
    stack: error.stack,
  };

  // Log to console for server-side visibility
  console.error("[AI Error]", entry);

  // Keep in-memory log (could be sent to monitoring service)
  errorLog.push(entry);
  if (errorLog.length > MAX_ERROR_LOG_SIZE) {
    errorLog.shift();
  }
}

/**
 * Get recent AI errors (for debugging)
 */
export function getRecentAIErrors(limit: number = 10): AIErrorLogEntry[] {
  return errorLog.slice(-limit);
}

// =============================================================================
// Fallback Utilities
// =============================================================================

export type FallbackResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  fallback: T;
};

/**
 * Execute an AI operation with fallback
 */
export async function withFallback<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  context?: Record<string, unknown>
): Promise<FallbackResult<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logAIError(err, context);

    return {
      success: false,
      error: err.message,
      fallback: fallbackValue,
    };
  }
}

/**
 * Retry an operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on content errors (user input issues)
      if (error instanceof AIContentError) {
        throw error;
      }

      // Check for rate limit and use suggested retry time
      if (error instanceof AIRateLimitError && error.retryAfterMs) {
        await sleep(error.retryAfterMs);
        continue;
      }

      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("Unknown error after retries");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Safe Parsing
// =============================================================================

/**
 * Safely parse JSON from AI response
 */
export function safeParseJSON<T>(
  text: string,
  fallback: T
): { data: T; error?: string } {
  try {
    const data = JSON.parse(text) as T;
    return { data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error";
    logAIError(new Error(`JSON parse error: ${message}`), { text: text.slice(0, 200) });
    return { data: fallback, error: message };
  }
}

/**
 * Extract JSON from a response that might have markdown formatting
 */
export function extractJSON(text: string): string {
  // Try to find JSON in markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON object or array
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }

  return text;
}

// =============================================================================
// Processing Status
// =============================================================================

export type ProcessingStatus = {
  status: "processing" | "completed" | "failed" | "timeout";
  progress?: number; // 0-100
  message?: string;
  startedAt: string;
  completedAt?: string;
  chunksProcessed?: number;
  chunksTotal?: number;
};

/**
 * Create a new processing status
 */
export function createProcessingStatus(): ProcessingStatus {
  return {
    status: "processing",
    progress: 0,
    startedAt: new Date().toISOString(),
  };
}

/**
 * Update processing status with chunk progress
 */
export function updateChunkProgress(
  status: ProcessingStatus,
  processed: number,
  total: number
): ProcessingStatus {
  return {
    ...status,
    progress: Math.round((processed / total) * 100),
    chunksProcessed: processed,
    chunksTotal: total,
    message: `Processing chunk ${processed} of ${total}`,
  };
}

/**
 * Mark processing as complete
 */
export function completeProcessing(status: ProcessingStatus): ProcessingStatus {
  return {
    ...status,
    status: "completed",
    progress: 100,
    completedAt: new Date().toISOString(),
    message: "Processing complete",
  };
}

/**
 * Mark processing as failed
 */
export function failProcessing(
  status: ProcessingStatus,
  error: string
): ProcessingStatus {
  return {
    ...status,
    status: "failed",
    completedAt: new Date().toISOString(),
    message: error,
  };
}


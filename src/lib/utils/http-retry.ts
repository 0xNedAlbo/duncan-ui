/**
 * HTTP Retry Utility
 *
 * Provides automatic retry logic with exponential backoff for rate-limited APIs.
 * Detects rate limit errors and retries with increasing delays.
 */

type HttpCall<T> = () => Promise<T>;

export interface RetryOptions {
    /** Maximum number of retry attempts (default: 5) */
    retries?: number;
    /** Base delay in milliseconds for exponential backoff (default: 400) */
    baseDelay?: number;
    /** Maximum delay in milliseconds (default: 5000) */
    maxDelay?: number;
    /** Add random jitter to prevent thundering herd (default: true) */
    jitter?: boolean;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is rate limit related
 */
function isRateLimitError(error: unknown): boolean {
    if (!error) return false;

    const message = (error as any)?.message?.toLowerCase() ?? "";
    const status = (error as any)?.status as number | undefined;

    return (
        status === 429 ||
        message.includes("rate limit") ||
        message.includes("max rate") ||
        message.includes("too many requests") ||
        message.includes("please use pagination") ||
        message.includes("max calls per sec")
    );
}

/**
 * Execute HTTP call with automatic retry on rate limit errors
 *
 * @param fn - Function that performs the HTTP call
 * @param options - Retry configuration options
 * @returns Result of the successful HTTP call
 * @throws Error if all retry attempts are exhausted or error is not rate-limit related
 */
export async function withRetries<T>(
    fn: HttpCall<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        retries = 5,
        baseDelay = 400,
        maxDelay = 5000,
        jitter = true,
    } = options;

    let attempt = 0;

    while (true) {
        try {
            return await fn();
        } catch (error: unknown) {
            const isRateLimited = isRateLimitError(error);

            // Throw immediately if not a rate limit error or max retries reached
            if (!isRateLimited || attempt >= retries) {
                throw error;
            }

            // Calculate exponential backoff with optional jitter
            const backoff =
                Math.min(maxDelay, baseDelay * Math.pow(2, attempt)) +
                (jitter ? Math.floor(Math.random() * 150) : 0);

            await sleep(backoff);
            attempt++;
        }
    }
}

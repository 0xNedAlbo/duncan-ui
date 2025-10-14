/**
 * Global Request Scheduler
 *
 * Thread-safe request scheduler for rate-limited APIs in serverless environments.
 * Ensures process-wide request spacing to prevent rate limit violations.
 */

type ScheduledTask<T> = {
    execute: () => Promise<T>;
    resolve: (_value: T) => void;
    reject: (_error: unknown) => void;
};

export class RequestScheduler {
    private queue: ScheduledTask<any>[] = [];
    private isProcessing = false;
    private lastExecutionTime = 0;
    private readonly minSpacingMs: number;

    constructor(minSpacingMs: number) {
        this.minSpacingMs = minSpacingMs;
    }

    /**
     * Schedule a task to be executed with rate limiting
     */
    async schedule<T>(task: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.queue.push({ execute: task, resolve, reject });
            this.processQueue();
        });
    }

    /**
     * Process queued tasks with rate limiting
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing) return;

        this.isProcessing = true;

        while (this.queue.length > 0) {
            const now = Date.now();
            const timeSinceLastExecution = now - this.lastExecutionTime;

            // Enforce minimum spacing between requests
            if (timeSinceLastExecution < this.minSpacingMs) {
                const waitTime = this.minSpacingMs - timeSinceLastExecution;
                await this.delay(waitTime);
            }

            const task = this.queue.shift();
            if (!task) break;

            try {
                this.lastExecutionTime = Date.now();
                const result = await task.execute();
                task.resolve(result);
            } catch (error) {
                task.reject(error);
            }
        }

        this.isProcessing = false;
    }

    /**
     * Utility delay function
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Get queue status for monitoring
     */
    getQueueStatus(): { queueLength: number; isProcessing: boolean } {
        return {
            queueLength: this.queue.length,
            isProcessing: this.isProcessing,
        };
    }
}

/**
 * Global singleton scheduler for Etherscan API requests
 * Conservative 250ms spacing = ~4 req/sec to stay under 5 req/sec limit
 */
export const globalScheduler = new RequestScheduler(250);

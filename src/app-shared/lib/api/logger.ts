/**
 * Base Logger Configuration
 *
 * Pino logger setup with environment-based configuration
 */

import pino from "pino";

// Log levels configuration
const LOG_LEVELS = {
    development: "debug",
    production: "info",
    test: "silent",
} as const;

// Get environment variables with defaults
const NODE_ENV = process.env.NODE_ENV || "development";
const LOG_LEVEL =
    process.env.LOG_LEVEL ||
    LOG_LEVELS[NODE_ENV as keyof typeof LOG_LEVELS] ||
    "info";

// Service filtering and debug muting environment variables
const LOG_SERVICE_FILTER = process.env.LOG_SERVICE_FILTER; // Comma-separated service names
const LOG_MUTE_DEBUG = process.env.LOG_MUTE_DEBUG === "true"; // Global debug muting

// Base logger configuration
const loggerConfig: pino.LoggerOptions = {
    level: LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level(label) {
            return { level: label };
        },
    },
};

// Skip transport configuration for Next.js compatibility
// pino-pretty transport doesn't work well in Next.js server environment
// Pino will write JSON logs directly to console, which is more reliable

// Create and export logger instance
export const logger = pino(loggerConfig);

// Export logger utilities and configuration
export type Logger = typeof logger;
export { LOG_LEVEL, NODE_ENV, LOG_SERVICE_FILTER, LOG_MUTE_DEBUG };

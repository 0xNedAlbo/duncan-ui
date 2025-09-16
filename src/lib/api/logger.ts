/**
 * Base Logger Configuration
 *
 * Pino logger setup with environment-based configuration
 */

import pino from 'pino';

// Log levels configuration
const LOG_LEVELS = {
  development: 'debug',
  production: 'info',
  test: 'silent'
} as const;

// Get environment variables with defaults
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || LOG_LEVELS[NODE_ENV as keyof typeof LOG_LEVELS] || 'info';
const LOG_PRETTY = process.env.LOG_PRETTY === 'true' || NODE_ENV === 'development';

// Base logger configuration
const loggerConfig: pino.LoggerOptions = {
  level: LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    }
  }
};

// Pretty printing for development
if (LOG_PRETTY) {
  loggerConfig.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  };
}

// Create and export logger instance
export const logger = pino(loggerConfig);

// Export logger utilities
export type Logger = typeof logger;
export { LOG_LEVEL, NODE_ENV };
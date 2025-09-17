/**
 * Centralized Logger Factory
 *
 * Creates service-specific Pino child loggers with filtering, tagging, and muting capabilities.
 * Supports environment-based configuration and runtime log level control.
 */

import pino from 'pino';
import { logger as baseLogger } from '../api/logger';

export interface ServiceLogger extends pino.Logger {
  // Extend with any custom methods if needed
}

export interface LoggerContext {
  operation?: string;
  correlationId?: string;
  userId?: string;
  [key: string]: any;
}

// Service registry for filtering and management
class LoggerRegistry {
  private services = new Map<string, ServiceLogger>();
  private serviceFilter: string[] | null = null;
  private muteDebug: boolean = false;

  constructor() {
    // Parse environment variables for filtering
    const filterEnv = process.env.LOG_SERVICE_FILTER;
    if (filterEnv) {
      this.serviceFilter = filterEnv.split(',').map(s => s.trim().toLowerCase());
    }

    // Parse debug muting setting
    this.muteDebug = process.env.LOG_MUTE_DEBUG === 'true';
  }

  /**
   * Check if a service should be logged based on filter settings
   */
  private shouldLogService(serviceName: string): boolean {
    if (!this.serviceFilter) return true;

    const lowerServiceName = serviceName.toLowerCase();
    return this.serviceFilter.some(filter =>
      lowerServiceName.includes(filter) || filter.includes(lowerServiceName)
    );
  }

  /**
   * Get effective log level for a service
   */
  private getEffectiveLogLevel(serviceName: string): string {
    // Check if service is filtered out
    if (!this.shouldLogService(serviceName)) {
      return 'silent';
    }

    // Check if debug is globally muted
    if (this.muteDebug && baseLogger.level === 'debug') {
      return 'info';
    }

    // Use base logger level
    return baseLogger.level;
  }

  /**
   * Create or get service logger
   */
  getServiceLogger(serviceName: string): ServiceLogger {
    if (this.services.has(serviceName)) {
      return this.services.get(serviceName)!;
    }

    const effectiveLevel = this.getEffectiveLogLevel(serviceName);

    // Create child logger with service context
    const serviceLogger = baseLogger.child({
      service: serviceName,
      timestamp: pino.stdTimeFunctions.isoTime
    }) as ServiceLogger;

    // Set effective log level
    serviceLogger.level = effectiveLevel;

    this.services.set(serviceName, serviceLogger);
    return serviceLogger;
  }

  /**
   * Update log level for all services (runtime control)
   */
  setGlobalLogLevel(level: string): void {
    for (const [serviceName, logger] of this.services) {
      const effectiveLevel = this.getEffectiveLogLevel(serviceName);
      logger.level = effectiveLevel;
    }
  }

  /**
   * Mute or unmute debug logging globally
   */
  setMuteDebug(mute: boolean): void {
    this.muteDebug = mute;
    this.setGlobalLogLevel(baseLogger.level);
  }

  /**
   * Get all registered services
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Clear service registry (useful for testing)
   */
  clear(): void {
    this.services.clear();
  }
}

// Global registry instance
const registry = new LoggerRegistry();

/**
 * Create a service-specific logger with structured context
 */
export function createServiceLogger(serviceName: string): ServiceLogger {
  return registry.getServiceLogger(serviceName);
}

/**
 * Create a logger with operation context
 */
export function createOperationLogger(
  serviceName: string,
  operation: string,
  context: LoggerContext = {}
): ServiceLogger {
  const serviceLogger = createServiceLogger(serviceName);

  return serviceLogger.child({
    operation,
    ...context
  }) as ServiceLogger;
}

/**
 * Runtime control functions
 */
export const LoggerControl = {
  /**
   * Set global log level for all services
   */
  setLogLevel: (level: string) => registry.setGlobalLogLevel(level),

  /**
   * Mute or unmute debug logging
   */
  setMuteDebug: (mute: boolean) => registry.setMuteDebug(mute),

  /**
   * Get list of registered services
   */
  getServices: () => registry.getRegisteredServices(),

  /**
   * Clear registry (for testing)
   */
  clear: () => registry.clear()
};

/**
 * Utility for creating correlation IDs
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Common logging patterns for services
 */
export const LogPatterns = {
  /**
   * Log service method entry
   */
  methodEntry: (logger: ServiceLogger, method: string, params: Record<string, any> = {}) => {
    logger.debug({ method, params }, `Entering ${method}`);
  },

  /**
   * Log service method exit
   */
  methodExit: (logger: ServiceLogger, method: string, result?: any) => {
    logger.debug({ method, result }, `Exiting ${method}`);
  },

  /**
   * Log service method error
   */
  methodError: (logger: ServiceLogger, method: string, error: Error, context: Record<string, any> = {}) => {
    logger.error({ method, error: error.message, stack: error.stack, ...context }, `Error in ${method}`);
  },

  /**
   * Log external API call
   */
  externalCall: (logger: ServiceLogger, api: string, endpoint: string, params: Record<string, any> = {}) => {
    logger.debug({ api, endpoint, params }, `External API call`);
  },

  /**
   * Log database operation
   */
  dbOperation: (logger: ServiceLogger, operation: string, table: string, params: Record<string, any> = {}) => {
    logger.debug({ operation, table, params }, `Database operation`);
  }
};
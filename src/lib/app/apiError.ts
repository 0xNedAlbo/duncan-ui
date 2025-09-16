/**
 * Standardized API Error Handling
 * 
 * Provides consistent error types and handling across the application
 */

export enum ApiErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Client Errors
  BAD_REQUEST = 'BAD_REQUEST',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Server Errors
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Network & Client-side Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ApiErrorDetails {
  field?: string;
  code?: string;
  message?: string;
  [key: string]: any;
}

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly statusCode?: number;
  public readonly details?: ApiErrorDetails | ApiErrorDetails[];
  public readonly timestamp: Date;

  constructor(
    code: ApiErrorCode,
    message: string,
    statusCode?: number,
    details?: ApiErrorDetails | ApiErrorDetails[]
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();

    // Maintain proper stack trace in V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Create ApiError from HTTP Response
   */
  static async fromResponse(response: Response): Promise<ApiError> {
    let errorData: any = {};
    
    try {
      errorData = await response.json();
    } catch {
      // If response body is not JSON, use status text
      errorData = { error: response.statusText || 'Unknown error' };
    }

    const code = ApiError.mapStatusCodeToErrorCode(response.status);
    const message = errorData.error || errorData.message || 'An error occurred';
    const details = errorData.details || errorData.validation;

    return new ApiError(code, message, response.status, details);
  }

  /**
   * Create ApiError from network/client-side errors
   */
  static fromClientError(error: Error | unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (error instanceof Error) {
      // Check for specific error types
      if (error.name === 'AbortError') {
        return new ApiError(
          ApiErrorCode.TIMEOUT_ERROR,
          'Request was cancelled or timed out',
          0,
          { originalError: error.message }
        );
      }

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return new ApiError(
          ApiErrorCode.NETWORK_ERROR,
          'Network connection failed',
          0,
          { originalError: error.message }
        );
      }

      return new ApiError(
        ApiErrorCode.UNKNOWN_ERROR,
        error.message,
        0,
        { originalError: error.name }
      );
    }

    return new ApiError(
      ApiErrorCode.UNKNOWN_ERROR,
      'An unknown error occurred',
      0,
      { originalError: String(error) }
    );
  }

  /**
   * Map HTTP status codes to error codes
   */
  private static mapStatusCodeToErrorCode(statusCode: number): ApiErrorCode {
    switch (statusCode) {
      case 400:
        return ApiErrorCode.BAD_REQUEST;
      case 401:
        return ApiErrorCode.UNAUTHORIZED;
      case 403:
        return ApiErrorCode.FORBIDDEN;
      case 404:
        return ApiErrorCode.NOT_FOUND;
      case 422:
        return ApiErrorCode.VALIDATION_ERROR;
      case 429:
        return ApiErrorCode.RATE_LIMITED;
      case 500:
        return ApiErrorCode.SERVER_ERROR;
      case 503:
        return ApiErrorCode.SERVICE_UNAVAILABLE;
      default:
        if (statusCode >= 400 && statusCode < 500) {
          return ApiErrorCode.BAD_REQUEST;
        }
        if (statusCode >= 500) {
          return ApiErrorCode.SERVER_ERROR;
        }
        return ApiErrorCode.UNKNOWN_ERROR;
    }
  }

  /**
   * Type guard to check if error is ApiError
   */
  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }

  /**
   * Check if error is authentication related
   */
  isAuthError(): boolean {
    return this.code === ApiErrorCode.UNAUTHORIZED || this.code === ApiErrorCode.FORBIDDEN;
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return [
      ApiErrorCode.NETWORK_ERROR,
      ApiErrorCode.TIMEOUT_ERROR,
      ApiErrorCode.SERVER_ERROR,
      ApiErrorCode.SERVICE_UNAVAILABLE,
      ApiErrorCode.RATE_LIMITED,
    ].includes(this.code);
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.code) {
      case ApiErrorCode.UNAUTHORIZED:
        return 'Please sign in to continue';
      case ApiErrorCode.FORBIDDEN:
        return 'You do not have permission to perform this action';
      case ApiErrorCode.NOT_FOUND:
        return 'The requested resource was not found';
      case ApiErrorCode.VALIDATION_ERROR:
        return 'Please check your input and try again';
      case ApiErrorCode.RATE_LIMITED:
        return 'Too many requests. Please wait and try again';
      case ApiErrorCode.NETWORK_ERROR:
        return 'Network connection failed. Please check your connection';
      case ApiErrorCode.TIMEOUT_ERROR:
        return 'Request timed out. Please try again';
      case ApiErrorCode.SERVER_ERROR:
        return 'Server error occurred. Please try again later';
      case ApiErrorCode.SERVICE_UNAVAILABLE:
        return 'Service is temporarily unavailable. Please try again later';
      default:
        return this.message || 'An unexpected error occurred';
    }
  }

  /**
   * Convert to plain object for logging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Error boundary helper for React components
 */
export const handleApiError = (error: unknown, fallbackMessage = 'An error occurred'): string => {
  if (ApiError.isApiError(error)) {
    return error.getUserMessage();
  }
  return fallbackMessage;
};
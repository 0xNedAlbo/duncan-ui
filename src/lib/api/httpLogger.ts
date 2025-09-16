/**
 * HTTP Logger Middleware
 *
 * Pino-http integration for Next.js Route Handlers with request ID correlation
 */

import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { formatAccessLine } from './accessLog';
import type { NextRequest } from 'next/server';

// HTTP Logger instance with custom configuration
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    // Check for existing request ID from headers
    const incoming = (req.headers?.['x-request-id'] || req.headers?.['x-correlation-id']) as string | undefined;
    const id = incoming ?? uuidv4();

    // Set response header
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('x-request-id', id);
    }

    return id;
  },
  serializers: {
    req(req) {
      return {
        id: (req as any).id,
        method: req.method,
        url: req.url,
        remoteAddress: (req.socket?.remoteAddress) || undefined,
        userAgent: req.headers?.['user-agent'],
        referer: req.headers?.['referer'],
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
        contentLength: res.headers?.['content-length']
      };
    },
  },
});

/**
 * Initialize request logging for Next.js Route Handlers
 * Maps Next.js Request to Node.js-like objects for pino-http
 */
export function initRequestLogging(request: NextRequest) {
  const url = new URL(request.url);
  const headers = Object.fromEntries(request.headers.entries());

  // Create Node.js-like request object
  const reqLike: any = {
    method: request.method,
    url: url.pathname + url.search,
    headers,
    socket: {
      remoteAddress: headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown'
    },
    httpVersion: '1.1',
  };

  // Create response-like object to collect headers and status
  const resLike: any = {
    statusCode: 200,
    headers: new Headers(),
    setHeader(key: string, value: string) {
      this.headers.set(key, value);
    },
  };

  // Initialize pino-http (sets request.id and other properties)
  httpLogger(reqLike, resLike);

  const reqId = reqLike.id as string;
  const startTime = Date.now();

  return {
    reqId,
    reqLike,
    resLike,
    log: logger.child({ reqId }),

    // Log access line when response is complete
    logAccess: (statusCode: number = 200) => {
      const responseTime = Date.now() - startTime;
      resLike.statusCode = statusCode;

      const accessLine = formatAccessLine({
        ip: reqLike.socket.remoteAddress,
        method: reqLike.method,
        url: reqLike.url,
        statusCode,
        userAgent: headers['user-agent'],
        referer: headers['referer'],
        reqId,
        responseTime,
      });

      // Log as structured access log
      logger.info({
        type: 'access',
        reqId,
        method: reqLike.method,
        url: reqLike.url,
        statusCode,
        responseTime,
        ip: reqLike.socket.remoteAddress,
        userAgent: headers['user-agent'],
        msg: accessLine
      });

      return resLike.headers;
    }
  };
}
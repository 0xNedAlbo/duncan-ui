/**
 * HTTP Logger for Next.js API Routes
 *
 * Simple HTTP logging without pino-http dependencies that cause Next.js compatibility issues
 */

import { v4 as uuidv4 } from "uuid";
import { logger } from "./logger";

export function beginRequestLog(req: Request) {
  const url = new URL(req.url);
  const headers = Object.fromEntries(req.headers.entries());
  const reqId = headers["x-request-id"] ?? uuidv4();
  const start = Date.now();

  const ctx = logger.child({ reqId });

  function access(statusCode: number) {
    const ms = Date.now() - start;
    const line = `${headers["x-forwarded-for"] ?? "-"} - - "${req.method} ${url.pathname}${url.search} HTTP/1.1" ${statusCode} - "${headers["referer"] ?? "-"}" "${headers["user-agent"] ?? "-"}" reqId=${reqId} ${ms}ms`;
    ctx.info({ type: "access", method: req.method, url: url.pathname + url.search, statusCode, responseTime: ms, msg: line });
  }

  return { reqId, headers, access, log: ctx };
}
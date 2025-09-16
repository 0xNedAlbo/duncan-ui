/**
 * Access Log Formatter
 *
 * Apache-style access log formatting for HTTP requests
 */

export interface AccessLogParams {
    ip?: string;
    method: string;
    url: string;
    statusCode: number;
    userAgent?: string;
    referer?: string;
    reqId: string;
    responseTime?: number;
    contentLength?: number | "-";
}

/**
 * Format access log line in Apache-style format with request ID
 *
 * Format: IP - - [timestamp] "METHOD URL HTTP/1.1" status size "referer" "user-agent" reqId responseTime
 */
export function formatAccessLine({
    ip = "-",
    method,
    url,
    statusCode,
    userAgent = "-",
    referer = "-",
    reqId,
    responseTime,
    contentLength = "-",
}: AccessLogParams): string {
    const timestamp = new Date().toISOString();
    const responseTimeStr = responseTime ? ` ${responseTime}ms` : "";

    // Escape quotes in user agent and referer
    const cleanUserAgent = userAgent?.replace(/"/g, '\\"') || "-";
    const cleanReferer = referer?.replace(/"/g, '\\"') || "-";

    return `${ip} - - [${timestamp}] "${method} ${url} HTTP/1.1" ${statusCode} ${contentLength} "${cleanReferer}" "${cleanUserAgent}" ${reqId}${responseTimeStr}`;
}

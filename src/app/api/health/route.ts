/**
 * Health Check API - Example of logging integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/lib/api/withLogging';

export const runtime = "nodejs";

export const GET = withLogging(async (request: NextRequest, { log, reqId }) => {
  log.debug('Health check endpoint called');

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    requestId: reqId,
    environment: process.env.NODE_ENV || 'development'
  };

  return NextResponse.json(health);
});
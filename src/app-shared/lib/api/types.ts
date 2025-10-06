/**
 * Shared API Route Types
 *
 * Centralized type definitions for Next.js API routes
 */

// Next.js route context type - matches what Next.js expects exactly
export interface NextRouteContext {
    params: Promise<any>;
}
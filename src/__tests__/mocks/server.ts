import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Setup requests interception using the given handlers
// Using undici preset for Node.js native fetch compatibility
export const server = setupServer(...handlers)
import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './mocks/server'

// Establish API mocking before all tests
beforeAll(() => {
  console.log('[TEST SETUP] Starting MSW server...')
  server.listen({
    onUnhandledRequest: 'warn'
  })
  console.log('[TEST SETUP] MSW server started')
})

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => server.resetHandlers())

// Clean up after the tests are finished
afterAll(() => server.close())
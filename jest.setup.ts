import '@testing-library/jest-dom'

// Mock window.URL.createObjectURL
window.URL.createObjectURL = jest.fn()
window.URL.revokeObjectURL = jest.fn()

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn() 
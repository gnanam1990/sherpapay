import { describe, it, expect } from 'vitest'
import {
  SherpaPayError,
  ValidationError,
  SafetyError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  RateLimitError,
  BlockchainError,
} from '../errors.js'

describe('SherpaPayError', () => {
  it('creates base error with code and status', () => {
    const err = new SherpaPayError('test message', 'TEST_CODE', 500)
    expect(err.message).toBe('test message')
    expect(err.code).toBe('TEST_CODE')
    expect(err.statusCode).toBe(500)
    expect(err.name).toBe('SherpaPayError')
  })
})

describe('ValidationError', () => {
  it('creates validation error with field', () => {
    const err = new ValidationError('Invalid amount', 'amount')
    expect(err.message).toBe('Invalid amount')
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.statusCode).toBe(400)
    expect(err.field).toBe('amount')
  })
})

describe('SafetyError', () => {
  it('creates safety error with ring name', () => {
    const err = new SafetyError('Amount exceeds limit', 'amount-limits')
    expect(err.message).toBe('Amount exceeds limit')
    expect(err.code).toBe('SAFETY_ERROR')
    expect(err.statusCode).toBe(403)
    expect(err.ring).toBe('amount-limits')
  })
})

describe('NotFoundError', () => {
  it('creates not found error', () => {
    const err = new NotFoundError('Schedule', 'abc123')
    expect(err.message).toBe('Schedule not found: abc123')
    expect(err.statusCode).toBe(404)
  })
})

describe('UnauthorizedError', () => {
  it('creates unauthorized error with default message', () => {
    const err = new UnauthorizedError()
    expect(err.message).toBe('Unauthorized')
    expect(err.statusCode).toBe(401)
  })
})

describe('ConflictError', () => {
  it('creates conflict error', () => {
    const err = new ConflictError('Duplicate alias')
    expect(err.statusCode).toBe(409)
  })
})

describe('RateLimitError', () => {
  it('creates rate limit error', () => {
    const err = new RateLimitError()
    expect(err.statusCode).toBe(429)
  })
})

describe('BlockchainError', () => {
  it('creates blockchain error with tx hash', () => {
    const err = new BlockchainError('Transaction reverted', '0xabc')
    expect(err.statusCode).toBe(502)
    expect(err.txHash).toBe('0xabc')
  })
})

/// Base error class for all SherpaPay errors
export class SherpaPayError extends Error {
  public readonly code: string
  public readonly statusCode: number

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message)
    this.name = 'SherpaPayError'
    this.code = code
    this.statusCode = statusCode
  }
}

/// Validation error — invalid input
export class ValidationError extends SherpaPayError {
  public readonly field?: string

  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400)
    this.name = 'ValidationError'
    this.field = field
  }
}

/// Safety error — safety ring blocked the action
export class SafetyError extends SherpaPayError {
  public readonly ring: string

  constructor(message: string, ring: string) {
    super(message, 'SAFETY_ERROR', 403)
    this.name = 'SafetyError'
    this.ring = ring
  }
}

/// NotFound error — resource not found
export class NotFoundError extends SherpaPayError {
  constructor(resource: string, identifier: string) {
    super(`${resource} not found: ${identifier}`, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

/// Unauthorized error
export class UnauthorizedError extends SherpaPayError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401)
    this.name = 'UnauthorizedError'
  }
}

/// Conflict error — duplicate or conflicting state
export class ConflictError extends SherpaPayError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409)
    this.name = 'ConflictError'
  }
}

/// Rate limit error
export class RateLimitError extends SherpaPayError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT', 429)
    this.name = 'RateLimitError'
  }
}

/// Blockchain error — onchain operation failed
export class BlockchainError extends SherpaPayError {
  public readonly txHash?: string

  constructor(message: string, txHash?: string) {
    super(message, 'BLOCKCHAIN_ERROR', 502)
    this.name = 'BlockchainError'
    this.txHash = txHash
  }
}

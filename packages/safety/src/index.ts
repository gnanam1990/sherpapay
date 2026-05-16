import type { Intent, SafetyContext, SafetyResult } from '@sherpapay/core'

export function runSafetyChecks(_intent: Intent, _context: SafetyContext): SafetyResult {
  // Placeholder — implemented in Stage 2
  return {
    passed: true,
    level: 'safe',
    checks: [],
  }
}

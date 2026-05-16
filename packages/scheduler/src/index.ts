import type { Frequency, Intent } from '@sherpapay/core'

export function nextExecutionTime(
  _frequency: Frequency,
  _startTime: number,
  _lastExecution: number,
): number {
  // Placeholder — implemented in Stage 2
  return 0
}

export function validateScheduleParameters(_intent: Intent): boolean {
  // Placeholder — implemented in Stage 2
  return true
}

export function calculateTotalLifetime(_schedule: {
  startTime: number
  interval: number
  endTime: number
  amount: bigint
}): bigint {
  // Placeholder — implemented in Stage 2
  return BigInt(0)
}

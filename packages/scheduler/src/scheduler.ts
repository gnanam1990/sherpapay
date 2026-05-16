import type { Frequency, Intent } from '@sherpapay/core'
import { FREQUENCY_INTERVALS } from '@sherpapay/core'

export function nextExecutionTime(
  frequency: Frequency,
  startTime: number,
  lastExecution: number,
): number {
  const base = lastExecution || startTime

  switch (frequency.kind) {
    case 'once':
      return startTime
    case 'daily':
      return base + FREQUENCY_INTERVALS.daily
    case 'weekly': {
      const now = new Date(base * 1000)
      const dayOfWeek = now.getDay()
      const targetDay = frequency.dayOfWeek
      const daysUntil = (targetDay - dayOfWeek + 7) % 7 || 7
      return base + daysUntil * 86400
    }
    case 'monthly': {
      const now = new Date(base * 1000)
      const next = new Date(now)
      next.setMonth(next.getMonth() + 1)
      next.setDate(frequency.dayOfMonth)
      return Math.floor(next.getTime() / 1000)
    }
    case 'custom':
      return base + frequency.intervalSeconds
  }
}

export function validateScheduleParameters(intent: Intent): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (intent.kind === 'schedule') {
    if (!intent.recipient || intent.recipient === 'unknown') {
      errors.push('Recipient is required')
    }
    if (!intent.amount || intent.amount === '0') {
      errors.push('Amount must be greater than 0')
    }
    if (!intent.token) {
      errors.push('Token is required')
    }
    if (!intent.frequency) {
      errors.push('Frequency is required')
    }
    if (intent.frequency.kind === 'custom' && intent.frequency.intervalSeconds < 3600) {
      errors.push('Minimum interval is 1 hour')
    }
  }

  return { valid: errors.length === 0, errors }
}

export function calculateTotalLifetime(schedule: {
  startTime: number
  interval: number
  endTime: number
  amount: bigint
}): bigint {
  if (schedule.endTime === 0) return BigInt(0)

  const duration = schedule.endTime - schedule.startTime
  const executions = Math.floor(duration / schedule.interval)
  return schedule.amount * BigInt(executions)
}

export function generateScheduleId(params: {
  sender: string
  recipient: string
  token: string
  amount: string
  timestamp: number
}): string {
  const data = `${params.sender}:${params.recipient}:${params.token}:${params.amount}:${params.timestamp}`
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`
}

export function formatFrequency(frequency: Frequency): string {
  switch (frequency.kind) {
    case 'once':
      return 'one-time'
    case 'daily':
      return 'every day'
    case 'weekly': {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      return `every ${days[frequency.dayOfWeek]}`
    }
    case 'monthly':
      return `every month on the ${frequency.dayOfMonth}${getOrdinalSuffix(frequency.dayOfMonth)}`
    case 'custom':
      return `every ${frequency.intervalSeconds} seconds`
  }
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return (s[(v - 20) % 10] ?? s[v] ?? s[0]) as string
}

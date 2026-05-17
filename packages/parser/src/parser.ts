import type { Intent, TokenSymbol, Frequency } from '@sherpapay/core'

const TOKEN_PATTERN = /\b(cUSD|cEUR|USDT)\b/i
const AMOUNT_PATTERN = /(\d+(?:\.\d+)?)\s*(cUSD|cEUR|USDT)/i
const RECIPIENT_PATTERN = /to\s+(\w+)/i

const DAY_MAP: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
}

function parseToken(str: string): TokenSymbol | undefined {
  const match = str.match(TOKEN_PATTERN)
  if (!match?.[1]) return undefined
  const token = match[1].toUpperCase()
  if (token === 'CUSD') return 'cUSD'
  if (token === 'CEUR') return 'cEUR'
  if (token === 'USDT') return 'USDT'
  return undefined
}

function parseAmount(str: string): string | undefined {
  const match = str.match(AMOUNT_PATTERN)
  return match?.[1]
}

function parseRecipient(str: string): string | undefined {
  const match = str.match(RECIPIENT_PATTERN)
  return match?.[1]?.toLowerCase()
}

function parseFrequency(str: string): Frequency | undefined {
  const lower = str.toLowerCase()

  if (lower.includes('every day') || lower.includes('daily')) return { kind: 'daily' }
  if (lower.includes('every month') || lower.includes('monthly'))
    return { kind: 'monthly', dayOfMonth: 1 }
  if (lower.includes('every week') || lower.includes('weekly'))
    return { kind: 'weekly', dayOfWeek: 1 }
  if (lower.includes('every hour')) return { kind: 'custom', intervalSeconds: 3600 }

  for (const [day, num] of Object.entries(DAY_MAP)) {
    if (lower.includes(`every ${day}`)) {
      return { kind: 'weekly', dayOfWeek: num }
    }
  }

  return undefined
}

function parseGoalLabel(str: string): string {
  const forMatch = str.match(
    /for\s+(.+?)(?:\s+(?:every|daily|weekly|monthly|target|goal|by)\b|\s*$)/i,
  )
  return forMatch?.[1]?.trim() ?? 'savings'
}

function parseTargetAmount(str: string): string | undefined {
  const match = str.match(/(?:target|goal|by)\s+(\d+(?:\.\d+)?)/i)
  return match?.[1]
}

export function parse(input: string): Intent {
  const trimmed = input.trim()
  if (!trimmed) return { kind: 'unknown', raw: input }

  const lower = trimmed.toLowerCase()

  if (lower.startsWith('cancel')) {
    const alias = lower.replace(/^cancel\s*(my\s+)?/, '').trim()
    return { kind: 'cancel', scheduleAlias: alias || 'unknown' }
  }

  if (lower.startsWith('pause')) {
    const alias = lower.replace(/^pause\s*(my\s+)?/, '').trim()
    return { kind: 'pause', scheduleAlias: alias || 'unknown' }
  }

  if (lower.startsWith('resume')) {
    const alias = lower.replace(/^resume\s*(my\s+)?/, '').trim()
    return { kind: 'resume', scheduleAlias: alias || 'unknown' }
  }

  if (
    lower.startsWith('how much') ||
    lower.startsWith('what') ||
    lower.startsWith('status') ||
    lower.startsWith('show')
  ) {
    return { kind: 'status', query: trimmed }
  }

  if (lower.startsWith('save')) {
    const amount = parseAmount(trimmed)
    const token = parseToken(trimmed)
    const frequency = parseFrequency(trimmed) ?? { kind: 'weekly' as const, dayOfWeek: 1 }
    const goalLabel = parseGoalLabel(trimmed)
    const target = parseTargetAmount(trimmed)

    const contribution = amount ? Number(amount) : NaN
    const targetNum = target ? Number(target) : NaN
    const durationCycles =
      Number.isFinite(contribution) &&
      contribution > 0 &&
      Number.isFinite(targetNum) &&
      targetNum > 0
        ? Math.ceil(targetNum / contribution)
        : undefined

    return {
      kind: 'save',
      amount: amount ?? '0',
      token: token ?? 'cUSD',
      goal: { label: goalLabel, target, durationCycles },
      frequency,
    }
  }

  if (lower.startsWith('send') || lower.startsWith('pay') || lower.startsWith('transfer')) {
    const amount = parseAmount(trimmed)
    const token = parseToken(trimmed)
    const recipient = parseRecipient(trimmed)
    const frequency = parseFrequency(trimmed)

    if (frequency) {
      return {
        kind: 'schedule',
        recipient: recipient ?? 'unknown',
        amount: amount ?? '0',
        token: token ?? 'cUSD',
        frequency,
      }
    }

    return {
      kind: 'send',
      recipient: recipient ?? 'unknown',
      amount: amount ?? '0',
      token: token ?? 'cUSD',
    }
  }

  return { kind: 'unknown', raw: input }
}

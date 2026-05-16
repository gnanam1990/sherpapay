import type { Intent, TokenSymbol, Frequency } from '@sherpapay/core'

const TOKEN_PATTERN = /\b(cUSD|cEUR|USDT)\b/i
const AMOUNT_PATTERN = /(\d+(?:\.\d+)?)\s*(cUSD|cEUR|USDT)/i
const RECIPIENT_PATTERN = /to\s+(\w+)/i
const FREQUENCY_PATTERNS: Record<string, Frequency> = {
  daily: { kind: 'daily' },
  weekly: { kind: 'weekly', dayOfWeek: 1 },
  monthly: { kind: 'monthly', dayOfMonth: 1 },
  'every day': { kind: 'daily' },
  'every week': { kind: 'weekly', dayOfWeek: 1 },
  'every month': { kind: 'monthly', dayOfMonth: 1 },
}

const DAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
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

  // Check for "every <day>" pattern
  for (const [day, num] of Object.entries(DAY_MAP)) {
    if (lower.includes(`every ${day}`)) {
      return { kind: 'weekly', dayOfWeek: num }
    }
  }

  // Check standard patterns
  for (const [pattern, freq] of Object.entries(FREQUENCY_PATTERNS)) {
    if (lower.includes(pattern)) {
      return freq
    }
  }

  return undefined
}

export function parse(input: string): Intent {
  const trimmed = input.trim()
  if (!trimmed) {
    return { kind: 'unknown', raw: input }
  }

  const lower = trimmed.toLowerCase()

  // Cancel intent
  if (lower.startsWith('cancel')) {
    const alias = lower.replace(/^cancel\s*/, '').trim()
    return { kind: 'cancel', scheduleAlias: alias || 'unknown' }
  }

  // Pause intent
  if (lower.startsWith('pause')) {
    const alias = lower.replace(/^pause\s*/, '').trim()
    return { kind: 'pause', scheduleAlias: alias || 'unknown' }
  }

  // Resume intent
  if (lower.startsWith('resume')) {
    const alias = lower.replace(/^resume\s*/, '').trim()
    return { kind: 'resume', scheduleAlias: alias || 'unknown' }
  }

  // Status intent
  if (lower.startsWith('how much') || lower.startsWith('what') || lower.startsWith('status')) {
    return { kind: 'status', query: trimmed }
  }

  // Save intent
  if (lower.startsWith('save')) {
    const amount = parseAmount(trimmed)
    const token = parseToken(trimmed)
    const frequency = parseFrequency(trimmed) ?? { kind: 'weekly' as const, dayOfWeek: 1 }

    // Extract goal label after "for"
    const forMatch = trimmed.match(/for\s+(.+?)(?:\s+every|\s*$)/i)
    const goalLabel = forMatch?.[1]?.trim() ?? 'savings'

    // Extract target amount
    const targetMatch = trimmed.match(/(?:target|goal)\s+(\d+(?:\.\d+)?)/i)
    const target = targetMatch?.[1]

    return {
      kind: 'save',
      amount: amount ?? '0',
      token: token ?? 'cUSD',
      goal: { label: goalLabel, target },
      frequency,
    }
  }

  // Send intent (one-time or scheduled)
  if (lower.startsWith('send')) {
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

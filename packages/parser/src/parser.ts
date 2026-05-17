import type { Intent, TokenSymbol, Frequency, ScheduleCategory } from '@sherpapay/core'

// Native Celo symbols + the words people actually say / dictate.
// cUSD/cEUR first so they win over the bare USD/EUR aliases.
const CURRENCY = 'cUSD|cEUR|USDT|USD|EUR|dollars?|euros?|tethers?'
const TOKEN_PATTERN = new RegExp(`\\b(${CURRENCY})\\b`, 'i')
// The amount still requires an adjacent currency word (so "target 100"
// in a save command is never mistaken for the contribution amount).
const AMOUNT_PATTERN = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${CURRENCY})\\b`, 'i')
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
  if (token === 'CUSD' || token === 'USD' || token === 'DOLLAR' || token === 'DOLLARS') {
    return 'cUSD'
  }
  if (token === 'CEUR' || token === 'EUR' || token === 'EURO' || token === 'EUROS') {
    return 'cEUR'
  }
  if (token === 'USDT' || token === 'TETHER' || token === 'TETHERS') return 'USDT'
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

/**
 * Canonical form of a phone number: digits only, with a leading `+`
 * preserved if present. Shared by the parser and the local phone→address
 * store so detection and lookup key on the exact same string.
 */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim()
  const digits = trimmed.replace(/\D/g, '')
  return trimmed.startsWith('+') ? `+${digits}` : digits
}

// Only +<country code><number> in E.164 range is treated as a phone.
// Local digit strings without a leading + stay normal recipients.
const PHONE_RECIPIENT_PATTERN = /to\s+(\+\d[\d\s().-]*\d)/i

function parsePhoneRecipient(str: string): string | undefined {
  const match = str.match(PHONE_RECIPIENT_PATTERN)
  if (!match?.[1]) return undefined
  const normalized = normalizePhone(match[1])
  return /^\+\d{8,15}$/.test(normalized) ? normalized : undefined
}

/**
 * Explicit category keyword in the command, if any. `undefined` when no
 * keyword is present — callers keep the schedule intent shape minimal
 * and derive a default from frequency via {@link categoryForSchedule}.
 */
function parseCategory(str: string): ScheduleCategory | undefined {
  const l = str.toLowerCase()
  if (/\brent\b/.test(l)) return 'rent'
  if (/\bsubscriptions?\b|\bsubscribe\b/.test(l)) return 'subscription'
  if (/\bsavings?\b/.test(l)) return 'savings'
  if (/\bfee\b/.test(l)) return 'subscription'
  return undefined
}

const WEEK_SECONDS = 604_800

/**
 * View-side category for an on-chain schedule (which stores no
 * category): an explicit parsed category wins; otherwise weekly/monthly
 * recurring is treated as a subscription, anything shorter as a plain
 * transfer.
 */
export function categoryForSchedule(
  intervalSeconds: number,
  explicit?: ScheduleCategory,
): ScheduleCategory {
  if (explicit) return explicit
  return intervalSeconds >= WEEK_SECONDS ? 'subscription' : 'transfer'
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
    const phone = parsePhoneRecipient(trimmed)
    const recipient = phone ?? parseRecipient(trimmed)
    const frequency = parseFrequency(trimmed)
    const phoneTag = phone ? { recipientType: 'phone' as const } : {}

    if (frequency) {
      const category = parseCategory(trimmed)
      return {
        kind: 'schedule',
        recipient: recipient ?? 'unknown',
        amount: amount ?? '0',
        token: token ?? 'cUSD',
        frequency,
        ...phoneTag,
        ...(category ? { category } : {}),
      }
    }

    return {
      kind: 'send',
      recipient: recipient ?? 'unknown',
      amount: amount ?? '0',
      token: token ?? 'cUSD',
      ...phoneTag,
    }
  }

  return { kind: 'unknown', raw: input }
}

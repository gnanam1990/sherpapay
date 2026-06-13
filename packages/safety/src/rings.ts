import type {
  Intent,
  SafetyContext,
  SafetyResult,
  SafetyCheck,
  SafetyLevel,
  TokenSymbol,
} from '@sherpapay/core'
import { SAFETY_LIMITS, TOKEN_DECIMALS, amountToWei, isValidAddress } from '@sherpapay/core'

/**
 * The SAFETY_LIMITS amount caps are authored in 18-decimal units (cUSD/cEUR
 * scale). USDT on Celo uses 6 decimals, so a raw 18-decimal limit compared
 * against a 6-decimal amount would never trigger — effectively disabling the
 * per-tx / daily / monthly caps for USDT. Scale an 18-decimal limit down to
 * the intent token's decimals so the comparison is apples-to-apples.
 */
function scaleLimitToToken(limit18: bigint, token: TokenSymbol): bigint {
  const decimals = TOKEN_DECIMALS[token]
  if (decimals >= 18) return limit18
  return limit18 / 10n ** BigInt(18 - decimals)
}

function parseIntentAmount(intent: Extract<Intent, { amount: string }>): bigint | null {
  const amount = intent.amount.trim()
  if (!/^\d+(\.\d+)?$/.test(amount)) return null

  // Parser output is human-readable ("5.5"). Some older callers/tests pass
  // base-unit strings already, so keep large integer values as-is.
  if (!amount.includes('.') && amount.length > 12) {
    return BigInt(amount)
  }

  return amountToWei(amount, intent.token)
}

function checkInputValidation(intent: Intent, context: SafetyContext): SafetyCheck[] {
  const checks: SafetyCheck[] = []

  if (intent.kind === 'send' || intent.kind === 'schedule' || intent.kind === 'save') {
    const amount = parseIntentAmount(intent)
    if (amount === null) {
      checks.push({ name: 'input-validation', level: 'block', message: 'Amount is invalid' })
      return checks
    }

    if (amount <= 0) {
      checks.push({
        name: 'input-validation',
        level: 'block',
        message: 'Amount must be greater than 0',
      })
    }
    if (amount > context.userBalance) {
      checks.push({ name: 'input-validation', level: 'block', message: 'Insufficient balance' })
    }
    if (!['cUSD', 'cEUR', 'USDT'].includes(intent.token)) {
      checks.push({ name: 'input-validation', level: 'block', message: 'Unsupported token' })
    }
  }

  return checks
}

function checkRecipientVerification(intent: Intent, context: SafetyContext): SafetyCheck[] {
  const checks: SafetyCheck[] = []

  if (intent.kind === 'send' || intent.kind === 'schedule') {
    const recipient = intent.recipient

    if (recipient === 'unknown') {
      checks.push({
        name: 'recipient-verification',
        level: 'block',
        message: 'Recipient is required',
      })
      return checks
    }

    if (isValidAddress(recipient)) {
      if (!context.knownRecipients.includes(recipient)) {
        checks.push({
          name: 'recipient-verification',
          level: 'warn',
          message: 'First time sending to this address',
        })
      }
    }
  }

  return checks
}

function checkAmountLimits(intent: Intent, context: SafetyContext): SafetyCheck[] {
  const checks: SafetyCheck[] = []

  if (intent.kind === 'send' || intent.kind === 'schedule' || intent.kind === 'save') {
    const amount = parseIntentAmount(intent)
    if (amount === null) return checks

    // Scale the 18-decimal limits to the token's decimals so caps apply to
    // 6-decimal tokens (USDT) the same as 18-decimal ones (cUSD/cEUR).
    const perTxMax = scaleLimitToToken(SAFETY_LIMITS.PER_TX_MAX, intent.token)
    const dailyMax = scaleLimitToToken(SAFETY_LIMITS.DAILY_MAX, intent.token)
    const monthlyMax = scaleLimitToToken(SAFETY_LIMITS.MONTHLY_MAX, intent.token)

    if (amount > perTxMax) {
      checks.push({
        name: 'amount-limits',
        level: 'block',
        message: `Amount exceeds per-tx max of ${perTxMax}`,
      })
    }

    if (context.dailySpent + amount > dailyMax) {
      checks.push({
        name: 'amount-limits',
        level: 'warn',
        message: 'Approaching daily spending limit',
      })
    }

    if (context.monthlySpent + amount > monthlyMax) {
      checks.push({
        name: 'amount-limits',
        level: 'warn',
        message: 'Approaching monthly spending limit',
      })
    }

    if (
      context.averageAmount > 0 &&
      amount > context.averageAmount * BigInt(SAFETY_LIMITS.ANOMALY_MULTIPLIER)
    ) {
      checks.push({
        name: 'amount-limits',
        level: 'warn',
        message: 'Amount is significantly higher than your average',
      })
    }
  }

  return checks
}

function checkSanctions(intent: Intent): SafetyCheck[] {
  const checks: SafetyCheck[] = []

  if (intent.kind === 'send' || intent.kind === 'schedule') {
    const recipient = intent.recipient
    if (isValidAddress(recipient)) {
      const KNOWN_SCAMS = [
        '0x0000000000000000000000000000000000000000',
        '0x000000000000000000000000000000000000dEaD',
      ]
      if (KNOWN_SCAMS.includes(recipient)) {
        checks.push({ name: 'sanctions', level: 'block', message: 'Recipient is on blocklist' })
      }
    }
  }

  return checks
}

function checkFrequencyValidation(intent: Intent): SafetyCheck[] {
  const checks: SafetyCheck[] = []

  if (intent.kind === 'schedule') {
    const freq = intent.frequency
    if (freq.kind === 'custom' && freq.intervalSeconds < SAFETY_LIMITS.MIN_INTERVAL_SECONDS) {
      checks.push({
        name: 'frequency-validation',
        level: 'block',
        message: 'Minimum interval is 1 hour',
      })
    }
    if (freq.kind === 'custom' && freq.intervalSeconds > SAFETY_LIMITS.MAX_INTERVAL_SECONDS) {
      checks.push({
        name: 'frequency-validation',
        level: 'block',
        message: 'Maximum interval is 1 year',
      })
    }
  }

  return checks
}

function checkSimulation(_intent: Intent): SafetyCheck[] {
  return []
}

function generateConfirmationCard(intent: Intent): string {
  if (intent.kind === 'send') {
    return `You will send ${intent.amount} ${intent.token} to ${intent.recipient}`
  }
  if (intent.kind === 'schedule') {
    return `You will send ${intent.amount} ${intent.token} to ${intent.recipient} ${intent.frequency.kind}`
  }
  if (intent.kind === 'save') {
    return `You will save ${intent.amount} ${intent.token} ${intent.frequency.kind} for ${intent.goal.label}`
  }
  return ''
}

function checkConfirmation(intent: Intent): SafetyCheck[] {
  const checks: SafetyCheck[] = []

  if (intent.kind === 'send' || intent.kind === 'schedule' || intent.kind === 'save') {
    const card = generateConfirmationCard(intent)
    checks.push({ name: 'confirmation', level: 'safe', message: card })
  }

  return checks
}

export function runSafetyChecks(intent: Intent, context: SafetyContext): SafetyResult {
  const allChecks: SafetyCheck[] = [
    ...checkInputValidation(intent, context),
    ...checkRecipientVerification(intent, context),
    ...checkAmountLimits(intent, context),
    ...checkSanctions(intent),
    ...checkFrequencyValidation(intent),
    ...checkSimulation(intent),
    ...checkConfirmation(intent),
  ]

  const hasBlock = allChecks.some((c) => c.level === 'block')
  const hasWarn = allChecks.some((c) => c.level === 'warn')

  let level: SafetyLevel = 'safe'
  if (hasBlock) level = 'block'
  else if (hasWarn) level = 'warn'

  return {
    passed: !hasBlock,
    level,
    checks: allChecks,
  }
}

import type { Intent } from '@sherpapay/core'
import { TOKEN_SYMBOLS } from '@sherpapay/core'

export interface GoalValidation {
  readonly ok: boolean
  readonly errors: string[]
}

/**
 * Checks whether a parsed intent is a complete, on-chain-ready savings goal.
 *
 * The SherpaPayVault treats `monthlyContribution` and `targetDate` as advisory
 * metadata — a goal completes purely when it is funded to its target. So the
 * only hard requirements for `createGoal` are a positive target, a positive
 * contribution, a supported token, and a non-empty label. A recurring
 * frequency is required so the UI can schedule contributions; one-off ('once')
 * makes no sense for a savings goal.
 */
export function validateGoalIntent(intent: Intent): GoalValidation {
  const errors: string[] = []

  if (intent.kind !== 'save') {
    return {
      ok: false,
      errors: ["That isn't a savings goal. Try: save 5 cUSD weekly for emergency fund target 100"],
    }
  }

  const contribution = Number(intent.amount)
  if (!Number.isFinite(contribution) || contribution <= 0) {
    errors.push('Set a contribution amount greater than zero, e.g. "save 5 cUSD".')
  }

  const target = intent.goal.target !== undefined ? Number(intent.goal.target) : NaN
  if (!Number.isFinite(target) || target <= 0) {
    errors.push('Set a target amount, e.g. "target 100".')
  }

  if (!(TOKEN_SYMBOLS as readonly string[]).includes(intent.token)) {
    errors.push(`Unsupported token "${intent.token}". Use ${TOKEN_SYMBOLS.join(', ')}.`)
  }

  if (intent.frequency.kind === 'once') {
    errors.push('Choose a recurring frequency (daily, weekly, or monthly).')
  }

  if (!intent.goal.label.trim()) {
    errors.push('Add a label for the goal, e.g. "for emergency fund".')
  }

  return { ok: errors.length === 0, errors }
}

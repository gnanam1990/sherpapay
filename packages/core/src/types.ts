// ─── Token Types ─────────────────────────────────────────────────────

export type TokenSymbol = 'cUSD' | 'cEUR' | 'USDT'

export const TOKEN_SYMBOLS: readonly TokenSymbol[] = ['cUSD', 'cEUR', 'USDT'] as const

// ─── Frequency Types ─────────────────────────────────────────────────

export type Frequency =
  | { readonly kind: 'once' }
  | { readonly kind: 'daily' }
  | { readonly kind: 'weekly'; readonly dayOfWeek: number }
  | { readonly kind: 'monthly'; readonly dayOfMonth: number }
  | { readonly kind: 'custom'; readonly intervalSeconds: number }

// ─── Intent Types ────────────────────────────────────────────────────

export type Intent =
  | {
      readonly kind: 'send'
      readonly recipient: string
      readonly amount: string
      readonly token: TokenSymbol
    }
  | {
      readonly kind: 'schedule'
      readonly recipient: string
      readonly amount: string
      readonly token: TokenSymbol
      readonly frequency: Frequency
      readonly startDate?: Date
      readonly endDate?: Date
    }
  | {
      readonly kind: 'save'
      readonly amount: string
      readonly token: TokenSymbol
      readonly goal: {
        readonly label: string
        readonly target?: string
        readonly targetDate?: Date
      }
      readonly frequency: Frequency
    }
  | { readonly kind: 'cancel'; readonly scheduleAlias: string }
  | { readonly kind: 'pause'; readonly scheduleAlias: string }
  | { readonly kind: 'resume'; readonly scheduleAlias: string }
  | { readonly kind: 'status'; readonly query: string }
  | { readonly kind: 'unknown'; readonly raw: string }

// ─── Schedule Types ──────────────────────────────────────────────────

export enum ScheduleStatus {
  Active = 0,
  Paused = 1,
  Cancelled = 2,
  Expired = 3,
}

export interface Schedule {
  readonly id: string
  readonly sender: string
  readonly recipient: string
  readonly token: TokenSymbol
  readonly amount: bigint
  readonly startTime: number
  readonly interval: number
  readonly endTime: number
  readonly maxFailures: number
  readonly currentFailures: number
  readonly status: ScheduleStatus
  readonly lastExecution: number
  readonly nextExecution: number
}

// ─── Goal Types ──────────────────────────────────────────────────────

export interface Goal {
  readonly id: string
  readonly owner: string
  readonly token: TokenSymbol
  readonly targetAmount: bigint
  readonly currentAmount: bigint
  readonly monthlyContribution: bigint
  readonly startTime: number
  readonly targetDate: number
  readonly label: string
  readonly achieved: boolean
  readonly emergencyWithdrawn: boolean
}

// ─── Safety Types ────────────────────────────────────────────────────

export interface SafetyContext {
  readonly userAddress: string
  readonly userBalance: bigint
  readonly dailySpent: bigint
  readonly monthlySpent: bigint
  readonly knownRecipients: readonly string[]
  readonly averageAmount: bigint
}

export type SafetyLevel = 'safe' | 'warn' | 'block'

export interface SafetyCheck {
  readonly name: string
  readonly level: SafetyLevel
  readonly message: string
}

export interface SafetyResult {
  readonly passed: boolean
  readonly level: SafetyLevel
  readonly checks: readonly SafetyCheck[]
  readonly confirmationCard?: ConfirmationCard
}

export interface ConfirmationCard {
  readonly action: string
  readonly recipient: string
  readonly amount: string
  readonly token: TokenSymbol
  readonly frequency: string
  readonly totalOverSchedule: string
  readonly firstExecution: Date
  readonly estimatedEndBalance: string
}

// ─── Recipient Alias Types ───────────────────────────────────────────

export interface RecipientAlias {
  readonly id: string
  readonly userId: string
  readonly alias: string
  readonly address: string
  readonly createdAt: Date
}

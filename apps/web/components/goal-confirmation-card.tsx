'use client'

import { AlertTriangle, ArrowRight, Check, CheckCircle2, XCircle } from 'lucide-react'
import { useIntl } from 'react-intl'
import type { SafetyResult, Intent } from '@sherpapay/core'
import type { GoalValidation } from '@sherpapay/parser'
import { cn } from '@/lib/utils'

export interface GoalSummary {
  /** Cycles needed to reach target at this contribution. */
  cycles: number
  /** e.g. "100 cUSD" */
  target: string
  targetLocal?: string | null
  /** Advisory completion date, locale-formatted. */
  byDate: string
}

interface GoalConfirmationCardProps {
  intent: Extract<Intent, { kind: 'save' }>
  safety: SafetyResult
  validation: GoalValidation
  summary?: GoalSummary | undefined
  onConfirm: () => void
  onCancel: () => void
}

const checkStyles = {
  safe: {
    icon: <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-celo" />,
    text: 'text-muted-foreground',
  },
  warn: {
    icon: <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />,
    text: 'text-accent',
  },
  block: {
    icon: <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />,
    text: 'text-destructive',
  },
}

export function GoalConfirmationCard({
  intent,
  safety,
  validation,
  summary,
  onConfirm,
  onCancel,
}: GoalConfirmationCardProps) {
  const intl = useIntl()

  const ready = validation.ok && safety.passed
  const badge = !validation.ok
    ? {
        cls: 'bg-destructive/15 text-destructive',
        icon: <XCircle className="h-4 w-4" />,
        label: 'Incomplete',
      }
    : safety.level === 'safe'
      ? { cls: 'bg-celo/15 text-celo', icon: <CheckCircle2 className="h-4 w-4" />, label: 'Ready' }
      : safety.level === 'warn'
        ? {
            cls: 'bg-accent/20 text-accent',
            icon: <AlertTriangle className="h-4 w-4" />,
            label: 'Review',
          }
        : {
            cls: 'bg-destructive/15 text-destructive',
            icon: <XCircle className="h-4 w-4" />,
            label: 'Blocked',
          }

  return (
    <div className="glass-card animate-fade-in rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="meta-label text-foreground/55">— Confirm goal</span>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
            badge.cls,
          )}
        >
          {badge.icon}
          {badge.label}
        </span>
      </div>

      <p className="mb-4 text-lg font-bold leading-snug text-foreground">
        Save toward <span className="gradient-text">{intent.goal.label}</span>
        {summary ? (
          <>
            {' '}
            — <span className="gradient-text">{summary.target}</span>
          </>
        ) : null}
      </p>

      <div className="mb-4">
        <DetailRow label="Token" value={intent.token} />
        <DetailRow label="Per cycle" value={`${intent.amount} ${intent.token}`} />
        <DetailRow label="Frequency" value={intent.frequency.kind} />
        {summary && (
          <>
            <DetailRow label="Cycles" value={String(summary.cycles)} />
            <DetailRow
              label="Target"
              value={
                summary.targetLocal ? `${summary.target} ≈ ${summary.targetLocal}` : summary.target
              }
            />
            <DetailRow label="By date" value={summary.byDate} />
          </>
        )}
      </div>

      {/* Honest framing: the vault stores targetDate + monthly as advisory
          metadata. A goal completes purely when funded to target. */}
      <p className="celo-tag mb-4 rounded-2xl px-3 py-2 text-[11px] leading-relaxed">
        Creating the goal costs only gas (1 transaction) — no tokens move yet. Contribute from the{' '}
        <span className="font-mono">/goals</span> page to start funding. The date is a target, not a
        lock: your goal completes as soon as it&apos;s funded to {summary?.target ?? 'the target'},
        and you can withdraw once it&apos;s reached.
      </p>

      {!validation.ok && (
        <div className="mb-4 space-y-2">
          {validation.errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-destructive">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>{err}</p>
            </div>
          ))}
        </div>
      )}

      {validation.ok && safety.checks.length > 0 && (
        <div className="mb-4 space-y-2">
          {safety.checks.map((check, i) => {
            const s = checkStyles[check.level]
            return (
              <div key={i} className={cn('flex items-start gap-2 text-xs', s.text)}>
                {s.icon}
                <p>{check.message}</p>
              </div>
            )
          })}
        </div>
      )}

      {!ready && validation.ok && (
        <div className="error-card mb-4 rounded-2xl px-3 py-2 text-xs">
          Fix the blocked check above before signing. This prevents failed transactions and wasted
          gas.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onCancel}
          className="rounded-2xl bg-foreground/[0.06] py-3.5 text-sm font-semibold text-foreground transition hover:bg-foreground/[0.12] dark:bg-white/[0.06] dark:hover:bg-white/[0.12]"
        >
          {intl.formatMessage({ id: 'confirm.cancel' })}
        </button>
        <button
          onClick={onConfirm}
          disabled={!ready}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-accent-gradient py-3.5 text-sm font-bold text-white shadow-glow-accent transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Create goal
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
  valueClass = '',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex justify-between border-b border-foreground/[0.08] py-2.5 last:border-b-0 dark:border-white/[0.06]">
      <span className="font-mono text-[11px] text-foreground/55">{label}</span>
      <span className={cn('font-mono text-xs font-semibold', valueClass)}>{value}</span>
    </div>
  )
}

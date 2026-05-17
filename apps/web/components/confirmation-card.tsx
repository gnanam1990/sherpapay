'use client'

import { AlertTriangle, ArrowRight, Check, CheckCircle2, XCircle } from 'lucide-react'
import { useIntl } from 'react-intl'
import { formatAddress, type SafetyResult, type Intent } from '@sherpapay/core'
import { cn } from '@/lib/utils'

export interface ScheduleSummary {
  cycles: number
  totalLocked: string
  totalLockedLocal?: string | null
  endsAt: string
}

interface ConfirmationCardProps {
  intent: Intent
  safety: SafetyResult
  scheduleSummary?: ScheduleSummary | undefined
  /** When the recipient was typed as an alias, the resolved 0x address. */
  resolvedRecipient?: string | undefined
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationCard({
  intent,
  safety,
  scheduleSummary,
  resolvedRecipient,
  onConfirm,
  onCancel,
}: ConfirmationCardProps) {
  const intl = useIntl()
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

  const levelStyles = {
    safe: {
      shell: 'border-celo/50 bg-celo/10',
      badge: 'bg-celo/15 text-celo',
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: 'Ready',
    },
    warn: {
      shell: 'border-accent/60 bg-accent/10',
      badge: 'bg-accent/20 text-accent',
      icon: <AlertTriangle className="h-4 w-4" />,
      label: 'Review',
    },
    block: {
      shell: 'border-destructive/60 bg-destructive/10',
      badge: 'bg-destructive/15 text-destructive',
      icon: <XCircle className="h-4 w-4" />,
      label: 'Blocked',
    },
  }

  const style = levelStyles[safety.level]
  const recipientLabel =
    intent.kind === 'send' || intent.kind === 'schedule'
      ? intent.recipient.startsWith('0x') && intent.recipient.length > 12
        ? formatAddress(intent.recipient)
        : intent.recipient
      : ''

  return (
    <div className="glass-card animate-fade-in rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="meta-label text-foreground/55">— Confirm</span>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
            style.badge,
          )}
        >
          {style.icon}
          {style.label} · {safety.checks.length || 1} checks
        </span>
      </div>

      {(intent.kind === 'send' || intent.kind === 'schedule') && (
        <p className="mb-4 text-lg font-bold leading-snug text-foreground">
          Send{' '}
          <span className="gradient-text">
            {intent.amount} {intent.token}
          </span>{' '}
          to <span className="gradient-text">{recipientLabel}</span>
          {intent.kind === 'schedule' && (
            <>
              {' '}
              every {intent.frequency.kind}
              {scheduleSummary ? ` for ${scheduleSummary.cycles} cycles` : ''}
            </>
          )}
        </p>
      )}

      {intent.kind === 'save' && (
        <p className="mb-4 text-lg font-bold leading-snug text-foreground">
          Save{' '}
          <span className="gradient-text">
            {intent.amount} {intent.token}
          </span>{' '}
          toward <span className="gradient-text">{intent.goal.label}</span> every{' '}
          {intent.frequency.kind}
        </p>
      )}

      {(intent.kind === 'send' || intent.kind === 'schedule') &&
        resolvedRecipient &&
        resolvedRecipient.toLowerCase() !== intent.recipient.toLowerCase() && (
          <p className="celo-tag mb-4 rounded-2xl px-3 py-2 text-xs">
            Sending to <strong>{intent.recipient}</strong> →{' '}
            <span className="font-mono">{formatAddress(resolvedRecipient)}</span>
          </p>
        )}

      <div className="mb-4">
        {intent.kind === 'send' && (
          <>
            <DetailRow label="Token" value={intent.token} />
            <DetailRow label="Amount" value={`${intent.amount} ${intent.token}`} />
            <DetailRow label="Recipient" value={recipientLabel} />
          </>
        )}
        {intent.kind === 'schedule' && (
          <>
            <DetailRow label="Per cycle" value={`${intent.amount} ${intent.token}`} />
            <DetailRow label="Frequency" value={intent.frequency.kind} />
            {scheduleSummary && (
              <>
                <DetailRow label="Cycles" value={String(scheduleSummary.cycles)} />
                <DetailRow
                  label="Total locked"
                  value={
                    scheduleSummary.totalLockedLocal
                      ? `${scheduleSummary.totalLocked} ≈ ${scheduleSummary.totalLockedLocal}`
                      : scheduleSummary.totalLocked
                  }
                />
                <DetailRow label="Ends" value={scheduleSummary.endsAt} />
                <DetailRow
                  label="Refundable"
                  value="✓ cancel anytime"
                  valueClass="text-celo-green"
                />
              </>
            )}
          </>
        )}
        {intent.kind === 'save' && (
          <>
            <DetailRow label="Amount" value={`${intent.amount} ${intent.token}`} />
            <DetailRow label="Goal" value={intent.goal.label} />
            <DetailRow label="Frequency" value={intent.frequency.kind} />
          </>
        )}
      </div>

      {safety.checks.length > 0 && (
        <div className="mb-4 space-y-2">
          {safety.checks.map((check, i) => {
            const checkStyle = checkStyles[check.level]
            return (
              <div key={i} className={cn('flex items-start gap-2 text-xs', checkStyle.text)}>
                {checkStyle.icon}
                <p>{check.message}</p>
              </div>
            )
          })}
        </div>
      )}

      {!safety.passed && (
        <div className="error-card mb-4 rounded-2xl px-3 py-2 text-xs">
          Fix the blocked check above before signing. This prevents failed transfers and wasted gas.
        </div>
      )}

      {safety.passed && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onCancel}
            className="rounded-2xl bg-foreground/[0.06] py-3.5 text-sm font-semibold text-foreground transition hover:bg-foreground/[0.12] dark:bg-white/[0.06] dark:hover:bg-white/[0.12]"
          >
            {intl.formatMessage({ id: 'confirm.cancel' })}
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-accent-gradient py-3.5 text-sm font-bold text-white shadow-glow-accent transition hover:opacity-95"
          >
            {intl.formatMessage({
              id: intent.kind === 'schedule' ? 'confirm.schedule' : 'confirm.transfer',
            })}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
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

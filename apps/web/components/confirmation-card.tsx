'use client'

import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react'
import { useIntl } from 'react-intl'
import type { SafetyResult, Intent } from '@sherpapay/core'
import { cn } from '@/lib/utils'

export interface ScheduleSummary {
  cycles: number
  totalLocked: string
  endsAt: string
}

interface ConfirmationCardProps {
  intent: Intent
  safety: SafetyResult
  scheduleSummary?: ScheduleSummary | undefined
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationCard({
  intent,
  safety,
  scheduleSummary,
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

  return (
    <div className={cn('overflow-hidden rounded-lg border bg-card shadow-soft-panel', style.shell)}>
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-medium',
            style.badge,
          )}
        >
          {style.icon}
          {style.label}
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          {safety.checks.length || 1} checks
        </div>
      </div>

      <div className="space-y-4 p-4">
        {intent.kind === 'send' && (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="rounded-md border border-border/70 bg-background/50 p-3">
              <p className="text-xs text-muted-foreground">Send</p>
              <p className="mt-1 text-lg font-semibold">
                {intent.amount} {intent.token}
              </p>
            </div>
            <div className="hidden h-9 w-9 place-items-center rounded-md border border-border/70 bg-muted text-muted-foreground sm:grid">
              <ArrowRight className="h-4 w-4" />
            </div>
            <div className="rounded-md border border-border/70 bg-background/50 p-3">
              <p className="text-xs text-muted-foreground">Recipient</p>
              <p className="mt-1 break-all font-mono text-sm text-foreground">{intent.recipient}</p>
            </div>
          </div>
        )}

        {intent.kind === 'schedule' && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border/70 bg-background/50 p-3">
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="mt-1 font-semibold">
                {intent.amount} {intent.token}
              </p>
            </div>
            <div className="rounded-md border border-border/70 bg-background/50 p-3">
              <p className="text-xs text-muted-foreground">Recipient</p>
              <p className="mt-1 break-all font-mono text-sm">{intent.recipient}</p>
            </div>
            <div className="rounded-md border border-border/70 bg-background/50 p-3">
              <p className="text-xs text-muted-foreground">Frequency</p>
              <p className="mt-1 font-semibold capitalize">{intent.frequency.kind}</p>
            </div>
          </div>
        )}

        {intent.kind === 'schedule' && scheduleSummary && (
          <div className="space-y-1 rounded-md border border-accent/40 bg-accent/10 p-3 text-xs text-foreground">
            <p>
              You&apos;re committing to send {intent.amount} {intent.token} for{' '}
              <strong>{scheduleSummary.cycles} cycles</strong>.
            </p>
            <p>
              Total locked now: <strong>{scheduleSummary.totalLocked}</strong> ({intent.amount}{' '}
              {intent.token} × {scheduleSummary.cycles}).
            </p>
            <p>
              Schedule ends: <strong>{scheduleSummary.endsAt}</strong>.
            </p>
            <p className="text-muted-foreground">
              You can cancel anytime and reclaim the unspent escrow.
            </p>
          </div>
        )}

        {intent.kind === 'save' && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border/70 bg-background/50 p-3">
              <p className="text-xs text-muted-foreground">Save</p>
              <p className="mt-1 font-semibold">
                {intent.amount} {intent.token}
              </p>
            </div>
            <div className="rounded-md border border-border/70 bg-background/50 p-3">
              <p className="text-xs text-muted-foreground">Goal</p>
              <p className="mt-1 font-semibold">{intent.goal.label}</p>
            </div>
            <div className="rounded-md border border-border/70 bg-background/50 p-3">
              <p className="text-xs text-muted-foreground">Frequency</p>
              <p className="mt-1 font-semibold capitalize">{intent.frequency.kind}</p>
            </div>
          </div>
        )}

        {safety.checks.length > 0 && (
          <div className="space-y-2">
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
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Fix the blocked check above before signing. This prevents failed transfers and wasted
            gas.
          </div>
        )}

        {safety.passed && (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <button
              onClick={onConfirm}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {intl.formatMessage({
                id: intent.kind === 'schedule' ? 'confirm.schedule' : 'confirm.transfer',
              })}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onCancel}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border/80 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
              {intl.formatMessage({ id: 'confirm.cancel' })}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

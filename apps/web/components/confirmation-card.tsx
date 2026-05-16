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
import type { SafetyResult, Intent } from '@sherpapay/core'
import { cn } from '@/lib/utils'

interface ConfirmationCardProps {
  intent: Intent
  safety: SafetyResult
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationCard({ intent, safety, onConfirm, onCancel }: ConfirmationCardProps) {
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
            {safety.checks.map((check, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-celo" />
                <p>{check.message}</p>
              </div>
            ))}
          </div>
        )}

        {safety.passed && (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <button
              onClick={onConfirm}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Confirm transfer
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onCancel}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border/80 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

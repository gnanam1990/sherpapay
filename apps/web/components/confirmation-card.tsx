'use client'

import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import type { SafetyResult, Intent } from '@sherpapay/core'
import { cn } from '@/lib/utils'

interface ConfirmationCardProps {
  intent: Intent
  safety: SafetyResult
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationCard({ intent, safety, onConfirm, onCancel }: ConfirmationCardProps) {
  const levelColors = {
    safe: 'border-celo bg-celo/10',
    warn: 'border-yellow-500 bg-yellow-500/10',
    block: 'border-red-500 bg-red-500/10',
  }

  const levelIcons = {
    safe: <CheckCircle className="h-5 w-5 text-celo" />,
    warn: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    block: <XCircle className="h-5 w-5 text-red-500" />,
  }

  return (
    <div className={cn('rounded-xl border-2 p-4', levelColors[safety.level])}>
      <div className="flex items-center gap-2 mb-3">
        {levelIcons[safety.level]}
        <span className="font-semibold capitalize">{safety.level}</span>
      </div>

      {intent.kind === 'send' && (
        <div className="space-y-1">
          <p className="text-sm">Send <strong>{intent.amount} {intent.token}</strong></p>
          <p className="text-sm">To: <strong>{intent.recipient}</strong></p>
        </div>
      )}

      {intent.kind === 'schedule' && (
        <div className="space-y-1">
          <p className="text-sm">Send <strong>{intent.amount} {intent.token}</strong></p>
          <p className="text-sm">To: <strong>{intent.recipient}</strong></p>
          <p className="text-sm">Frequency: <strong>{intent.frequency.kind}</strong></p>
        </div>
      )}

      {intent.kind === 'save' && (
        <div className="space-y-1">
          <p className="text-sm">Save <strong>{intent.amount} {intent.token}</strong></p>
          <p className="text-sm">Goal: <strong>{intent.goal.label}</strong></p>
          <p className="text-sm">Frequency: <strong>{intent.frequency.kind}</strong></p>
        </div>
      )}

      {safety.checks.length > 0 && (
        <div className="mt-3 space-y-1">
          {safety.checks.map((check, i) => (
            <p key={i} className="text-xs text-muted-foreground">{check.message}</p>
          ))}
        </div>
      )}

      {safety.passed && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Confirm
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

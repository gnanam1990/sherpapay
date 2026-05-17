'use client'

import { AlertTriangle, ArrowRight, Check, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { formatAddress, type TokenSymbol } from '@sherpapay/core'
import type { BatchItem } from '@/lib/batch-send'
import { cn } from '@/lib/utils'

export interface BatchRow {
  raw: string
  /** Resolved 0x address, or null if unresolvable. */
  address: string | null
}

interface BatchConfirmationCardProps {
  rows: BatchRow[]
  token: TokenSymbol
  /** Amount sent to EACH recipient. */
  amountEach: string
  /** Live per-recipient progress (index-aligned with rows), or null. */
  items: BatchItem[] | null
  running: boolean
  summary: { succeeded: number; failed: number } | null
  onConfirm: () => void
  onCancel: () => void
}

function fmtTotal(amountEach: string, n: number): string {
  const each = Number(amountEach)
  if (!Number.isFinite(each)) return `${amountEach} × ${n}`
  const total = each * n
  return `${total % 1 === 0 ? total : total.toFixed(2)}`
}

function StatusIcon({ status }: { status: BatchItem['status'] }) {
  if (status === 'confirmed') return <Check className="h-3.5 w-3.5 text-celo-green" />
  if (status === 'failed') return <XCircle className="h-3.5 w-3.5 text-destructive" />
  if (status === 'submitted') return <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
  return <span className="h-1.5 w-1.5 rounded-full bg-foreground/30" />
}

export function BatchConfirmationCard({
  rows,
  token,
  amountEach,
  items,
  running,
  summary,
  onConfirm,
  onCancel,
}: BatchConfirmationCardProps) {
  const n = rows.length
  const allResolved = rows.every((r) => r.address !== null)
  const validAmount = Number(amountEach) > 0
  const canSend = allResolved && validAmount && !running && !summary

  return (
    <div className="glass-card animate-fade-in rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="meta-label text-foreground/55">— Confirm batch</span>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
            summary
              ? summary.failed === 0
                ? 'bg-celo/15 text-celo'
                : 'bg-accent/20 text-accent'
              : allResolved && validAmount
                ? 'bg-celo/15 text-celo'
                : 'bg-destructive/15 text-destructive',
          )}
        >
          {summary ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              {summary.succeeded} ok · {summary.failed} failed
            </>
          ) : allResolved && validAmount ? (
            <>
              <CheckCircle2 className="h-4 w-4" /> Ready
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4" /> Not ready
            </>
          )}
        </span>
      </div>

      <p className="mb-1 text-lg font-bold leading-snug text-foreground">
        Send{' '}
        <span className="gradient-text">
          {amountEach} {token}
        </span>{' '}
        to <span className="gradient-text">{n}</span> recipients
      </p>
      <p className="mb-4 text-sm text-foreground/65">
        Total{' '}
        <span className="font-mono font-semibold text-foreground">
          {fmtTotal(amountEach, n)} {token}
        </span>{' '}
        · {amountEach} {token} each
      </p>

      <ul className="mb-4 space-y-1.5">
        {rows.map((r, i) => {
          const st = items?.[i]?.status
          return (
            <li
              key={`${r.raw}-${i}`}
              className="flex items-center gap-2 rounded-2xl bg-foreground/[0.04] px-3 py-2 text-xs dark:bg-white/[0.04]"
            >
              <span className="w-4 shrink-0">
                {st ? (
                  <StatusIcon status={st} />
                ) : (
                  <span className="text-foreground/40">{i + 1}</span>
                )}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-foreground">{r.raw}</span>
              <span className="shrink-0 font-mono text-[11px] text-foreground/55">
                {r.address ? (
                  formatAddress(r.address)
                ) : (
                  <span className="text-destructive">add in Settings</span>
                )}
              </span>
            </li>
          )
        })}
      </ul>

      {!validAmount && !summary && (
        <div className="error-card mb-4 rounded-2xl px-3 py-2 text-xs">
          Amount must be greater than zero. Include a currency next to the number, e.g.{' '}
          <span className="font-mono">send 5 cUSD to a, b</span>.
        </div>
      )}

      {!allResolved && !summary && (
        <div className="error-card mb-4 rounded-2xl px-3 py-2 text-xs">
          Some recipients aren&apos;t a saved alias, phone contact, or 0x address. Fix them in
          Settings, or use full addresses.
        </div>
      )}

      <p className="celo-tag mb-4 rounded-2xl px-3 py-2 text-[11px] leading-relaxed">
        Sent sequentially — one transaction per recipient (the scheduler has no atomic batch and is
        immutable). You sign each one. A failed transfer won&apos;t block the rest.
      </p>

      {summary ? (
        <button
          onClick={onCancel}
          className="w-full rounded-2xl bg-foreground/[0.06] py-3.5 text-sm font-semibold text-foreground transition hover:bg-foreground/[0.12] dark:bg-white/[0.06] dark:hover:bg-white/[0.12]"
        >
          Done
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onCancel}
            disabled={running}
            className="rounded-2xl bg-foreground/[0.06] py-3.5 text-sm font-semibold text-foreground transition hover:bg-foreground/[0.12] disabled:opacity-40 dark:bg-white/[0.06] dark:hover:bg-white/[0.12]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canSend}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-accent-gradient py-3.5 text-sm font-bold text-white shadow-glow-accent transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                Send to {n} recipients <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

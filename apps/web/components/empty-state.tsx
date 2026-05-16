import Link from 'next/link'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
  tone?: 'primary' | 'celo' | 'accent'
}

const toneClass = {
  primary: 'bg-primary/10 text-primary border-primary/25',
  celo: 'bg-celo/10 text-celo border-celo/25',
  accent: 'bg-accent/10 text-accent border-accent/30',
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
  tone = 'primary',
}: EmptyStateProps) {
  return (
    <section className="rounded-lg border border-border/70 bg-card/85 p-6 shadow-soft-panel">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'grid h-11 w-11 shrink-0 place-items-center rounded-md border',
              toneClass[tone],
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>

        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </section>
  )
}

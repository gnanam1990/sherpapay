import Link from 'next/link'
import { ArrowRight, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
  /** Accepted for backward compatibility; styling is unified glass. */
  tone?: 'primary' | 'celo' | 'accent'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  return (
    <section className="glass-card animate-fade-in mx-auto flex max-w-md flex-col items-center rounded-3xl p-8 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent-gradient text-white shadow-glow-accent">
        <Icon className="h-6 w-6" />
      </div>
      <h1 className="text-xl font-extrabold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-foreground/60">{description}</p>

      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-accent-gradient px-5 py-3 text-sm font-bold text-white shadow-glow-accent transition hover:opacity-95"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </section>
  )
}

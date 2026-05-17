/**
 * Soft-glass skeleton loaders. Subtle opacity pulse (Tailwind
 * animate-pulse) — no harsh contrast, matches the glass aesthetic.
 */

function Bar({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-foreground/[0.08] dark:bg-white/[0.08] ${className}`}
    />
  )
}

/** One glass card placeholder (schedule/goal row shape). */
export function SkeletonCard() {
  return (
    <div className="glass-card space-y-3 rounded-2xl p-4">
      <div className="flex items-center gap-3.5">
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-2xl bg-foreground/[0.08] dark:bg-white/[0.08]" />
        <div className="flex-1 space-y-2">
          <Bar className="h-3.5 w-2/5" />
          <Bar className="h-3 w-3/5" />
        </div>
        <div className="space-y-2">
          <Bar className="h-3.5 w-16" />
          <Bar className="ml-auto h-3 w-10" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Bar className="h-7" />
        <Bar className="h-7" />
        <Bar className="h-7" />
      </div>
    </div>
  )
}

/** A list of skeleton cards. */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

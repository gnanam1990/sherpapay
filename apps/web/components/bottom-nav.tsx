'use client'

import Link from 'next/link'
import { Home, Calendar, Target, Clock, Settings } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useIntl } from 'react-intl'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', icon: Home, id: 'nav.home' },
  { href: '/schedules', icon: Calendar, id: 'nav.schedules' },
  { href: '/goals', icon: Target, id: 'nav.goals' },
  { href: '/history', icon: Clock, id: 'nav.history' },
  { href: '/settings', icon: Settings, id: 'nav.settings' },
]

export function BottomNav() {
  const pathname = usePathname()
  const intl = useIntl()

  return (
    <nav className="glass-nav fixed bottom-4 left-4 right-4 z-50 flex justify-around rounded-3xl p-2 md:hidden">
      {NAV.map((item) => {
        const active = pathname === item.href
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={intl.formatMessage({ id: item.id })}
            className={cn(
              'flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-medium transition-opacity',
              active ? 'text-foreground opacity-100' : 'text-foreground opacity-45',
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{intl.formatMessage({ id: item.id })}</span>
          </Link>
        )
      })}
    </nav>
  )
}

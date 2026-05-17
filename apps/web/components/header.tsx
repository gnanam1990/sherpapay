'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'
import { Calendar, Clock, Home, Menu, Settings, Target, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useIntl } from 'react-intl'
import { cn } from '@/lib/utils'
import { LanguageSwitcher } from '@/components/language-switcher'

const navItems = [
  { href: '/', id: 'nav.home', icon: Home },
  { href: '/schedules', id: 'nav.schedules', icon: Calendar },
  { href: '/goals', id: 'nav.goals', icon: Target },
  { href: '/history', id: 'nav.history', icon: Clock },
  { href: '/settings', id: 'nav.settings', icon: Settings },
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const intl = useIntl()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <img
            src="/sherpa-icon-192.png"
            alt="SherpaPay"
            className="h-9 w-9 rounded-md shadow-sm"
            width={32}
            height={32}
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-4 text-foreground">SherpaPay</span>
            <span className="hidden text-xs text-muted-foreground sm:block">Celo payments</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-lg border border-border/70 bg-card/70 p-1 text-sm font-medium md:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md px-3 py-2 transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                {intl.formatMessage({ id: item.id })}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitcher />
          <ConnectButton />
          <button
            type="button"
            aria-label="Toggle navigation"
            className="rounded-md border border-border/80 bg-card p-2 text-muted-foreground transition-colors hover:text-foreground md:hidden"
            onClick={() => {
              setMobileOpen(!mobileOpen)
            }}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="space-y-1 border-t border-border/70 bg-background/95 p-3 md:hidden">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
                onClick={() => {
                  setMobileOpen(false)
                }}
              >
                <item.icon className="h-4 w-4" />
                {intl.formatMessage({ id: item.id })}
              </Link>
            )
          })}
        </nav>
      )}
    </header>
  )
}

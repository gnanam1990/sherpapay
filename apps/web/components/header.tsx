'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useIntl } from 'react-intl'
import { useMiniPay } from '@sherpapay/minipay'
import { cn } from '@/lib/utils'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'

const NAV = [
  { href: '/', id: 'nav.home' },
  { href: '/schedules', id: 'nav.schedules' },
  { href: '/goals', id: 'nav.goals' },
  { href: '/subscriptions', id: 'nav.subscriptions' },
  { href: '/analytics', id: 'nav.analytics' },
  { href: '/history', id: 'nav.history' },
  { href: '/settings', id: 'nav.settings' },
]

export function Header() {
  const pathname = usePathname()
  const intl = useIntl()
  const { isMiniPay } = useMiniPay()

  return (
    <header className="sticky top-4 z-50 mx-auto w-full max-w-5xl px-4">
      <div className="glass-nav flex items-center justify-between rounded-3xl px-5 py-2.5">
        <Link
          href="/"
          aria-label="SherpaPay home"
          className="flex shrink-0 items-center gap-2 font-bold text-foreground"
        >
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-celo-green text-sm font-extrabold text-[#0d2818] shadow-glow-celo">
            S
          </span>
          <span className="hidden sm:inline">SherpaPay</span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'text-foreground transition-opacity',
                  active ? 'opacity-100' : 'opacity-50 hover:opacity-80',
                )}
              >
                {intl.formatMessage({ id: item.id })}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {/* ConnectButton.Custom keeps full RainbowKit wallet/chain
              functionality (connect, account, network) behind the
              soft-glass pill — no functional regression. */}
          <ConnectButton.Custom>
            {({ account, chain, mounted, openConnectModal, openAccountModal, openChainModal }) => {
              if (!mounted) return <div className="h-8 w-24" />
              if (!account || !chain) {
                return (
                  <button
                    type="button"
                    onClick={() => {
                      openConnectModal()
                    }}
                    className="rounded-full bg-accent-gradient px-4 py-1.5 text-[13px] font-bold text-white shadow-glow-accent transition hover:opacity-95"
                  >
                    Connect
                  </button>
                )
              }
              if (chain.unsupported) {
                return (
                  <button
                    type="button"
                    onClick={() => {
                      openChainModal()
                    }}
                    className="rounded-full bg-destructive px-4 py-1.5 text-[13px] font-bold text-destructive-foreground transition hover:opacity-95"
                  >
                    Wrong network
                  </button>
                )
              }
              return (
                <button
                  type="button"
                  onClick={() => {
                    openAccountModal()
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-foreground/[0.08] px-3 py-1.5 font-mono text-[11px] text-foreground transition hover:bg-foreground/[0.14] dark:bg-white/[0.08] dark:hover:bg-white/[0.14]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-celo-green shadow-glow-celo" />
                  {account.address.slice(0, 6)}…{account.address.slice(-4)}
                  {isMiniPay && (
                    <span className="ml-1 text-celo-green-dark dark:text-celo-green-light">✨</span>
                  )}
                </button>
              )
            }}
          </ConnectButton.Custom>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

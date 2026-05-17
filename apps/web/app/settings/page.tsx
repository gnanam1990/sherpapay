'use client'

import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'
import { Globe2, Languages, Phone, UserRoundPlus } from 'lucide-react'
import { AliasManager } from '@/components/alias-manager'
import { PhoneManager } from '@/components/phone-manager'
import { LanguageSwitcher } from '@/components/language-switcher'
import { CurrencyPicker } from '@/components/currency-picker'

export default function SettingsPage() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container flex-1 py-6 pb-24 md:py-8">
          <div className="mx-auto max-w-3xl space-y-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Settings</h1>
              <p className="mt-1 text-sm text-foreground/60">
                Aliases, phone contacts, language, and display preferences.
              </p>
            </div>

            <section className="glass-card animate-fade-in rounded-3xl p-5">
              <div className="flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent-gradient text-white">
                  <UserRoundPlus className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-foreground">Recipient aliases</h2>
                  <p className="mt-1 text-sm text-foreground/60">
                    Save friendly names per wallet, then say &ldquo;send 5 cUSD to mom&rdquo;.
                  </p>
                  <div className="mt-4">
                    <AliasManager />
                  </div>
                </div>
              </div>
            </section>

            <section className="glass-card animate-fade-in rounded-3xl p-5">
              <div className="flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent-gradient text-white">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-foreground">Phone contacts</h2>
                  <p className="mt-1 text-sm text-foreground/60">
                    Map a phone number to a wallet, then say &ldquo;send 5 cUSD to
                    +2348012345678&rdquo;.
                  </p>
                  <p className="celo-tag mt-2 rounded-2xl px-3 py-2 text-[11px] leading-relaxed">
                    Phone numbers are matched <strong>locally on this device</strong>. We don&apos;t
                    query a network registry — coming with Self.id integration.
                  </p>
                  <div className="mt-4">
                    <PhoneManager />
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="glass-card rounded-3xl p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Languages className="h-4 w-4 text-celo-green-dark dark:text-celo-green-light" />
                  <h2 className="font-bold text-foreground">Language</h2>
                </div>
                <p className="mb-3 text-xs text-foreground/55">
                  Applies across the app (also in the header).
                </p>
                <LanguageSwitcher />
              </div>

              <div className="glass-card rounded-3xl p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Globe2 className="h-4 w-4 text-celo-green-dark dark:text-celo-green-light" />
                  <h2 className="font-bold text-foreground">Display currency</h2>
                </div>
                <p className="mb-3 text-xs text-foreground/55">
                  Override the language-derived currency for amount approximations.
                </p>
                <CurrencyPicker />
              </div>
            </section>
          </div>
        </main>
        <BottomNav />
      </div>
    </Providers>
  )
}

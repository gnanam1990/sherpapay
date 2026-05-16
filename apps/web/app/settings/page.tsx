'use client'

import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'
import { Globe2, Languages, UserRoundPlus } from 'lucide-react'

export default function SettingsPage() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container flex-1 py-6 pb-24 md:py-8">
          <div className="mx-auto max-w-3xl space-y-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Preferences for the next release.
              </p>
            </div>

            <section className="rounded-lg border border-border/70 bg-card/85 p-5 shadow-soft-panel">
              <div className="flex items-start gap-4">
                <div className="grid h-10 w-10 place-items-center rounded-md border border-primary/25 bg-primary/10 text-primary">
                  <UserRoundPlus className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">Recipient aliases</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Friendly names will map to wallet addresses after the address book ships.
                  </p>
                  <button
                    type="button"
                    disabled
                    className="mt-4 rounded-md border border-border/80 px-4 py-2 text-sm text-muted-foreground"
                  >
                    Coming soon
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-card/85 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Globe2 className="h-4 w-4 text-celo" />
                  <h2 className="font-semibold">Display currency</h2>
                </div>
                <select className="w-full rounded-md border border-input bg-background px-3 py-3 text-sm text-foreground">
                  <option>USD (cUSD)</option>
                  <option>EUR (cEUR)</option>
                  <option>NGN (Nigerian Naira)</option>
                  <option>KES (Kenyan Shilling)</option>
                  <option>GHS (Ghanaian Cedi)</option>
                  <option>MXN (Mexican Peso)</option>
                  <option>PHP (Philippine Peso)</option>
                  <option>INR (Indian Rupee)</option>
                </select>
              </div>

              <div className="rounded-lg border border-border/70 bg-card/85 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Languages className="h-4 w-4 text-accent" />
                  <h2 className="font-semibold">Language</h2>
                </div>
                <select className="w-full rounded-md border border-input bg-background px-3 py-3 text-sm text-foreground">
                  <option>English</option>
                  <option>Swahili</option>
                  <option>Spanish</option>
                  <option>Hindi</option>
                  <option>Filipino</option>
                </select>
              </div>
            </section>
          </div>
        </main>
        <BottomNav />
      </div>
    </Providers>
  )
}

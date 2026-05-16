'use client'

import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'

export default function SettingsPage() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8 pb-20 md:pb-8">
          <h1 className="text-2xl font-bold mb-6">Settings</h1>
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-6">
              <h2 className="font-semibold mb-4">Recipient Aliases</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Map friendly names to wallet addresses
              </p>
              <button className="rounded-lg bg-primary px-4 py-2 text-sm text-white">
                Add Alias
              </button>
            </div>

            <div className="rounded-xl border bg-card p-6">
              <h2 className="font-semibold mb-4">Display Currency</h2>
              <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
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

            <div className="rounded-xl border bg-card p-6">
              <h2 className="font-semibold mb-4">Language</h2>
              <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                <option>English</option>
                <option>Swahili</option>
                <option>Spanish</option>
                <option>Hindi</option>
                <option>Filipino</option>
              </select>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    </Providers>
  )
}

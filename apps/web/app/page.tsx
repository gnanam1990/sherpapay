'use client'

import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'
import '@rainbow-me/rainbowkit/styles.css'

export default function HomePage() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8 pb-20 md:pb-8">
          <div className="flex flex-col items-center justify-center space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Type once. <span className="text-celo">Send forever.</span>
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Schedule recurring payments on Celo with plain English
              </p>
            </div>

            <div className="w-full max-w-2xl">
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  What would you like to do?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button className="rounded-lg border p-4 text-left hover:bg-muted transition-colors">
                    <p className="font-medium">Send</p>
                    <p className="text-xs text-muted-foreground">One-time payment</p>
                  </button>
                  <button className="rounded-lg border p-4 text-left hover:bg-muted transition-colors">
                    <p className="font-medium">Schedule</p>
                    <p className="text-xs text-muted-foreground">Recurring payments</p>
                  </button>
                  <button className="rounded-lg border p-4 text-left hover:bg-muted transition-colors">
                    <p className="font-medium">Save</p>
                    <p className="text-xs text-muted-foreground">Savings goals</p>
                  </button>
                </div>
              </div>
            </div>

            <div className="w-full max-w-2xl">
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <p className="text-sm text-muted-foreground mb-4">Quick actions</p>
                <div className="space-y-2">
                  <button className="w-full rounded-lg border p-3 text-left text-sm hover:bg-muted transition-colors">
                    &quot;send 5 cUSD to mom every friday&quot;
                  </button>
                  <button className="w-full rounded-lg border p-3 text-left text-sm hover:bg-muted transition-colors">
                    &quot;save 50 cUSD every week for emergency&quot;
                  </button>
                  <button className="w-full rounded-lg border p-3 text-left text-sm hover:bg-muted transition-colors">
                    &quot;send 100 cUSD to landlord every month&quot;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    </Providers>
  )
}

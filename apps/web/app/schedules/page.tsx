'use client'

import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'

export default function SchedulesPage() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8 pb-20 md:pb-8">
          <h1 className="text-2xl font-bold mb-6">Schedules</h1>
          <div className="rounded-xl border bg-card p-8 text-center">
            <p className="text-muted-foreground">No active schedules yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create one by typing a command like &quot;send 5 cUSD to mom every friday&quot;
            </p>
          </div>
        </main>
        <BottomNav />
      </div>
    </Providers>
  )
}

'use client'

import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'
import { EmptyState } from '@/components/empty-state'
import { CalendarClock } from 'lucide-react'

export default function SchedulesPage() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container flex-1 py-6 pb-24 md:py-8">
          <EmptyState
            icon={CalendarClock}
            title="Schedules"
            description="Recurring transfers are waiting on the Celo scheduler contract deployment."
            actionHref="/"
            actionLabel="Open command"
            tone="accent"
          />
        </main>
        <BottomNav />
      </div>
    </Providers>
  )
}

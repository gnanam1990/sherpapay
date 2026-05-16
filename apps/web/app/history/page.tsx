'use client'

import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'
import { EmptyState } from '@/components/empty-state'
import { Clock3 } from 'lucide-react'

export default function HistoryPage() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container flex-1 py-6 pb-24 md:py-8">
          <EmptyState
            icon={Clock3}
            title="Transaction History"
            description="Local transfer history appears here after the production indexer is connected."
            actionHref="/"
            actionLabel="Open command"
          />
        </main>
        <BottomNav />
      </div>
    </Providers>
  )
}

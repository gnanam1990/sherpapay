'use client'

import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'
import { EmptyState } from '@/components/empty-state'
import { Target } from 'lucide-react'

export default function GoalsPage() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container flex-1 py-6 pb-24 md:py-8">
          <EmptyState
            icon={Target}
            title="Savings Goals"
            description="Vault-backed goals unlock after the SherpaPayVault contract is deployed."
            actionHref="/"
            actionLabel="Open command"
            tone="celo"
          />
        </main>
        <BottomNav />
      </div>
    </Providers>
  )
}

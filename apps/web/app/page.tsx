'use client'

import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'
import { HomeFlow } from '@/components/home-flow'
import '@rainbow-me/rainbowkit/styles.css'

export default function HomePage() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8 pb-20 md:pb-8">
          <HomeFlow />
        </main>
        <BottomNav />
      </div>
    </Providers>
  )
}

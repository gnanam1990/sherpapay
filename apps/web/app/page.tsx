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
        <main className="container flex-1 py-6 pb-24 md:py-8">
          <HomeFlow />
        </main>
        <BottomNav />
      </div>
    </Providers>
  )
}

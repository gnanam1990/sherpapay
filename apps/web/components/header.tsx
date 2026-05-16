'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'
import { Mountain, Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Mountain className="h-6 w-6 text-celo" />
          <span className="font-bold text-primary">SherpaPay</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link href="/schedules" className="transition-colors hover:text-primary">
            Schedules
          </Link>
          <Link href="/goals" className="transition-colors hover:text-primary">
            Goals
          </Link>
          <Link href="/history" className="transition-colors hover:text-primary">
            History
          </Link>
          <Link href="/settings" className="transition-colors hover:text-primary">
            Settings
          </Link>
        </nav>

        <div className="ml-auto flex items-center space-x-4">
          <ConnectButton />
          <button
            className="md:hidden"
            onClick={() => {
              setMobileOpen(!mobileOpen)
            }}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t p-4 space-y-3">
          <Link
            href="/schedules"
            className="block py-2"
            onClick={() => {
              setMobileOpen(false)
            }}
          >
            Schedules
          </Link>
          <Link
            href="/goals"
            className="block py-2"
            onClick={() => {
              setMobileOpen(false)
            }}
          >
            Goals
          </Link>
          <Link
            href="/history"
            className="block py-2"
            onClick={() => {
              setMobileOpen(false)
            }}
          >
            History
          </Link>
          <Link
            href="/settings"
            className="block py-2"
            onClick={() => {
              setMobileOpen(false)
            }}
          >
            Settings
          </Link>
        </nav>
      )}
    </header>
  )
}

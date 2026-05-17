'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className="h-9 w-9" />

  return (
    <button
      type="button"
      onClick={() => {
        setTheme(theme === 'dark' ? 'light' : 'dark')
      }}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/40 text-foreground transition hover:bg-white/60 dark:bg-white/10 dark:hover:bg-white/20"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  )
}

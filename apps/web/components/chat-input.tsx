'use client'

import { useState, useCallback } from 'react'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onSubmit: (input: string) => void
  isLoading?: boolean
}

export function ChatInput({ onSubmit, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('')

  const handleSubmit = useCallback(
    (e: React.SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (input.trim() && !isLoading) {
        onSubmit(input.trim())
        setInput('')
      }
    },
    [input, isLoading, onSubmit],
  )

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl mx-auto">
      <input
        type="text"
        value={input}
        onChange={(e) => {
          setInput(e.target.value)
        }}
        placeholder='Try "send 0.01 cUSD to 0x..."'
        className="w-full rounded-xl border bg-background px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={!input.trim() || isLoading}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary p-2 text-white disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  )
}

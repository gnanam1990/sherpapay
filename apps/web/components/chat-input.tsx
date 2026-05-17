'use client'

import { useState, useCallback } from 'react'
import { Send, Terminal } from 'lucide-react'
import { VoiceInput } from '@/components/voice-input'
import { useLocale } from '@/components/i18n-provider'

interface ChatInputProps {
  onSubmit: (input: string) => void
  isLoading?: boolean
}

export function ChatInput({ onSubmit, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('')
  const { locale } = useLocale()

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
    <form
      onSubmit={handleSubmit}
      className="flex w-full items-center gap-3 rounded-lg border border-input bg-background/90 p-2 shadow-inner shadow-black/20 focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/25"
    >
      <Terminal className="ml-2 h-4 w-4 shrink-0 text-celo" />
      <input
        type="text"
        value={input}
        onChange={(e) => {
          setInput(e.target.value)
        }}
        placeholder='Try "send 0.01 cUSD to 0x..."'
        className="min-w-0 flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-base"
        disabled={isLoading}
      />
      <VoiceInput locale={locale} onTranscript={setInput} disabled={isLoading} />
      <button
        type="submit"
        disabled={!input.trim() || isLoading}
        aria-label="Preview command"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import {
  getSpeechRecognition,
  pickRecognitionLang,
  processResult,
  type SpeechRecognitionInstance,
  type SpeechRecognitionResultEvent,
} from '@/lib/voice'
import type { Locale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type VoiceState = 'idle' | 'listening' | 'processing' | 'denied'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  locale: Locale
  disabled?: boolean
}

export function VoiceInput({ onTranscript, locale, disabled }: VoiceInputProps) {
  // null until the effect runs; false = unsupported (render nothing).
  const [supported, setSupported] = useState<boolean | null>(null)
  const [state, setState] = useState<VoiceState>('idle')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  useEffect(() => {
    setSupported(getSpeechRecognition(typeof window === 'undefined' ? undefined : window) !== null)
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  // Unsupported (incl. MiniPay's webview): hide entirely, no error spam.
  if (supported === false) return null

  function start() {
    const Ctor = getSpeechRecognition(typeof window === 'undefined' ? undefined : window)
    if (!Ctor) return
    const recognition = new Ctor()
    recognitionRef.current = recognition
    recognition.lang = pickRecognitionLang(locale)
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setState('listening')
    }
    recognition.onresult = (e: SpeechRecognitionResultEvent) => {
      setState('processing')
      const alt = e.results?.[0]?.[0]
      const text = alt
        ? processResult({ transcript: alt.transcript, confidence: alt.confidence })
        : null
      if (text) onTranscript(text)
      setState('idle')
    }
    recognition.onerror = (e: { error: string }) => {
      setState(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : 'idle')
    }
    recognition.onend = () => {
      setState((s) => (s === 'listening' || s === 'processing' ? 'idle' : s))
    }

    try {
      recognition.start()
    } catch {
      // start() throws if already started — ignore, onend resets us.
    }
  }

  function toggle() {
    if (state === 'listening') {
      recognitionRef.current?.stop()
      setState('idle')
      return
    }
    if (state === 'denied') setState('idle')
    start()
  }

  const label =
    state === 'listening'
      ? 'Listening — tap to stop'
      : state === 'processing'
        ? 'Processing speech'
        : state === 'denied'
          ? 'Microphone blocked — enable it in your browser, then tap again'
          : 'Speak your command'

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={Boolean(disabled) || state === 'processing'}
      aria-label={label}
      title={label}
      className={cn(
        'grid h-11 w-11 shrink-0 place-items-center rounded-md transition-colors disabled:cursor-not-allowed',
        state === 'listening' && 'animate-pulse bg-destructive text-white',
        state === 'processing' && 'bg-muted text-muted-foreground',
        state === 'denied' && 'bg-destructive/15 text-destructive',
        state === 'idle' &&
          'bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.12] dark:bg-white/[0.06] dark:hover:bg-white/[0.12]',
      )}
    >
      {state === 'processing' ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : state === 'denied' ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  )
}

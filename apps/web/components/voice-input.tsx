'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import {
  getSpeechRecognition,
  pickRecognitionLang,
  processResult,
  collectTranscripts,
  VOICE_MIN_CONFIDENCE,
  type SpeechRecognitionInstance,
  type SpeechRecognitionResultEvent,
} from '@/lib/voice'
import type { Locale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type VoiceState = 'idle' | 'listening' | 'processing' | 'denied'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  /** Live partial transcript while speaking (''=clear). Optional. */
  onInterim?: (text: string) => void
  locale: Locale
  disabled?: boolean
}

export function VoiceInput({ onTranscript, onInterim, locale, disabled }: VoiceInputProps) {
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

  // Render nothing until detection confirms support. `null` (pre-effect,
  // matches SSR → no hydration mismatch) and `false` (unsupported, incl.
  // MiniPay's webview) both hide the button entirely — no flash, no error
  // spam. Supported browsers reveal it one invisible frame later.
  if (!supported) return null

  function start() {
    const Ctor = getSpeechRecognition(typeof window === 'undefined' ? undefined : window)
    if (!Ctor) return
    const recognition = new Ctor()
    recognitionRef.current = recognition
    recognition.lang = pickRecognitionLang(locale)
    recognition.continuous = false
    // Interim results give the user live feedback that it's hearing them
    // (the failure modes were invisible before).
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      // eslint-disable-next-line no-console -- intentional voice debug log
      console.log(`[voice] start (lang=${recognition.lang})`)
      onInterim?.('')
      setState('listening')
    }

    recognition.onresult = (e: SpeechRecognitionResultEvent) => {
      const { final, interim } = collectTranscripts(e)

      if (interim) {
        // eslint-disable-next-line no-console -- intentional voice debug log
        console.log(`[voice] interim: "${interim}"`)
        onInterim?.(interim)
      }

      if (!final) return

      // eslint-disable-next-line no-console -- intentional voice debug log
      console.log(`[voice] final: "${final.transcript}" (confidence=${String(final.confidence)})`)
      setState('processing')
      const text = processResult(final)
      if (text) {
        // eslint-disable-next-line no-console -- intentional voice debug log
        console.log(`[voice] accepted → "${text}"`)
        onInterim?.('')
        onTranscript(text)
      } else {
        const why =
          typeof final.confidence === 'number' && final.confidence < VOICE_MIN_CONFIDENCE
            ? `confidence ${String(final.confidence)} < ${String(VOICE_MIN_CONFIDENCE)}`
            : 'empty after filler/number cleaning'
        // eslint-disable-next-line no-console -- intentional voice debug log
        console.warn(`[voice] discarded (${why})`)
        onInterim?.('')
      }
      setState('idle')
    }

    recognition.onerror = (e: { error: string }) => {
      // eslint-disable-next-line no-console -- intentional voice debug log
      console.warn(`[voice] error: ${e.error}`)
      onInterim?.('')
      setState(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : 'idle')
    }

    recognition.onend = () => {
      // eslint-disable-next-line no-console -- intentional voice debug log
      console.log('[voice] end')
      onInterim?.('')
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

'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import {
  getSpeechRecognition,
  pickRecognitionLang,
  processResult,
  collectTranscripts,
  type VoiceResult,
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
  /** Human-readable diagnostic of the last voice stage (on-screen). */
  onStatus?: (msg: string) => void
  locale: Locale
  disabled?: boolean
}

// Plain-language hint per Web Speech error code so the user can tell us
// which layer failed without opening DevTools.
function errorHint(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone blocked — allow it for this site, then tap again.'
    case 'no-speech':
      return "Didn't hear any speech — check the mic, speak, then tap again."
    case 'audio-capture':
      return 'No microphone found — check your input device.'
    case 'network':
      return 'Speech service unreachable (network). Chrome voice needs an unrestricted connection.'
    case 'aborted':
      return 'Voice input stopped.'
    default:
      return `Voice error: ${code}.`
  }
}

export function VoiceInput({
  onTranscript,
  onInterim,
  onStatus,
  locale,
  disabled,
}: VoiceInputProps) {
  // null until the effect runs; false = unsupported (render nothing).
  const [supported, setSupported] = useState<boolean | null>(null)
  const [state, setState] = useState<VoiceState>('idle')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  // Best transcript heard this session (final preferred, else interim).
  const heardRef = useRef<VoiceResult | null>(null)
  const acceptedRef = useRef(false)

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

  function report(msg: string) {
    // eslint-disable-next-line no-console -- intentional voice debug log
    console.log(`[voice] ${msg}`)
    onStatus?.(msg)
  }

  function start() {
    const Ctor = getSpeechRecognition(typeof window === 'undefined' ? undefined : window)
    if (!Ctor) return
    const recognition = new Ctor()
    recognitionRef.current = recognition
    recognition.lang = pickRecognitionLang(locale)
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    heardRef.current = null
    acceptedRef.current = false

    recognition.onstart = () => {
      report(`listening (${recognition.lang})…`)
      onInterim?.('')
      setState('listening')
    }

    recognition.onresult = (e: SpeechRecognitionResultEvent) => {
      const { final, interim } = collectTranscripts(e)

      if (interim) {
        heardRef.current = { transcript: interim }
        onInterim?.(interim)
      }

      if (!final) return
      heardRef.current = final
      setState('processing')
      const text = processResult(final)
      if (text) {
        acceptedRef.current = true
        report(`heard "${text}"`)
        onInterim?.('')
        onTranscript(text)
        setState('idle')
      } else {
        // Don't accept here, but don't discard either — onend will fall
        // back to this transcript rather than fail silently.
        report(
          `low confidence (${String(final.confidence)}) for "${final.transcript}" — using it anyway`,
        )
      }
    }

    recognition.onerror = (e: { error: string }) => {
      report(errorHint(e.error))
      onInterim?.('')
      setState(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : 'idle')
    }

    recognition.onend = () => {
      onInterim?.('')
      if (!acceptedRef.current) {
        const heard = heardRef.current
        // Never silently fail: surface the best transcript heard even if
        // it was below the confidence gate (the user reviews the field).
        const fallback = heard ? processResult({ transcript: heard.transcript }) : null
        if (fallback) {
          report(`used best-effort transcript "${fallback}" — review before sending`)
          onTranscript(fallback)
        } else {
          report('no usable speech detected — check the mic and try again')
        }
      }
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

/**
 * Pure voice-input logic, kept out of the React component so it can be
 * unit-tested in the node test env (no jsdom). The component is a thin
 * shell around the Web Speech API that delegates to these.
 */

import { normalizeSpokenNumbers } from '@sherpapay/parser'
import type { Locale } from '@/lib/i18n'

/** Speech-recognition language per app locale. Falls back to en-US. */
export function pickRecognitionLang(locale: Locale): string {
  switch (locale) {
    case 'en':
      return 'en-US'
    case 'sw':
      return 'sw-KE'
    case 'es':
      return 'es-MX'
    case 'hi':
      return 'hi-IN'
    default:
      return 'en-US'
  }
}

// Tight, safe filler set — only true verbal noise, never meaningful words.
const FILLERS = new Set(['uh', 'uhh', 'um', 'umm', 'er', 'erm', 'ah', 'hmm', 'mmm'])

function isFiller(token: string): boolean {
  return FILLERS.has(token.toLowerCase().replace(/[^a-z]/g, ''))
}

/** Strip filler words, then turn dictated number words into digits. */
export function cleanTranscript(transcript: string): string {
  const withoutFillers = transcript
    .split(/\s+/)
    .filter((t) => t && !isFiller(t))
    .join(' ')
  return normalizeSpokenNumbers(withoutFillers)
}

export interface VoiceResult {
  transcript: string
  /** 0–1. Some engines omit it; undefined/NaN means "can't judge". */
  confidence?: number
}

/**
 * Lenient on purpose. Real-world Web Speech (mobile speakers, accents,
 * ambient noise) routinely returns 0.4–0.6 confidence even for correct
 * transcripts; the textbook 0.7 silently drops them. The user reviews
 * and can edit the input field before submitting, so a permissive gate
 * with a visible result beats a strict gate that fails silently.
 */
export const VOICE_MIN_CONFIDENCE = 0.3

/**
 * Clean a recognition result, discarding low-confidence or empty ones.
 * Returns null when the result should be ignored.
 */
export function processResult(
  result: VoiceResult,
  minConfidence: number = VOICE_MIN_CONFIDENCE,
): string | null {
  const { transcript, confidence } = result
  if (typeof confidence === 'number' && Number.isFinite(confidence) && confidence < minConfidence) {
    return null
  }
  const cleaned = cleanTranscript(transcript).trim()
  return cleaned.length > 0 ? cleaned : null
}

export interface SpeechAlternative {
  transcript: string
  confidence: number
}

export interface SpeechResult extends ArrayLike<SpeechAlternative> {
  isFinal: boolean
}

export interface SpeechRecognitionResultEvent {
  results: ArrayLike<SpeechResult>
  /** Index of the first result not yet delivered. */
  resultIndex: number
}

/**
 * Split a recognition event into the finalized transcript (if any) and
 * the still-being-spoken interim text, processing only results from
 * `resultIndex` onward (already-delivered ones are skipped). Final
 * confidence is the lowest across finalized pieces (conservative).
 */
export function collectTranscripts(event: SpeechRecognitionResultEvent): {
  final: VoiceResult | null
  interim: string
} {
  const finalParts: string[] = []
  const interimParts: string[] = []
  let minConfidence = Number.POSITIVE_INFINITY

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const res = event.results[i]
    const alt = res?.[0]
    if (!res || !alt) continue
    if (res.isFinal) {
      finalParts.push(alt.transcript)
      if (Number.isFinite(alt.confidence)) {
        minConfidence = Math.min(minConfidence, alt.confidence)
      }
    } else {
      interimParts.push(alt.transcript)
    }
  }

  const finalText = finalParts.join(' ').replace(/\s+/g, ' ').trim()
  const final: VoiceResult | null = finalText
    ? {
        transcript: finalText,
        confidence: Number.isFinite(minConfidence) ? minConfidence : undefined,
      }
    : null

  return { final, interim: interimParts.join(' ').replace(/\s+/g, ' ').trim() }
}

export interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

export type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

/** Feature detection: the SpeechRecognition constructor, or null. */
export function getSpeechRecognition(win?: unknown): SpeechRecognitionCtor | null {
  if (!win || typeof win !== 'object') return null
  const w = win as Record<string, unknown>
  const ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
  return typeof ctor === 'function' ? (ctor as SpeechRecognitionCtor) : null
}

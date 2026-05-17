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

const MIN_CONFIDENCE = 0.7

/**
 * Clean a recognition result, discarding low-confidence or empty ones.
 * Returns null when the result should be ignored.
 */
export function processResult(
  result: VoiceResult,
  minConfidence: number = MIN_CONFIDENCE,
): string | null {
  const { transcript, confidence } = result
  if (typeof confidence === 'number' && Number.isFinite(confidence) && confidence < minConfidence) {
    return null
  }
  const cleaned = cleanTranscript(transcript).trim()
  return cleaned.length > 0 ? cleaned : null
}

export interface SpeechRecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>>
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

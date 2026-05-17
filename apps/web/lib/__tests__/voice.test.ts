import { describe, it, expect } from 'vitest'
import {
  pickRecognitionLang,
  cleanTranscript,
  processResult,
  getSpeechRecognition,
  collectTranscripts,
  VOICE_MIN_CONFIDENCE,
} from '../voice'

describe('pickRecognitionLang', () => {
  it('maps each supported locale to a BCP-47 tag', () => {
    expect(pickRecognitionLang('en')).toBe('en-US')
    expect(pickRecognitionLang('sw')).toBe('sw-KE')
    expect(pickRecognitionLang('es')).toBe('es-MX')
    expect(pickRecognitionLang('hi')).toBe('hi-IN')
  })

  it('falls back to en-US for anything unexpected', () => {
    // @ts-expect-error deliberately invalid locale
    expect(pickRecognitionLang('xx')).toBe('en-US')
  })
})

describe('cleanTranscript', () => {
  it('strips filler words', () => {
    expect(cleanTranscript('um send uh five cUSD to mom')).toBe('send 5 cUSD to mom')
  })

  it('applies spoken-number normalization after stripping fillers', () => {
    expect(cleanTranscript('send um five point five cUSD to mom')).toBe('send 5.5 cUSD to mom')
  })

  it('collapses whitespace and trims', () => {
    expect(cleanTranscript('  send   five    cUSD  ')).toBe('send 5 cUSD')
  })

  it('handles a dictated phone after fillers', () => {
    expect(cleanTranscript('uh send five cUSD to plus two three four eight zero')).toBe(
      'send 5 cUSD to +23480',
    )
  })
})

describe('processResult', () => {
  it('uses a lenient 0.3 default threshold (real-world Web Speech is noisy)', () => {
    expect(VOICE_MIN_CONFIDENCE).toBe(0.3)
  })

  it('discards results below 0.3', () => {
    expect(processResult({ transcript: 'send five cUSD', confidence: 0.2 })).toBeNull()
  })

  it('accepts mid/low-confidence results that 0.7 would have dropped', () => {
    expect(processResult({ transcript: 'send five cUSD', confidence: 0.3 })).toBe('send 5 cUSD')
    expect(processResult({ transcript: 'send five cUSD', confidence: 0.45 })).toBe('send 5 cUSD')
    expect(processResult({ transcript: 'send five cUSD', confidence: 0.6 })).toBe('send 5 cUSD')
  })

  it('accepts when confidence is not reported (undefined/NaN)', () => {
    expect(processResult({ transcript: 'send nine USDT to bob' })).toBe('send 9 USDT to bob')
    expect(processResult({ transcript: 'send nine USDT', confidence: NaN })).toBe('send 9 USDT')
  })

  it('returns null for an empty/filler-only transcript', () => {
    expect(processResult({ transcript: '   ', confidence: 0.9 })).toBeNull()
    expect(processResult({ transcript: 'um uh', confidence: 0.9 })).toBeNull()
  })
})

describe('collectTranscripts', () => {
  function result(transcript: string, confidence: number, isFinal: boolean) {
    return { 0: { transcript, confidence }, length: 1, isFinal }
  }

  it('extracts a single final alternative (resultIndex omitted)', () => {
    const r = collectTranscripts({ results: [result('send five cUSD', 0.5, true)] })
    expect(r.final).toEqual({ transcript: 'send five cUSD', confidence: 0.5 })
    expect(r.interim).toBe('')
  })

  it('returns interim text and no final while still speaking', () => {
    const r = collectTranscripts({ results: [result('send five', 0.4, false)] })
    expect(r.final).toBeNull()
    expect(r.interim).toBe('send five')
  })

  it('is robust when the engine omits resultIndex (undefined)', () => {
    // The bug: a numeric-only loop start silently produced no final on
    // engines that do not set resultIndex.
    const r = collectTranscripts({
      results: [result('send one cUSD to mom', 0.42, true)],
      resultIndex: undefined,
    })
    expect(r.final).toEqual({ transcript: 'send one cUSD to mom', confidence: 0.42 })
  })

  it('processes all results regardless of a non-zero resultIndex', () => {
    const r = collectTranscripts({
      results: [result('send five cUSD', 0.8, true), result('to mom', 0.4, true)],
      resultIndex: 1,
    })
    expect(r.final).toEqual({ transcript: 'send five cUSD to mom', confidence: 0.4 })
    expect(r.interim).toBe('')
  })

  it('returns both a final and a trailing interim when present', () => {
    const r = collectTranscripts({
      results: [result('send five cUSD', 0.7, true), result('to mom', 0.3, false)],
    })
    expect(r.final).toEqual({ transcript: 'send five cUSD', confidence: 0.7 })
    expect(r.interim).toBe('to mom')
  })
})

describe('getSpeechRecognition (feature detection)', () => {
  class FakeRecognition {}

  it('returns window.SpeechRecognition when present', () => {
    const win = { SpeechRecognition: FakeRecognition }
    expect(getSpeechRecognition(win)).toBe(FakeRecognition)
  })

  it('falls back to webkitSpeechRecognition', () => {
    const win = { webkitSpeechRecognition: FakeRecognition }
    expect(getSpeechRecognition(win)).toBe(FakeRecognition)
  })

  it('returns null when unsupported', () => {
    expect(getSpeechRecognition({})).toBeNull()
    expect(getSpeechRecognition(undefined)).toBeNull()
  })
})

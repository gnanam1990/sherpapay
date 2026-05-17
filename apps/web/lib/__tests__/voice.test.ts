import { describe, it, expect } from 'vitest'
import { pickRecognitionLang, cleanTranscript, processResult, getSpeechRecognition } from '../voice'

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
  it('discards results below the 0.7 confidence threshold', () => {
    expect(processResult({ transcript: 'send five cUSD', confidence: 0.6 })).toBeNull()
  })

  it('accepts results at or above 0.7', () => {
    expect(processResult({ transcript: 'send five cUSD', confidence: 0.7 })).toBe('send 5 cUSD')
    expect(processResult({ transcript: 'send five cUSD', confidence: 0.95 })).toBe('send 5 cUSD')
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

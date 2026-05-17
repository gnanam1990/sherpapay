/**
 * Turn dictated number words into digits so voice transcripts parse the
 * same as typed input. Scoped deliberately to single digits 0–9 plus the
 * connectors people speak in amounts and phone numbers ("plus", "point",
 * "oh", "dash", "space"). Multi-word magnitudes ("twenty", "hundred") are
 * intentionally NOT handled — say "send five cUSD", not "send twenty".
 *
 * Consecutive number words concatenate into one token, so a dictated
 * international phone ("plus two three four …") becomes "+234…", while a
 * lone "five" before "cUSD" stays a standalone amount.
 */

const DIGITS: Record<string, string> = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
}

// Dictated separators that appear *inside* a spoken number — dropped so
// the digit run stays contiguous (phone normalization strips them anyway).
const RUN_SEPARATORS = new Set(['dash', 'hyphen', 'space'])

function wordKey(token: string): string {
  return token.toLowerCase().replace(/[^a-z]/g, '')
}

export function normalizeSpokenNumbers(text: string): string {
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return ''

  const out: string[] = []
  let run: string | null = null

  const flush = (): void => {
    if (run !== null) {
      out.push(run)
      run = null
    }
  }

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i] ?? ''
    const key = wordKey(tok)
    const nextKey = wordKey(tokens[i + 1] ?? '')

    const digit = DIGITS[key]
    if (digit !== undefined) {
      run = (run ?? '') + digit
      continue
    }

    if ((key === 'oh' || key === 'o') && run !== null) {
      run += '0'
      continue
    }

    if (key === 'plus') {
      flush()
      if (DIGITS[nextKey] !== undefined) {
        run = '+'
      } else {
        out.push(tok)
      }
      continue
    }

    if ((key === 'point' || key === 'dot') && run !== null) {
      if (DIGITS[nextKey] !== undefined) {
        run += '.'
      } else {
        flush()
        out.push(tok)
      }
      continue
    }

    if (RUN_SEPARATORS.has(key) && run !== null) {
      continue
    }

    flush()
    out.push(tok)
  }

  flush()
  return out.join(' ')
}

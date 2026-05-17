'use client'

import { useState } from 'react'
import { Trash2, UserRoundPlus } from 'lucide-react'
import { isValidAddress, formatAddress } from '@sherpapay/core'
import { useAliases } from '@/lib/use-aliases'

export function AliasManager() {
  const { connected, entries, add, remove } = useAliases()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState<string | null>(null)

  function onAdd() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Enter a name.')
      return
    }
    if (!isValidAddress(address.trim())) {
      setError('Enter a valid 0x wallet address.')
      return
    }
    add(trimmedName, address.trim())
    setName('')
    setAddress('')
    setError(null)
  }

  if (!connected) {
    return (
      <p className="text-sm text-foreground/55">
        Connect a wallet to manage its recipient aliases.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_1.6fr_auto]">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
          }}
          placeholder="Name (e.g. mom)"
          className="glass-input rounded-2xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40"
        />
        <input
          value={address}
          onChange={(e) => {
            setAddress(e.target.value)
          }}
          placeholder="0x wallet address"
          className="glass-input rounded-2xl px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-foreground/40"
        />
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center justify-center gap-1 rounded-2xl bg-accent-gradient px-4 py-2.5 text-sm font-bold text-white shadow-glow-accent transition hover:opacity-95"
        >
          <UserRoundPlus className="h-4 w-4" /> Add
        </button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {entries.length === 0 ? (
        <p className="text-sm text-foreground/55">
          No aliases yet. Add one, then say e.g. &ldquo;send 5 cUSD to mom&rdquo;.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.name}
              className="flex items-center gap-3 rounded-2xl bg-foreground/[0.04] px-3.5 py-2.5 dark:bg-white/[0.04]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-gradient text-sm font-bold text-white">
                {entry.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{entry.name}</p>
                <p className="truncate font-mono text-[11px] text-foreground/55">
                  {formatAddress(entry.address)}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${entry.name}`}
                onClick={() => {
                  remove(entry.name)
                }}
                className="rounded-xl border border-destructive/50 p-2 text-destructive transition hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

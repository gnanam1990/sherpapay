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
      <p className="text-sm text-muted-foreground">
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
          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
        />
        <input
          value={address}
          onChange={(e) => {
            setAddress(e.target.value)
          }}
          placeholder="0x wallet address"
          className="rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground"
        />
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <UserRoundPlus className="h-4 w-4" /> Add
        </button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No aliases yet. Add one, then say e.g. &ldquo;send 5 cUSD to mom&rdquo;.
        </p>
      ) : (
        <ul className="divide-y divide-border/70 rounded-md border border-border/70">
          {entries.map((entry) => (
            <li key={entry.name} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{entry.name}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {formatAddress(entry.address)}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${entry.name}`}
                onClick={() => {
                  remove(entry.name)
                }}
                className="rounded-md border border-destructive/50 p-2 text-destructive transition-colors hover:bg-destructive/10"
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

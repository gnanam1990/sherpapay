'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, Wallet } from 'lucide-react'
import { celo, celoAlfajores } from 'wagmi/chains'
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { erc20Abi } from '@sherpapay/celo'
import {
  amountToWei,
  formatAddress,
  isValidAddress,
  type Intent,
  type SafetyContext,
  type SafetyResult,
} from '@sherpapay/core'
import { parse } from '@sherpapay/parser'
import { runSafetyChecks } from '@sherpapay/safety'
import { ChatInput } from '@/components/chat-input'
import { ConfirmationCard } from '@/components/confirmation-card'
import { TOKENS } from '@/lib/wagmi'

type Address = `0x${string}`

interface PreviewState {
  input: string
  intent: Intent
  safety: SafetyResult
}

const EXAMPLE_PROMPTS = [
  'send 0.01 cUSD to 0x99f37717f2EB28955CFB553f3B7Eb4eFaDf4dA8C',
  'send 0.01 cEUR to 0x99f37717f2EB28955CFB553f3B7Eb4eFaDf4dA8C',
  'send 1 USDT to 0x99f37717f2EB28955CFB553f3B7Eb4eFaDf4dA8C',
] as const

const MAX_SAFE_BALANCE = BigInt(2) ** BigInt(256) - BigInt(1)
const ZERO_AMOUNT = BigInt(0)

function isSupportedChain(chainId: number): chainId is keyof typeof TOKENS {
  return chainId === celo.id || chainId === celoAlfajores.id
}

function explorerTxUrl(chainId: number, hash: string): string {
  const baseUrl =
    chainId === celoAlfajores.id ? 'https://alfajores.celoscan.io' : 'https://celoscan.io'
  return `${baseUrl}/tx/${hash}`
}

function describeUnsupportedIntent(intent: Intent): string | null {
  if (intent.kind === 'schedule') {
    return 'Scheduled payments need the SherpaPayScheduler contract deployed on Celo mainnet before this can execute for real.'
  }
  if (intent.kind === 'save') {
    return 'Savings goals need the SherpaPayVault contract deployed on Celo mainnet before this can execute for real.'
  }
  if (intent.kind === 'cancel' || intent.kind === 'pause' || intent.kind === 'resume') {
    return 'Schedule management becomes available after the scheduler contract is deployed.'
  }
  if (intent.kind === 'status') {
    return 'Portfolio/history views need the production API and indexer deployment.'
  }
  if (intent.kind === 'unknown') {
    return 'I could not understand that yet. Try: send 0.01 cUSD to 0x...'
  }
  return null
}

export function HomeFlow() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()
  const { writeContractAsync, isPending: isWriting } = useWriteContract()
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submittedHash, setSubmittedHash] = useState<Address | undefined>()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: submittedHash,
    query: { enabled: Boolean(submittedHash) },
  })

  const statusMessage = useMemo(() => {
    if (!submittedHash) return null
    if (isConfirmed) return 'Transfer confirmed on Celo.'
    if (isConfirming) return 'Transfer submitted. Waiting for confirmation...'
    return 'Transfer submitted.'
  }, [isConfirmed, isConfirming, submittedHash])

  function buildSafetyContext(): SafetyContext {
    return {
      userAddress: address ?? '0x0000000000000000000000000000000000000000',
      userBalance: MAX_SAFE_BALANCE,
      dailySpent: ZERO_AMOUNT,
      monthlySpent: ZERO_AMOUNT,
      knownRecipients: [],
      averageAmount: ZERO_AMOUNT,
    }
  }

  function previewPrompt(input: string) {
    setError(null)
    setSubmittedHash(undefined)

    const intent = parse(input)
    const safety = runSafetyChecks(intent, buildSafetyContext())
    setPreview({ input, intent, safety })
  }

  async function confirmPreview() {
    if (!preview) return

    const { intent } = preview
    const unsupportedMessage = describeUnsupportedIntent(intent)
    if (unsupportedMessage) {
      setError(unsupportedMessage)
      return
    }

    if (intent.kind !== 'send') return

    if (!isConnected || !address) {
      setError('Connect MiniPay or another Celo wallet before sending.')
      return
    }

    if (!isValidAddress(intent.recipient)) {
      setError('Aliases are not connected yet. Use a full 0x recipient address for live transfers.')
      return
    }

    const targetChainId = isSupportedChain(chainId) ? chainId : celo.id
    if (!isSupportedChain(chainId)) {
      await switchChainAsync({ chainId: targetChainId })
    }

    const tokenAddress = TOKENS[targetChainId][intent.token]
    const amountWei = amountToWei(intent.amount, intent.token)
    if (amountWei <= ZERO_AMOUNT) {
      setError('Amount must be greater than zero.')
      return
    }

    const hash = await writeContractAsync({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [intent.recipient as Address, amountWei],
      chainId: targetChainId,
    })

    setSubmittedHash(hash)
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <section className="space-y-2 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-celo/30 bg-celo/10 px-3 py-1 text-xs font-medium text-celo">
          <Wallet className="h-3.5 w-3.5" />
          Live now: one-time MiniPay/Celo stablecoin sends
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Type once. <span className="text-celo">Send on Celo.</span>
        </h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          Type a payment in plain English, review the safety card, then sign the token transfer from
          your wallet.
        </p>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
        <ChatInput onSubmit={previewPrompt} isLoading={isWriting || isSwitching} />
        <div className="mt-4 flex flex-col gap-2">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                previewPrompt(prompt)
              }}
              className="rounded-lg border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:text-sm"
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      {preview && (
        <section className="space-y-3">
          <div className="rounded-lg border bg-background/60 p-3 text-sm text-muted-foreground">
            Parsed: <span className="text-foreground">{preview.input}</span>
          </div>
          <ConfirmationCard
            intent={preview.intent}
            safety={preview.safety}
            onConfirm={() => {
              void confirmPreview().catch((err: unknown) => {
                setError(err instanceof Error ? err.message : 'Transaction failed.')
              })
            }}
            onCancel={() => {
              setPreview(null)
              setError(null)
              setSubmittedHash(undefined)
            }}
          />
        </section>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {submittedHash && (
        <div className="rounded-lg border border-celo/40 bg-celo/10 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-celo">
            {isConfirming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {statusMessage}
          </div>
          <a
            href={explorerTxUrl(isSupportedChain(chainId) ? chainId : celo.id, submittedHash)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-foreground underline"
          >
            View {formatAddress(submittedHash)} on Celoscan
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="font-medium">MiniPay ready</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Works with injected MiniPay/Celo wallets.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="font-medium">Safety first</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Amount, token, recipient, and risk checks run before signing.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="font-medium">Next: scheduler</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Recurring sends unlock after mainnet contract deployment.
          </p>
        </div>
      </section>
    </div>
  )
}

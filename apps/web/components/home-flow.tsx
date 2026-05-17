'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Coins,
  ExternalLink,
  Loader2,
  Network,
  ShieldCheck,
  Wallet,
  Zap,
} from 'lucide-react'
import { celo, celoAlfajores } from 'wagmi/chains'
import {
  useAccount,
  useChainId,
  useConnect,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { parseEventLogs } from 'viem'
import { useMiniPay } from '@sherpapay/minipay'
import {
  erc20Abi,
  schedulerAbi,
  SCHEDULER_ADDRESS,
  DEFAULT_SCHEDULE_CYCLES,
  scheduleEndTime,
  scheduleEscrowTotal,
} from '@sherpapay/celo'
import { useCreateSchedule, useFundSchedule } from '@/lib/scheduler-hooks'
import {
  amountToWei,
  formatAddress,
  isValidAddress,
  weiToAmount,
  type Frequency,
  type Intent,
  type SafetyCheck,
  type SafetyContext,
  type SafetyResult,
} from '@sherpapay/core'
import { useIntl } from 'react-intl'
import { parse } from '@sherpapay/parser'
import { runSafetyChecks } from '@sherpapay/safety'
import { ChatInput } from '@/components/chat-input'
import { ConfirmationCard } from '@/components/confirmation-card'
import { useLocalCurrency } from '@/lib/use-fx'
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

const SUPPORTED_ASSETS = [
  { symbol: 'cUSD', name: 'Celo Dollar', tone: 'border-celo/30 bg-celo/10 text-celo' },
  { symbol: 'cEUR', name: 'Celo Euro', tone: 'border-primary/30 bg-primary/10 text-primary' },
  { symbol: 'USDT', name: 'Tether USD', tone: 'border-accent/40 bg-accent/10 text-accent' },
] as const

const MAX_SAFE_BALANCE = BigInt(2) ** BigInt(256) - BigInt(1)
const ZERO_AMOUNT = BigInt(0)

function isSupportedChain(chainId: number): chainId is keyof typeof TOKENS {
  return chainId === celo.id || chainId === celoAlfajores.id
}

function chainName(chainId: number): string {
  if (chainId === celo.id) return 'Celo'
  if (chainId === celoAlfajores.id) return 'Alfajores'
  return 'Switch needed'
}

function safetyLevelForChecks(checks: readonly SafetyCheck[]): SafetyResult['level'] {
  if (checks.some((check) => check.level === 'block')) return 'block'
  if (checks.some((check) => check.level === 'warn')) return 'warn'
  return 'safe'
}

function appendSafetyCheck(safety: SafetyResult, check: SafetyCheck): SafetyResult {
  const checks = [...safety.checks, check]
  const level = safetyLevelForChecks(checks)
  return {
    ...safety,
    checks,
    level,
    passed: level !== 'block',
  }
}

function explorerTxUrl(chainId: number, hash: string): string {
  const baseUrl =
    chainId === celoAlfajores.id ? 'https://alfajores.celoscan.io' : 'https://celoscan.io'
  return `${baseUrl}/tx/${hash}`
}

/** Seconds between executions for a parsed frequency. null = not recurring. */
function intervalSeconds(frequency: Frequency): bigint | null {
  switch (frequency.kind) {
    case 'daily':
      return BigInt(86_400)
    case 'weekly':
      return BigInt(604_800)
    case 'monthly':
      return BigInt(2_592_000) // 30 days
    case 'custom':
      return BigInt(frequency.intervalSeconds)
    case 'once':
    default:
      return null
  }
}

function describeUnsupportedIntent(intent: Intent): string | null {
  if (intent.kind === 'save') {
    return 'SherpaPayVault is live on Celo. Goal creation is waiting on the wallet transaction flow.'
  }
  if (intent.kind === 'cancel' || intent.kind === 'pause' || intent.kind === 'resume') {
    return 'Schedule management is waiting on the production scheduler API and indexer.'
  }
  if (intent.kind === 'status') {
    return 'Portfolio/history views need the production API and indexer deployment.'
  }
  if (intent.kind === 'unknown') {
    return 'Try a live transfer command such as: send 0.01 cUSD to 0x...'
  }
  return null
}

export function HomeFlow() {
  const intl = useIntl()
  const fx = useLocalCurrency()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { isMiniPay } = useMiniPay()
  const { connect, connectors } = useConnect()
  // RainbowKit's getDefaultConfig registers an injected/EIP-6963 connector;
  // inside the MiniPay app it binds to MiniPay's window.ethereum.
  const injectedConnector = connectors.find((connector) => connector.type === 'injected')

  useEffect(() => {
    if (isMiniPay && !isConnected && injectedConnector) {
      connect({ connector: injectedConnector })
    }
  }, [isMiniPay, isConnected, injectedConnector, connect])

  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()
  const { writeContractAsync, isPending: isWriting } = useWriteContract()
  const publicClient = usePublicClient()
  const createSchedule = useCreateSchedule()
  const fundSchedule = useFundSchedule()
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submittedHash, setSubmittedHash] = useState<Address | undefined>()
  const [scheduleStatus, setScheduleStatus] = useState<string | null>(null)
  const [scheduleResult, setScheduleResult] = useState<{
    onchainId: Address
    txHash: Address
  } | null>(null)
  const previewedSendIntent = preview?.intent.kind === 'send' ? preview.intent : null
  const targetChainId = isSupportedChain(chainId) ? chainId : celo.id
  const previewTokenAddress = previewedSendIntent
    ? (TOKENS[targetChainId][previewedSendIntent.token] as Address)
    : undefined
  const shouldReadTokenBalance = Boolean(
    isConnected && address && previewedSendIntent && previewTokenAddress,
  )

  const {
    data: tokenBalance,
    isLoading: isBalanceLoading,
    isFetching: isBalanceFetching,
  } = useReadContract({
    address: previewTokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: targetChainId,
    query: {
      enabled: shouldReadTokenBalance,
    },
  })

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: submittedHash,
    query: { enabled: Boolean(submittedHash) },
  })

  const statusMessage = useMemo(() => {
    if (!submittedHash) return null
    if (isConfirmed) return 'Transfer confirmed'
    if (isConfirming) return 'Waiting for confirmation'
    return 'Transfer submitted'
  }, [isConfirmed, isConfirming, submittedHash])

  function buildSafetyContext(userBalance: bigint = MAX_SAFE_BALANCE): SafetyContext {
    return {
      userAddress: address ?? '0x0000000000000000000000000000000000000000',
      userBalance,
      dailySpent: ZERO_AMOUNT,
      monthlySpent: ZERO_AMOUNT,
      knownRecipients: [],
      averageAmount: ZERO_AMOUNT,
    }
  }

  const currentSafety = useMemo(() => {
    if (!preview) return null

    let safety = runSafetyChecks(
      preview.intent,
      buildSafetyContext(tokenBalance ?? MAX_SAFE_BALANCE),
    )

    if (
      preview.intent.kind === 'send' &&
      shouldReadTokenBalance &&
      tokenBalance === undefined &&
      (isBalanceLoading || isBalanceFetching)
    ) {
      safety = appendSafetyCheck(safety, {
        name: 'balance-check',
        level: 'block',
        message: 'Checking connected wallet balance before signing.',
      })
    }

    return safety
  }, [isBalanceFetching, isBalanceLoading, preview, shouldReadTokenBalance, tokenBalance])

  function previewPrompt(input: string) {
    setError(null)
    setSubmittedHash(undefined)
    setScheduleStatus(null)
    setScheduleResult(null)

    const intent = parse(input)
    if (intent.kind === 'unknown') {
      setPreview(null)
      setError(describeUnsupportedIntent(intent))
      return
    }

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

    const safety = currentSafety ?? preview.safety
    const blockingCheck = safety.checks.find((check) => check.level === 'block')
    if (blockingCheck) {
      setError(blockingCheck.message)
      return
    }

    if (intent.kind === 'schedule') {
      await confirmSchedule(intent)
      return
    }

    if (intent.kind !== 'send') return

    if (!isConnected || !address) {
      setError(intl.formatMessage({ id: 'error.connect' }))
      return
    }

    if (!isValidAddress(intent.recipient)) {
      setError('Aliases are not connected yet. Use a full 0x recipient address for live transfers.')
      return
    }

    if (!isSupportedChain(chainId)) {
      await switchChainAsync({ chainId: targetChainId })
    }

    const tokenAddress = TOKENS[targetChainId][intent.token]
    const amountWei = amountToWei(intent.amount, intent.token)
    if (amountWei <= ZERO_AMOUNT) {
      setError(intl.formatMessage({ id: 'error.amountZero' }))
      return
    }
    if (tokenBalance === undefined) {
      setError('Could not read your token balance yet. Try again in a moment.')
      return
    }
    if (amountWei > tokenBalance) {
      setError(
        `Insufficient ${intent.token} balance. You have ${weiToAmount(tokenBalance, intent.token)} ${intent.token}, but this transfer needs ${intent.amount} ${intent.token}.`,
      )
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

  // MVP: every schedule is created for DEFAULT_SCHEDULE_CYCLES (12)
  // executions. The contract has no maxExecutions; the cap is enforced
  // via endTime + prefunded escrow. Make the cycle count user-selectable
  // in a later iteration by threading it through these helpers.
  async function confirmSchedule(intent: Extract<Intent, { kind: 'schedule' }>) {
    if (!isConnected || !address) {
      setError(intl.formatMessage({ id: 'error.connectSchedule' }))
      return
    }
    if (!isValidAddress(intent.recipient)) {
      setError('Aliases are not connected yet. Use a full 0x recipient address.')
      return
    }
    const interval = intervalSeconds(intent.frequency)
    if (interval === null) {
      setError(intl.formatMessage({ id: 'error.onceNotSchedule' }))
      return
    }
    if (!publicClient) {
      setError('No Celo RPC client available. Reconnect and try again.')
      return
    }
    if (!isSupportedChain(chainId)) {
      await switchChainAsync({ chainId: targetChainId })
    }

    const tokenAddress = TOKENS[targetChainId][intent.token] as Address
    const amountWei = amountToWei(intent.amount, intent.token)
    if (amountWei <= ZERO_AMOUNT) {
      setError(intl.formatMessage({ id: 'error.amountZero' }))
      return
    }

    const cycles = DEFAULT_SCHEDULE_CYCLES
    const startTime = BigInt(Math.floor(Date.now() / 1000))
    const endTime = scheduleEndTime(startTime, interval, cycles)
    const escrowTotal = scheduleEscrowTotal(amountWei, cycles)

    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address],
    })
    if (balance < escrowTotal) {
      setError(
        `Funding ${cycles} cycles needs ${weiToAmount(escrowTotal, intent.token)} ${intent.token}, but you have ${weiToAmount(balance, intent.token)} ${intent.token}.`,
      )
      return
    }

    try {
      setError(null)
      setScheduleResult(null)

      setScheduleStatus(`Approving ${weiToAmount(escrowTotal, intent.token)} ${intent.token}…`)
      const approveHash = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [SCHEDULER_ADDRESS, escrowTotal],
        chainId: targetChainId,
      })
      await publicClient.waitForTransactionReceipt({ hash: approveHash })

      setScheduleStatus('Creating schedule on Celo…')
      const createHash = await createSchedule({
        recipient: intent.recipient as Address,
        token: tokenAddress,
        amount: amountWei,
        startTime,
        interval,
        endTime,
        maxFailures: 3,
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: createHash })

      const events = parseEventLogs({
        abi: schedulerAbi,
        eventName: 'ScheduleCreated',
        logs: receipt.logs,
      })
      const created = events[0]
      if (!created) {
        throw new Error('Schedule transaction mined but ScheduleCreated was not emitted.')
      }
      const onchainId = created.args.id

      if (cycles > 1) {
        setScheduleStatus(`Funding remaining ${cycles - 1} cycles…`)
        const fundHash = await fundSchedule(onchainId, amountWei * BigInt(cycles - 1))
        await publicClient.waitForTransactionReceipt({ hash: fundHash })
      }

      setScheduleStatus(null)
      setScheduleResult({ onchainId, txHash: createHash })
    } catch (err: unknown) {
      setScheduleStatus(null)
      setError(err instanceof Error ? err.message : 'Schedule creation failed.')
    }
  }

  const previewScheduleIntent = preview?.intent.kind === 'schedule' ? preview.intent : null
  const scheduleInterval = previewScheduleIntent
    ? intervalSeconds(previewScheduleIntent.frequency)
    : null
  const scheduleSummary =
    previewScheduleIntent && scheduleInterval !== null
      ? (() => {
          const escrowAmount = weiToAmount(
            scheduleEscrowTotal(
              amountToWei(previewScheduleIntent.amount, previewScheduleIntent.token),
              DEFAULT_SCHEDULE_CYCLES,
            ),
            previewScheduleIntent.token,
          )
          return {
            cycles: DEFAULT_SCHEDULE_CYCLES,
            totalLocked: `${escrowAmount} ${previewScheduleIntent.token}`,
            totalLockedLocal: fx.format(Number(escrowAmount)),
            endsAt: new Date(
              Number(
                scheduleEndTime(
                  BigInt(Math.floor(Date.now() / 1000)),
                  scheduleInterval,
                  DEFAULT_SCHEDULE_CYCLES,
                ),
              ) * 1000,
            ).toLocaleDateString(),
          }
        })()
      : undefined

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-celo/30 bg-celo/10 px-3 py-1 text-xs font-medium text-celo">
            <Zap className="h-3.5 w-3.5" />
            Live transfers
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Wallet className="h-3.5 w-3.5" />
            MiniPay ready
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <Clock3 className="h-3.5 w-3.5" />
            Contracts live
          </span>
          {isMiniPay && (
            <span className="inline-flex items-center gap-2 rounded-full border border-celo/40 bg-celo/10 px-3 py-1 text-xs font-medium text-celo">
              <Zap className="h-3.5 w-3.5" />
              Connected via MiniPay
            </span>
          )}
        </div>

        <div className="space-y-3">
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] text-foreground sm:text-5xl">
            {intl.formatMessage({ id: 'hero.title' })}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            {intl.formatMessage({ id: 'hero.subtitle' })}
          </p>
        </div>

        <section className="rounded-lg border border-border/70 bg-card/90 p-4 shadow-soft-panel sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {intl.formatMessage({ id: 'command.label' })}
              </p>
              <p className="mt-1 text-sm text-foreground">
                {intl.formatMessage({ id: 'command.sublabel' })}
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-md border border-border/70 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
              <Network className="h-3.5 w-3.5 text-celo" />
              {chainName(chainId)}
            </div>
          </div>

          <ChatInput onSubmit={previewPrompt} isLoading={isWriting || isSwitching} />

          <div className="mt-4 grid gap-2">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  previewPrompt(prompt)
                }}
                className="group flex w-full min-w-0 items-center justify-between gap-3 overflow-hidden rounded-md border border-border/70 bg-background/40 px-3 py-3 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-foreground sm:text-sm"
              >
                <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                  {prompt}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </button>
            ))}
          </div>
        </section>

        {preview && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card/70 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Parsed command
                </p>
                <p className="mt-1 truncate font-mono text-sm text-foreground">{preview.input}</p>
              </div>
              <BadgeCheck className="h-5 w-5 shrink-0 text-celo" />
            </div>
            <ConfirmationCard
              intent={preview.intent}
              safety={currentSafety ?? preview.safety}
              scheduleSummary={scheduleSummary}
              onConfirm={() => {
                void confirmPreview().catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : 'Transaction failed.')
                })
              }}
              onCancel={() => {
                setPreview(null)
                setError(null)
                setSubmittedHash(undefined)
                setScheduleStatus(null)
                setScheduleResult(null)
              }}
            />
          </section>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {submittedHash && (
          <div className="rounded-lg border border-celo/50 bg-celo/10 p-4 text-sm">
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

        {scheduleStatus && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm font-medium text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            {scheduleStatus}
          </div>
        )}

        {scheduleResult && (
          <div className="rounded-lg border border-celo/50 bg-celo/10 p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-celo">
              <CheckCircle2 className="h-4 w-4" />
              Schedule created on Celo
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              On-chain id{' '}
              <span className="font-mono text-foreground">
                {formatAddress(scheduleResult.onchainId)}
              </span>
            </p>
            <div className="mt-2 flex flex-wrap gap-4">
              <a
                href={explorerTxUrl(
                  isSupportedChain(chainId) ? chainId : celo.id,
                  scheduleResult.txHash,
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-foreground underline"
              >
                View {formatAddress(scheduleResult.txHash)} on Celoscan
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="/schedules"
                className="inline-flex items-center gap-1 text-xs text-foreground underline"
              >
                View schedules
                <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <section className="rounded-lg border border-border/70 bg-card/80 p-4 shadow-soft-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Wallet</p>
              <p className="mt-1 font-mono text-sm text-foreground">
                {isConnected && address ? formatAddress(address) : 'Not connected'}
              </p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border/70 bg-card/80 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Coins className="h-4 w-4 text-celo" />
            <p className="text-sm font-medium">Assets</p>
          </div>
          <div className="space-y-2">
            {SUPPORTED_ASSETS.map((asset) => (
              <div
                key={asset.symbol}
                className="flex items-center justify-between rounded-md border border-border/70 bg-background/40 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{asset.symbol}</p>
                  <p className="text-xs text-muted-foreground">{asset.name}</p>
                </div>
                <span className={`rounded-full border px-2 py-1 text-xs ${asset.tone}`}>live</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border/70 bg-card/80 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Execution</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-celo" />
              <p className="text-muted-foreground">Parser and safety checks run before signing.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <p className="text-muted-foreground">Transfers are signed by the connected wallet.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
              <p className="text-muted-foreground">
                Scheduler and vault contracts are live; API and worker wiring comes next.
              </p>
            </div>
          </div>
        </section>
      </aside>
    </div>
  )
}

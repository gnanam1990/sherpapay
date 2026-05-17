'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArrowRight, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'
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
  vaultAbi,
  VAULT_ADDRESS,
  frequencyToSeconds,
  goalTargetDate,
} from '@sherpapay/celo'
import { useCreateSchedule, useFundSchedule } from '@/lib/scheduler-hooks'
import { useCreateGoal, useGoalContribution } from '@/lib/vault-hooks'
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
import { parse, validateGoalIntent, type GoalValidation } from '@sherpapay/parser'
import { runSafetyChecks } from '@sherpapay/safety'
import { ChatInput } from '@/components/chat-input'
import { ConfirmationCard } from '@/components/confirmation-card'
import { GoalConfirmationCard, type GoalSummary } from '@/components/goal-confirmation-card'
import { useLocalCurrency } from '@/lib/use-fx'
import { useAliases } from '@/lib/use-aliases'
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
  const aliases = useAliases()
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
  const createGoal = useCreateGoal()
  const contributeToGoal = useGoalContribution()
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submittedHash, setSubmittedHash] = useState<Address | undefined>()
  const [scheduleStatus, setScheduleStatus] = useState<string | null>(null)
  const [scheduleResult, setScheduleResult] = useState<{
    onchainId: Address
    txHash: Address
  } | null>(null)
  const [goalStatus, setGoalStatus] = useState<string | null>(null)
  const [goalResult, setGoalResult] = useState<{
    goalId: Address
    txHash: Address
    funded: boolean
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

  // A 0x address passes through; otherwise try the connected wallet's
  // saved aliases ("mom" → 0x…). null = unresolvable.
  function resolveRecipient(raw: string): Address | null {
    if (isValidAddress(raw)) return raw as Address
    const resolved = aliases.resolve(raw)
    return resolved && isValidAddress(resolved) ? (resolved as Address) : null
  }

  function resetPreview() {
    setPreview(null)
    setError(null)
    setSubmittedHash(undefined)
    setScheduleStatus(null)
    setScheduleResult(null)
    setGoalStatus(null)
    setGoalResult(null)
  }

  function previewPrompt(input: string) {
    setError(null)
    setSubmittedHash(undefined)
    setScheduleStatus(null)
    setScheduleResult(null)
    setGoalStatus(null)
    setGoalResult(null)

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

    if (intent.kind === 'save') {
      await confirmGoal(intent)
      return
    }

    if (intent.kind !== 'send') return

    if (!isConnected || !address) {
      setError(intl.formatMessage({ id: 'error.connect' }))
      return
    }

    const recipient = resolveRecipient(intent.recipient)
    if (!recipient) {
      setError(
        `No saved alias "${intent.recipient}". Add it in Settings, or use a full 0x address.`,
      )
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
      args: [recipient, amountWei],
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
    const recipient = resolveRecipient(intent.recipient)
    if (!recipient) {
      setError(
        `No saved alias "${intent.recipient}". Add it in Settings, or use a full 0x address.`,
      )
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
        recipient,
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

  // Goal flow: createGoal moves no tokens (only stores the Goal struct), so
  // no approval is needed to create. Approval + contribute are only for the
  // optional first contribution. The vault treats targetDate/monthly as
  // advisory metadata — achievement is purely funding-based.
  async function confirmGoal(intent: Extract<Intent, { kind: 'save' }>) {
    if (!isConnected || !address) {
      setError(intl.formatMessage({ id: 'error.connect' }))
      return
    }

    const validation = validateGoalIntent(intent)
    if (!validation.ok) {
      setError(validation.errors.join(' '))
      return
    }

    const interval = frequencyToSeconds(intent.frequency)
    if (interval === null) {
      setError('Choose a recurring frequency (daily, weekly, or monthly) for a savings goal.')
      return
    }
    const targetStr = intent.goal.target
    if (!targetStr) {
      setError('Set a target amount, e.g. "target 100".')
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
    const contributionWei = amountToWei(intent.amount, intent.token)
    const targetWei = amountToWei(targetStr, intent.token)
    const cycles =
      intent.goal.durationCycles ?? Math.ceil(Number(targetStr) / Number(intent.amount))
    const startTime = BigInt(Math.floor(Date.now() / 1000))
    const targetDate = goalTargetDate(startTime, interval, cycles)

    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address],
    })

    try {
      setError(null)
      setGoalResult(null)

      setGoalStatus('Creating goal on Celo…')
      const createHash = await createGoal({
        token: tokenAddress,
        target: targetWei,
        monthly: contributionWei,
        targetDate,
        label: intent.goal.label,
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: createHash })

      const events = parseEventLogs({
        abi: vaultAbi,
        eventName: 'GoalCreated',
        logs: receipt.logs,
      })
      const created = events[0]
      if (!created) {
        throw new Error('Goal transaction mined but GoalCreated was not emitted.')
      }
      const goalId = created.args.id

      // Seed the first contribution only if the wallet can cover it.
      let funded = false
      if (contributionWei > ZERO_AMOUNT && balance >= contributionWei) {
        setGoalStatus(
          `Approving first contribution (${weiToAmount(contributionWei, intent.token)} ${intent.token})…`,
        )
        const approveHash = await writeContractAsync({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [VAULT_ADDRESS, contributionWei],
          chainId: targetChainId,
        })
        await publicClient.waitForTransactionReceipt({ hash: approveHash })

        setGoalStatus('Funding first contribution…')
        const contributeHash = await contributeToGoal(goalId, contributionWei)
        await publicClient.waitForTransactionReceipt({ hash: contributeHash })
        funded = true
      }

      setGoalStatus(null)
      setGoalResult({ goalId, txHash: createHash, funded })
    } catch (err: unknown) {
      setGoalStatus(null)
      setError(err instanceof Error ? err.message : 'Goal creation failed.')
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

  const previewGoalIntent = preview?.intent.kind === 'save' ? preview.intent : null
  const goalValidation: GoalValidation | null = previewGoalIntent
    ? validateGoalIntent(previewGoalIntent)
    : null
  const goalSummary: GoalSummary | undefined =
    previewGoalIntent?.goal.target && previewGoalIntent.goal.durationCycles
      ? (() => {
          const interval = frequencyToSeconds(previewGoalIntent.frequency)
          const cycles = previewGoalIntent.goal.durationCycles
          const target = previewGoalIntent.goal.target
          const byDate =
            interval === null
              ? '—'
              : new Date(
                  Number(goalTargetDate(BigInt(Math.floor(Date.now() / 1000)), interval, cycles)) *
                    1000,
                ).toLocaleDateString()
          return {
            cycles,
            target: `${target} ${previewGoalIntent.token}`,
            targetLocal: fx.format(Number(target)),
            byDate,
          }
        })()
      : undefined

  const previewRecipient =
    preview?.intent.kind === 'send' || preview?.intent.kind === 'schedule'
      ? preview.intent.recipient
      : null
  const previewResolvedRecipient =
    previewRecipient && !isValidAddress(previewRecipient)
      ? (resolveRecipient(previewRecipient) ?? undefined)
      : undefined

  return (
    <div className="mx-auto w-full max-w-2xl">
      <section className="animate-fade-in px-4 pb-2 pt-8 text-center">
        <div className="celo-tag meta-label mb-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 font-semibold normal-case tracking-widest">
          <span className="h-1.5 w-1.5 rounded-full bg-celo-green shadow-glow-celo" />
          LIVE ON CELO MAINNET
        </div>
        <h1 className="mb-4 text-4xl font-extrabold leading-[1.0] tracking-tight sm:text-5xl">
          <span className="gradient-text">{intl.formatMessage({ id: 'hero.title' })}</span>
        </h1>
        <p className="mx-auto max-w-md text-base font-medium text-foreground/65">
          {intl.formatMessage({ id: 'hero.subtitle' })}
        </p>
      </section>

      <section className="glass-card animate-fade-in mx-auto mt-6 w-full max-w-lg rounded-3xl p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="meta-label text-foreground/55">
              {intl.formatMessage({ id: 'command.label' })}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {intl.formatMessage({ id: 'command.sublabel' })}
            </p>
          </div>
          <span className="rounded-full bg-foreground/[0.06] px-3 py-1.5 font-mono text-[11px] text-foreground/70 dark:bg-white/[0.06]">
            {chainName(chainId)}
          </span>
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
              className="glass-input group flex w-full min-w-0 items-center justify-between gap-3 overflow-hidden rounded-2xl px-3.5 py-3 text-left font-mono text-xs text-foreground/70 transition hover:text-foreground"
            >
              <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                {prompt}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      </section>

      <div className="mx-auto mt-6 flex max-w-lg flex-wrap justify-center gap-2">
        {['Contracts verified', 'MiniPay native', '201 tests passing'].map((label) => (
          <div
            key={label}
            className="flex items-center gap-1.5 rounded-2xl border border-white/80 bg-white/50 px-3 py-1.5 font-mono text-[11px] font-semibold text-foreground/65 dark:border-white/[0.08] dark:bg-white/[0.05]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-celo-green shadow-glow-celo" />
            {label}
          </div>
        ))}
      </div>

      {preview && (
        <section className="animate-fade-in mx-auto mt-6 w-full max-w-lg space-y-3">
          <div className="glass-card flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
            <div className="min-w-0">
              <p className="meta-label text-foreground/55">Parsed command</p>
              <p className="mt-1 truncate font-mono text-sm text-foreground">{preview.input}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 shrink-0 text-celo-green" />
          </div>
          {previewGoalIntent && goalValidation ? (
            <GoalConfirmationCard
              intent={previewGoalIntent}
              safety={currentSafety ?? preview.safety}
              validation={goalValidation}
              summary={goalSummary}
              onConfirm={() => {
                void confirmPreview().catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : 'Goal creation failed.')
                })
              }}
              onCancel={resetPreview}
            />
          ) : (
            <ConfirmationCard
              intent={preview.intent}
              safety={currentSafety ?? preview.safety}
              scheduleSummary={scheduleSummary}
              resolvedRecipient={previewResolvedRecipient}
              onConfirm={() => {
                void confirmPreview().catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : 'Transaction failed.')
                })
              }}
              onCancel={resetPreview}
            />
          )}
        </section>
      )}

      {error && (
        <div className="error-card animate-fade-in mx-auto mt-6 flex max-w-lg items-start gap-3 rounded-2xl p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {submittedHash && (
        <div className="glass-card mx-auto mt-6 max-w-lg rounded-2xl p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold text-celo-green">
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
        <div className="glass-card mx-auto mt-6 flex max-w-lg items-center gap-2 rounded-2xl p-4 text-sm font-semibold text-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {scheduleStatus}
        </div>
      )}

      {scheduleResult && (
        <div className="glass-card mx-auto mt-6 max-w-lg rounded-2xl p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold text-celo-green">
            <CheckCircle2 className="h-4 w-4" />
            Schedule created on Celo
          </div>
          <p className="mt-2 text-xs text-foreground/60">
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

      {goalStatus && (
        <div className="glass-card mx-auto mt-6 flex max-w-lg items-center gap-2 rounded-2xl p-4 text-sm font-semibold text-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {goalStatus}
        </div>
      )}

      {goalResult && (
        <div className="glass-card mx-auto mt-6 max-w-lg rounded-2xl p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold text-celo-green">
            <CheckCircle2 className="h-4 w-4" />
            Goal created on Celo
          </div>
          <p className="mt-2 text-xs text-foreground/60">
            Goal id{' '}
            <span className="font-mono text-foreground">{formatAddress(goalResult.goalId)}</span>
            {goalResult.funded
              ? ' · first contribution funded'
              : ' · not yet funded — contribute from the Goals page'}
          </p>
          <div className="mt-2 flex flex-wrap gap-4">
            <a
              href={explorerTxUrl(isSupportedChain(chainId) ? chainId : celo.id, goalResult.txHash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-foreground underline"
            >
              View {formatAddress(goalResult.txHash)} on Celoscan
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="/goals"
              className="inline-flex items-center gap-1 text-xs text-foreground underline"
            >
              View goals
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

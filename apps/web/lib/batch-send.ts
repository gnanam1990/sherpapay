/**
 * Sequential client-side batch send. SherpaPayScheduler has no atomic
 * multi-recipient function (executeBatch is multi-*schedule*) and the
 * contract is immutable, so a "batch" is N independent erc20 transfers
 * run one after another. A failing transfer never blocks the rest.
 *
 * Pure orchestration — the actual submit/confirm are injected, so this
 * is unit-tested without wagmi.
 */

export type BatchItemStatus = 'pending' | 'submitted' | 'confirmed' | 'failed'

export interface BatchItem {
  recipient: string
  status: BatchItemStatus
  hash?: string
  error?: string
}

export interface BatchSummary {
  items: BatchItem[]
  succeeded: number
  failed: number
}

export interface BatchSendOps {
  /** Submit one transfer; resolves with the tx hash. */
  submit: (recipient: string, index: number) => Promise<string>
  /** Wait for the tx; resolve on success, reject on revert/timeout. */
  confirm: (hash: string, index: number) => Promise<void>
  /** Called after every status transition with a fresh snapshot. */
  onUpdate?: (items: BatchItem[]) => void
}

function message(e: unknown): string {
  if (e instanceof Error && e.message) return e.message
  const s = typeof e === 'string' ? e : String(e)
  return s.length > 0 ? s : 'Transfer failed'
}

export async function executeBatch(
  recipients: readonly string[],
  ops: BatchSendOps,
): Promise<BatchSummary> {
  const items: BatchItem[] = recipients.map((recipient) => ({ recipient, status: 'pending' }))
  const emit = (): void => ops.onUpdate?.(items.map((i) => ({ ...i })))

  let idx = 0
  for (const recipient of recipients) {
    const item = items[idx]
    idx += 1
    if (!item) continue
    try {
      const hash = await ops.submit(recipient, idx - 1)
      item.status = 'submitted'
      item.hash = hash
      emit()
      await ops.confirm(hash, idx - 1)
      item.status = 'confirmed'
      emit()
    } catch (e) {
      item.status = 'failed'
      item.error = message(e)
      emit()
    }
  }

  const succeeded = items.filter((i) => i.status === 'confirmed').length
  const failed = items.filter((i) => i.status === 'failed').length
  return { items, succeeded, failed }
}

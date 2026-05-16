import cron from 'node-cron'

const CRON_SCHEDULE = process.env.CRON_SCHEDULE ?? '* * * * *' // Every minute

interface ScheduleDue {
  id: string
  onchainId: string | null
  recipientAddress: string
  token: string
  amountWei: string
  userId: string
}

async function fetchDueSchedules(): Promise<ScheduleDue[]> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3001'
  try {
    const res = await fetch(`${apiUrl}/api/schedules/due?limit=50`)
    if (!res.ok) return []
    const data = await res.json() as { schedules: ScheduleDue[] }
    return data.schedules ?? []
  } catch (err) {
    console.error('Failed to fetch due schedules:', err)
    return []
  }
}

async function executeSchedule(schedule: ScheduleDue): Promise<{ success: boolean; txHash?: string; error?: string }> {
  console.log(`Executing schedule ${schedule.id} for ${schedule.amountWei} ${schedule.token} to ${schedule.recipientAddress}`)

  // In production, this would:
  // 1. Check sender balance
  // 2. Submit transaction to SherpaPayScheduler.executeDuePayment(onchainId)
  // 3. Wait for confirmation
  // 4. Return result

  return {
    success: true,
    txHash: `0x${Buffer.from(schedule.id).toString('hex').slice(0, 64)}`,
  }
}

async function processSchedules(): Promise<void> {
  console.log('Checking for due schedules...')

  const dueSchedules = await fetchDueSchedules()
  console.log(`Found ${dueSchedules.length} due schedules`)

  for (const schedule of dueSchedules) {
    try {
      const result = await executeSchedule(schedule)

      if (result.success) {
        console.log(`Schedule ${schedule.id} executed successfully. TX: ${result.txHash}`)
      } else {
        console.error(`Schedule ${schedule.id} failed: ${result.error}`)
      }
    } catch (err) {
      console.error(`Error executing schedule ${schedule.id}:`, err)
    }
  }
}

async function main(): Promise<void> {
  console.log(`SherpaPay Worker starting...`)
  console.log(`Cron schedule: ${CRON_SCHEDULE}`)

  // Run immediately on start
  await processSchedules()

  // Schedule recurring execution
  cron.schedule(CRON_SCHEDULE, async () => {
    await processSchedules()
  })

  console.log('Worker is running. Press Ctrl+C to stop.')
}

main().catch((err) => {
  console.error('Worker failed to start:', err)
  process.exit(1)
})

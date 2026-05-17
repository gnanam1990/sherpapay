-- 0007_schedule_onchain.sql
-- On-chain linkage for schedules created via SherpaPayScheduler.
-- onchain_id (bytes32 schedule id) already exists from 0003.

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS onchain_tx_hash VARCHAR(66),
  ADD COLUMN IF NOT EXISTS onchain_status VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_schedules_onchain_id ON schedules(onchain_id);

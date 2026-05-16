-- 0004_executions.sql
CREATE TABLE IF NOT EXISTS executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  tx_hash VARCHAR(66),
  amount_wei VARCHAR(78) NOT NULL,
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  gas_used VARCHAR(78),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_executions_schedule_id ON executions(schedule_id);
CREATE INDEX idx_executions_executed_at ON executions(executed_at);

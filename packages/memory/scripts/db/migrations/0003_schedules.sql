-- 0003_schedules.sql
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onchain_id VARCHAR(66),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_address VARCHAR(42) NOT NULL,
  token VARCHAR(10) NOT NULL,
  amount_wei VARCHAR(78) NOT NULL,
  frequency_kind VARCHAR(20) NOT NULL,
  frequency_value INTEGER,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  max_failures INTEGER DEFAULT 3,
  current_failures INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  alias VARCHAR(100),
  last_execution TIMESTAMP WITH TIME ZONE,
  next_execution TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_schedules_user_id ON schedules(user_id);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_schedules_next_execution ON schedules(next_execution);

-- 0005_goals.sql
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onchain_id VARCHAR(66),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(10) NOT NULL,
  target_amount_wei VARCHAR(78) NOT NULL,
  current_amount_wei VARCHAR(78) DEFAULT '0',
  monthly_contribution_wei VARCHAR(78),
  label VARCHAR(200) NOT NULL,
  target_date TIMESTAMP WITH TIME ZONE,
  achieved BOOLEAN DEFAULT FALSE,
  emergency_withdrawn BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_goals_user_id ON goals(user_id);

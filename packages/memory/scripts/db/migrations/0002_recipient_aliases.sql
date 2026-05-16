-- 0002_recipient_aliases.sql
CREATE TABLE IF NOT EXISTS recipient_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alias VARCHAR(100) NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, alias)
);

CREATE INDEX idx_recipient_aliases_user_id ON recipient_aliases(user_id);

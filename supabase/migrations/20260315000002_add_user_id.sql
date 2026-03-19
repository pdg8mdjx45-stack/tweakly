-- Add user_id column to verification_codes
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS user_id UUID;

-- Drop and recreate with user_id
DROP TABLE IF EXISTS verification_codes CASCADE;

CREATE TABLE verification_codes (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('verify', 'reset')),
  user_id UUID,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_codes_email ON verification_codes (email);
CREATE INDEX idx_verification_codes_code ON verification_codes (code);

ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS verification_codes_all ON verification_codes;
CREATE POLICY verification_codes_all ON verification_codes FOR ALL USING (true);

-- Pending registrations table
CREATE TABLE IF NOT EXISTS pending_registrations (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pending_registrations_email ON pending_registrations (email);

ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pending_registrations_all ON pending_registrations;
CREATE POLICY pending_registrations_all ON pending_registrations FOR ALL USING (true);

-- ============================================================================
-- Push tokens & seen articles — voor server-side notificaties
-- ============================================================================

-- Sla Expo Push Tokens op per gebruiker (meerdere apparaten per user)
CREATE TABLE IF NOT EXISTS push_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    TEXT CHECK (platform IN ('ios', 'android', 'web')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens (token);

CREATE TRIGGER push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Gebruiker mag eigen tokens lezen/schrijven/verwijderen
CREATE POLICY "push_tokens_select_own" ON push_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "push_tokens_insert_own" ON push_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_tokens_update_own" ON push_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "push_tokens_delete_own" ON push_tokens FOR DELETE USING (auth.uid() = user_id);

-- Service role leest alle tokens (voor Edge Function)
CREATE POLICY "push_tokens_service_read" ON push_tokens FOR SELECT
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Bijhouden welke artikelen al verstuurd zijn (voorkomt spam)
-- Beheerd door de Edge Function, niet door de app.
-- ============================================================================
CREATE TABLE IF NOT EXISTS seen_articles (
  id          SERIAL PRIMARY KEY,
  article_id  TEXT NOT NULL UNIQUE,   -- RSS item GUID / gegenereerd ID
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,          -- 'nieuws' | 'reviews'
  notified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seen_articles_id ON seen_articles (article_id);
CREATE INDEX IF NOT EXISTS idx_seen_articles_notified ON seen_articles (notified_at);

ALTER TABLE seen_articles ENABLE ROW LEVEL SECURITY;

-- Alleen service role schrijft/leest (app heeft geen directe toegang nodig)
CREATE POLICY "seen_articles_service_all" ON seen_articles FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

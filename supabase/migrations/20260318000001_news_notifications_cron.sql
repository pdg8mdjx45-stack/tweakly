-- ============================================================================
-- Cron job: roep de Edge Function elke 15 minuten aan
-- Vereist de pg_cron extensie (ingeschakeld via Supabase Dashboard →
-- Database → Extensions → zoek "pg_cron" en zet aan)
-- ============================================================================

-- Schakel pg_cron in (veilig om twee keer te draaien)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Verwijder eventuele oude versie
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-news-notifications') THEN
    PERFORM cron.unschedule('send-news-notifications');
  END IF;
END $$;

-- Plan: elke 15 minuten
-- Vereist ook de pg_net extensie (ingeschakeld via Dashboard → Database → Extensions → pg_net)
-- Vervang <service_role_key> met jouw echte service role key (Dashboard → Settings → API)
SELECT cron.schedule(
  'send-news-notifications',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url    := 'https://glnpdfbnyijdzvulzbfv.supabase.co/functions/v1/send-news-notifications',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsbnBkZmJueWlqZHp2dWx6YmZ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5NTgzNSwiZXhwIjoyMDg3ODcxODM1fQ.vB0KOpXm4KxgrLVF9eqzwvFxDkqZS62-HC8gbUXwwmo'
    ),
    body   := '{}'::jsonb
  );
  $$
);

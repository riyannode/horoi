-- The backend uses its server-side database role. Keep PostgREST roles out.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'runs' AND policyname = 'deny_public_runs') THEN
    CREATE POLICY deny_public_runs ON runs FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'publications' AND policyname = 'deny_public_publications') THEN
    CREATE POLICY deny_public_publications ON publications FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'publication_simulations' AND policyname = 'deny_public_publication_simulations') THEN
    CREATE POLICY deny_public_publication_simulations ON publication_simulations FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;

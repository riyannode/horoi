-- The server-side runtime role may manage persisted Horoi records.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'runs' AND policyname = 'runtime_full_access_runs') THEN
    CREATE POLICY runtime_full_access_runs ON runs FOR ALL TO horoi_runtime USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'publications' AND policyname = 'runtime_full_access_publications') THEN
    CREATE POLICY runtime_full_access_publications ON publications FOR ALL TO horoi_runtime USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'publication_simulations' AND policyname = 'runtime_full_access_publication_simulations') THEN
    CREATE POLICY runtime_full_access_publication_simulations ON publication_simulations FOR ALL TO horoi_runtime USING (true) WITH CHECK (true);
  END IF;
END $$;

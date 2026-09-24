-- Keep the runtime tables inaccessible through Supabase's public API.
-- Horoi connects with its server-side database role, which is separate from
-- anon/authenticated PostgREST clients.
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_simulations ENABLE ROW LEVEL SECURITY;

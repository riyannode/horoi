# Vercel deployment

The `horoi` Vercel project uses two Services from this repository:

- `frontend`: the Vite static build from `frontend/`.
- `backend`: the Bun/Elysia container from `backend/Dockerfile.vercel`.

The root routing sends `/api/*` to `backend` and every other path to
`frontend`. The frontend keeps `VITE_API_BASE=/api`, so browser requests stay
on the same origin.

## Server environment

Configure these as server-side variables for both Preview and Production. Do
not add them as `VITE_*` variables:

- `DATABASE_URL` — the Supabase or Neon Postgres connection string.
- `BINANCE_API_KEY` and `BINANCE_API_SECRET` — optional RWA and transaction API credentials.
- `BSC_RPC_URL` — the normal BSC RPC endpoint.
- `BSC_ARCHIVE_RPC_URL` — the archive endpoint used by Sandbox fork runs.
- `HOROI_SANDBOX_EXECUTION=1` — routes conformance execution through one Vercel Sandbox per run.
- `HOROI_REPOSITORY_URL` — optional public repository URL; defaults to the Horoi GitHub repository.
- `HOROI_SOURCE_REVISION` — the commit that the Sandbox must execute. In Vercel this can be set to the deployment commit.

Keep `REGISTRY_ADDRESS` unset until a mainnet registry deployment is explicitly
approved. `PRIVATE_KEY` is not part of the deployment configuration.

## Database and execution

Production uses Postgres and applies the idempotent schema in
`backend/migrations/001_initial.sql` at startup. SQLite remains the local test
fallback when `DATABASE_URL` is absent outside Vercel. Vercel startup fails if
`DATABASE_URL` is missing, so a deployment cannot silently use ephemeral disk.

Each API run is awaited by the backend and, when `HOROI_SANDBOX_EXECUTION=1`,
executes the existing Foundry/Anvil path inside a fresh Vercel Sandbox. The
archive RPC is passed to that Sandbox only as an environment variable. The
Sandbox has a hard timeout and is stopped in a `finally` block.

## Verification

```sh
bun install --frozen-lockfile
bun run typecheck
bun run test
bun run build
forge fmt --check
forge build
forge test -vvv
```

Deploy the first `horoi` bootstrap with the Vercel CLI, then make a second
deployment through the normal preview workflow. Check `/`, `/api/health`, the
RWA endpoints, and one real Sandbox fork run before opening the migration PR.

# Deploy

## Order

1. Backend + frontend validation (`bun run verify`)
2. **Registry last** (mainnet gas + key)

## API / CLI (Bun)

```bash
export BSC_RPC_URL=https://bsc-dataseed.bnbchain.org
export DATABASE_PATH=./horoi.db
export PORT=3000
bun run api
```

No publisher private key on the API host.

## Frontend

```bash
cd frontend
bun run build
# serve dist/ statically
VITE_API_BASE=https://your-api/api
```

## Anvil / Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Fork worker: one Anvil process per run on `127.0.0.1`, killed after completion.

## HoroiRegistry (BSC mainnet) — LAST

```bash
export PRIVATE_KEY=0x...   # admin+publisher initially; rotate later
export ADMIN=0xYourAdminOrMultisig
forge create backend/HoroiRegistry.sol:HoroiRegistry \
  --constructor-args $ADMIN \
  --rpc-url $BSC_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast

export REGISTRY_ADDRESS=<deployed>
```

Post-deploy:
- record address + tx
- grant `PUBLISHER_ROLE` to dedicated publisher if different from admin
- transfer `DEFAULT_ADMIN_ROLE` to multisig when available
- verify source on BscScan

## Rollback

Registry is non-upgradeable. Invalid publications are `revoke(reportId)`, not deletion. Material semantic change → deploy new registry and document migration.

## Secrets

- `.env` gitignored
- frontend gets only `VITE_API_BASE`, chain id, registry address
- redact RPC query strings in logs/DevEx


## Release gate before mainnet

Run from a clean checkout:

```bash
bun install --frozen-lockfile
bun run typecheck
bun run test
forge fmt --check
forge build
forge test
bun run --cwd frontend build
```

Then run a real NVDAB inspect and a pinned-fork integration run. Do not publish a registry report produced by an older Horoi suite.

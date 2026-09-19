# Horoi

Horoi is tokenized-stock DeFi conformance infrastructure for BNB Smart Chain that tests whether integrations preserve the economic semantics of bStocks across multiplier changes, dividends, stock splits, reverse splits, and scheduled transitions.

Repository: https://github.com/riyannode/horoi

## Problem and thesis

A token can be BEP-20 compatible and still be economically incompatible with a DeFi integration. Horoi tests raw versus effective claims when BEP-677 / EIP-8056 multiplier semantics change, rather than treating successful transfers as proof of economic compatibility.

Horoi is **not** a stock picker, trading bot, router, yield protocol, or security audit.

## Product loop

```
REAL BSTOCK → INSPECT SEMANTICS → PIN BSC BLOCK → LOCAL FORK
→ CORPORATE-ACTION SCENARIOS → ECONOMIC INVARIANTS
→ PASS / FAIL / INCOMPLETE + EVIDENCE → HASH → REGISTRY
```

## Repository layout

Only three top-level directories (plus root config files):

- `backend/` — Bun + Elysia API, CLI, engine, adapters, `HoroiRegistry.sol`
- `frontend/` — React + Vite dashboard
- `docs/` — PRD, architecture, tests, errors, deploy, DevEx, demo

## Architecture and current implementation

- `backend/chain.ts` validates BSC chain ID `56`, reads BEP-677/EIP-8056 state, and manages isolated Anvil forks.
- `backend/engine.ts` evaluates deterministic H001–H110 checks and computes `suiteHash`/`resultHash`.
- `backend/adapters.ts` contains custody and ERC-4626-like adapter boundaries.
- `backend/binance.ts` keeps signed Binance Web3 RWA, Transaction, and Wallet context separate from conformance truth.
- `backend/api.ts` exposes inspection, RWA context, runs, reports, exact publication payloads, and simulation preflight.
- `frontend/` provides the judge-facing run/result/report flow with explicit BSC mainnet versus local fork labels.
- `backend/HoroiRegistry.sol` anchors report summaries only; it has no custody, upgrade proxy, or arbitrary execution.

The current source verifies the real NVDAB contract and a real fork transfer/conversion/UI-balance path. Full integration remains `INCOMPLETE` until a real NVDAB-compatible target and authorized multiplier transition path are supplied.

## Requirements

- Bun 1.4.x
- Foundry (forge + anvil) for fork tests and contract tests
- Node not required if Bun is present

```bash
bun install
```

## Scripts

| Command | Purpose |
|--------|---------|
| `bun run api` | Start Horoi API |
| `bun run web` | Start Vite frontend |
| `bun run typecheck` | TypeScript noEmit |
| `bun run test` | Backend unit tests |
| `bun run contract:test` | `forge test` |
| `bun run verify` | typecheck + tests + contract tests + frontend build |
| `bun backend/cli.ts inspect <asset>` | Inspect a bStock |
| `bun backend/cli.ts test <asset> <target> --profile erc4626` | Full conformance run |

Exit codes for CLI `test`: `0` PASS, `1` FAIL, `2` INCOMPLETE, `3` error, `4` usage.

## Environment

Copy `.env.example` to `.env`. Never commit private keys.

| Variable | Meaning |
|----------|---------|
| `BSC_RPC_URL` | BSC mainnet RPC |
| `DATABASE_PATH` | SQLite path |
| `REGISTRY_ADDRESS` | Deployed HoroiRegistry |
| `BINANCE_API_KEY` | Binance Web3 API key, backend only |
| `BINANCE_API_SECRET` | Binance Web3 signing secret, backend only |
| `BINANCE_WEB3_BASE_URL` | Defaults to `https://web3.binance.com/build` |
| `PRIVATE_KEY` | Deploy/publish only — never on API server |

## Registry

`HoroiRegistry` anchors immutable report summaries on BSC mainnet.

- No token custody
- No upgrade proxy
- AccessControl: `DEFAULT_ADMIN_ROLE`, `PUBLISHER_ROLE`
- Status: `1=PASS`, `2=FAIL`, `3=INCOMPLETE`

Deploy is intentionally the **last** gate:

```bash
export PRIVATE_KEY=...   # publisher/admin wallet with BNB
forge create backend/HoroiRegistry.sol:HoroiRegistry --constructor-args $ADMIN --rpc-url $BSC_RPC_URL --private-key $PRIVATE_KEY --broadcast
```

## Sample BEP-677 / EIP-8056 token (reference)

Official reference deploy from `bnb-chain/bep-677-contracts`:

- **BSC Testnet BeaconProxy**: `0x101ba6E119035C3a037BE594F3454032fDbfa65e`

Production Binance bStock mainnet addresses must be taken from official Binance sources (this build network could not fetch the Academy article — see `docs/DEVEX.md`). Inspect uses whatever asset address you paste; missing required interfaces surface as `CORE_INTERFACE_MISSING` / `INCOMPLETE`, never a fake PASS.

## Production bStock target for AC-08

NVDAB mainnet address used by the project:

`0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436`

The old generated inspect/report JSON was removed in v1.1 because it was produced before Horoi corrected the optional BEP-677 interface IDs and therefore must not be reused as evidence. Re-run `horoi inspect` and the full fork suite from this release candidate before publishing any report.

```bash
export BSC_RPC_URL=https://bsc-dataseed.bnbchain.org
bun backend/cli.ts inspect 0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436 --json
```

For a full PASS/FAIL conformance result you also need a real target integration, preferably an ERC-4626-like vault whose `asset()` is the bStock. Token-only or generic custody runs intentionally remain INCOMPLETE for integration checks.

## Limitations / disclaimer

- PASS is **block-bound** and suite-bound — not a permanent safety certificate.
- Required scenarios that cannot be faithfully reproduced on a fork return **INCOMPLETE**, never a manufactured PASS.
- Mainnet state is read-only; corporate-action mutations run only on an isolated Anvil fork.
- Horoi does not custody assets and the API does not broadcast registry transactions with a server key.

## Hackathon

BNB Hack — Tokenized Stocks Edition with Binance Web3 Wallet. v1 focus: **bStocks** + BEP-677 / EIP-8056 Scaled UI Amount semantics.

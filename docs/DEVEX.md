# Developer Experience Report

Evidence collected during Horoi integration work. No invented praise.

## Environment

| Item | Observed |
|------|----------|
| OS | Windows host + WSL2 Ubuntu 24.04 |
| Bun | 1.4.2 (WSL) |
| Foundry | 1.8.3 (`foundryup` stable) |
| Node (Windows) | v24.15.0 (bundled) — PowerShell execution policy blocks `npm.ps1`/`bun.ps1` |
| Default RPC | `https://bsc-dataseed.bnbchain.org` |

## 1) Windows PowerShell cannot run `bun`/`npm` wrappers

- **Page/tool**: `bun.ps1` / `npm.ps1` under hermes node path
- **Operation**: `bun --version`, `npm view ...`
- **Result**: `UnauthorizedAccess` — running scripts is disabled
- **Expected**: version query
- **Repro**: run wrappers on Windows with restricted execution policy
- **Impact**: toolchain blocked on native Windows
- **Fix suggestion**: document WSL/Linux path; ship `bun` binary without `.ps1` policy dependency

## 2) Binance Academy blocked raw HTTP; Playwright browser works

- **URL**: `https://www.binance.com/en/academy/articles/what-are-bstocks-a-guide-to-tokenized-stocks-on-binance`
- **Operation (raw)**: curl / webfetch
- **Result**: `HTTP 202` + header `x-amzn-waf-action: challenge` (AWS WAF via CloudFront, edge CGK50-P2). TLS and DNS fine.
- **Operation (browser)**: Playwright Chromium headless after extracting `libnss3`/`libnspr4` debs to user path (no root)
- **Result**: WAF challenge clears in-page; article title and body retrieved (~15k chars). Saved: `docs/binance-bstocks-page.txt`
- **Expected for integrators**: JSON/HTML without JS challenge for public docs, or official docs mirror
- **Impact**: non-browser agents cannot read Academy docs; product semantics still obtainable via browser automation
- **Evidence extract** (observed, not invented):
  - bStocks are BEP-20 on BNB Smart Chain
  - integrate with **BEP-677 (Scaled UI Amount)**
  - corporate actions (dividends/splits) via on-chain **Multiplier**
  - dividends reinvested (no cash); 2-for-1 split doubles token quantity via Multiplier
  - article does **not** list production contract addresses
- **Fix suggestion**: public address registry + machine-readable metadata API for integrators

Note: Wi-Fi adapter still had ISP DNS `10.208.109.22` while Ethernet used `1.1.1.1`; WAF challenge is independent of DNS choice.


## 3) BEP-677 interface discovery is mandatory

- **Operation**: ERC-165 `supportsInterface` for `IScaledUIAmount` (`0xa60bf13d`) and `IScaledUIAmountNewUIMultiplier` (`0x4bd27648`)
- **Expected**: tokens advertise scaled UI semantics
- **Observed**: integrations that only call `balanceOf`/`transfer` miss multiplier transitions entirely — technical tx success ≠ economic correctness
- **Impact**: silent accounting drift on split/dividend
- **Fix suggestion**: reference implementation should document event `TransferWithUIAmount` and scheduled multiplier lifecycle with fork examples

## 4) Corporate-action mutation on fork is not always faithful

- **Operation**: schedule multiplier via authorized admin path on Anvil impersonation
- **Expected**: schedule → warp → activate
- **Observed** (design constraint): production admin keys/roles may be unavailable; storage cheats would create false PASS
- **Policy taken**: required checks return `INCOMPLETE` + `FORK_MUTATION_UNAVAILABLE`
- **Fix suggestion**: token issuers publish role addresses + `setUIMultiplier` ABI for testnets or view of pending schedule

## 5) RPC public endpoints rate-limit / flake

- **Operation**: block pin + contract reads during inspect
- **Result**: intermittent `RPC_UNAVAILABLE` on congested public endpoints
- **Impact**: inspect/run retries; not a conformance FAIL
- **Fix suggestion**: multi-provider failover; free hackathon RPC tiers; return provider class without secrets

## 6) Conformance product requirement

Reporting must distinguish:
- raw claim vs effective claim
- PASS vs FAIL vs INCOMPLETE
- fork tx labeled FORK, never MAINNET

Optional metadata (prices/restrictions) must not rewrite onchain facts or flip FAIL→PASS.

## 7) NVDAB evidence invalidated after conformance hardening

Earlier development artifacts for NVDAB were generated before Horoi corrected the official optional BEP-677 interface IDs. They have been removed from the release candidate and must not be cited as final evidence.

v1.1 uses:
- `IScaledUIAmountConversion = 0x57854fc3`
- `IScaledUIAmountBalances = 0xd890fd71`
- `IERC8056Scheduled = 0xeb0093dd`

The final DevEx report must insert fresh onchain observations after `bun run verify` and the live BSC fork run are rerun by the maintainer.

## 8) Remaining integration friction

- Full corporate-action conformance requires a real target protocol plus an authorized multiplier update path discoverable on the fork.
- If Horoi cannot faithfully reproduce a required transition, it returns INCOMPLETE instead of using storage cheats.
- Public RPC log-range limits can prevent automatic holder/updater discovery; the CLI/API accepts an explicit known holder fallback.

## 9) Release-session observations (19 September 2026)

These entries are from this release-session runtime, not assumptions:

### Toolchain

- Bun installed in the base environment: `1.3.14`; the repository PRD requires Bun `1.4.x`.
- Bun `1.4.2` was installed in an isolated temporary path and used for a clean dependency install from `https://registry.npmjs.org`.
- Foundry stable `1.8.3` / Anvil `1.8.3` was installed through the official `foundryup` flow.
- The repository `.npmrc` points to `https://mirrors.tencentyun.com/npm`; that mirror returned 404s for the pinned packages. The release install therefore used the official npm registry override without changing the repository `.npmrc`.

### Binance Web3

- Official authentication docs specify HMAC-SHA256 over `timestamp + method + /build request path + raw body`, with `X-OC-APIKEY`, `X-OC-TIMESTAMP`, and `X-OC-SIGN` headers.
- The implemented client follows that path-prefix/signature rule and uses a 15-second request timeout.
- Historical uncredentialed-environment snapshot: no Binance API key/secret was present in that execution environment, so the signed RWA call and Transaction API simulation were then NOT VERIFIED; the product returned `BINANCE_API_NOT_CONFIGURED` rather than fake success. Later authenticated API evidence is recorded in the PR body.
- No publication transaction exists, so Wallet transaction-detail readback is NOT VERIFIED.

### BSC read evidence

- Direct BSC RPC inspection of NVDAB at `0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436` returned chain ID `56`, symbol `NVDAB`, name `NVIDIA Corp`, decimals `18`, and all five expected interface flags true.
- A fresh inspect also returned a live source block, block hash, block timestamp, active multiplier, and no pending transition. Exact values are recorded in the final release report, not committed as stale fixtures.
- Historical initial pinned Anvil smoke, superseded by the full compatible/incompatible fork evidence in [docs/TESTS.md](TESTS.md): it executed a real transfer receipt and decoded `TransferWithUIAmount`; H005, H007, and H008 passed. The supplied updater could not schedule a faithful transition in that run, so H006 was then `INCOMPLETE` with `FORK_MUTATION_UNAVAILABLE`. No storage mutation was used.

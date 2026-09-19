# Tests (HOROI-BSTOCK-1 v1.2.0)

Statuses: `PASS` / `FAIL` / `INCOMPLETE` / `SKIP` / `ERROR`.

Aggregation:
- PASS only if **all required** checks executed and passed.
- Any required `INCOMPLETE`/`SKIP`/`ERROR` ⇒ run `INCOMPLETE` (or `FAIL` if another required check failed).
- Optional absence is `SKIP`, not a core failure.

## Token checks

| ID | Name | Required | Expectation |
|----|------|----------|-------------|
| H001 | CORE_INTERFACE | yes | `supportsInterface(0xa60bf13d)==true` |
| H002 | REQUIRED_PENDING_INTERFACE | yes | `supportsInterface(0x4bd27648)==true` |
| H003 | ACTIVE_MULTIPLIER | yes | `uiMultiplier()>0` |
| H004 | PENDING_STATE | yes | idle: `newUIMultiplier==uiMultiplier && effectiveAt==0`; or `effectiveAt>forkTs` |
| H005 | TRANSFER_UI_EVENT | yes | Transfer + TransferWithUIAmount consistent with multiplier |
| H006 | SCHEDULED_TRANSITION | yes | authorized path warp; else INCOMPLETE |
| H007 | CONVERSION_CONSISTENCY | no | `toUIAmount ≈ raw*mult/1e18` |
| H008 | UI_BALANCE_CONSISTENCY | no | `balanceOfUI` integer-consistent |

## Integration checks

| ID | Name | Required | Tolerance |
|----|------|----------|-----------|
| H101 | BASELINE_DEPOSIT | yes | deposit success + identifiable claim |
| H102 | BASELINE_REDEEM | yes | profile exact/bounded |
| H103 | FORWARD_SPLIT | yes | 2.0x conservation; Δ ≤ 1 wei on integer path |
| H104 | REVERSE_SPLIT | yes | 0.1x conservation |
| H105 | DIVIDEND_REINVESTMENT | yes | e.g. 1.008x not ignored / not double-applied |
| H106 | PRE_EFFECTIVE_STATE | yes | new multiplier not active early |
| H107 | POST_EFFECTIVE_STATE | yes | new multiplier active after |
| H108 | REDEMPTION_AFTER_CHANGE | yes | proportional raw + effective within tolerance |
| H109 | MULTI_USER_PROPORTION | yes | relative ownership preserved on pure split |
| H110 | FRACTIONAL_BOUNDARY | yes | no silent zero/neg claim |
| H201–H203 | optional context/custom | no | never override required FAIL |

## Formulae

```
effective = raw * multiplier / 1e18
multiplier 1e18 = 1.0x
```

Pure split: effective quantity changes inversely with unit price; notional conserved within modeled rounding — not market price prediction.

## Contract tests (Foundry)

R001–R020 in `backend/HoroiRegistry.t.sol` — roles, publish/revoke, zero-address/hash/status reverts, duplicate, reportId parity, fuzz, no ETH custody, gas snapshot.

`HoroiVault.t.sol` covers the transparent harness deposit/redeem path, two-user
proportional claims, fractional raw amounts, and the deliberate incompatible fixture.
The adapter boundary exposes `setup`, `deposit`, `position`, `expectedClaim`, and
`redeem`; only the engine assigns verdicts.

`backend/tests/harness.test.ts` is an engine unit test using synthetic `EvaluationInput`;
it is not integration evidence. The pinned-fork release smoke below deploys each target
inside `runConformance`'s isolated BSC fork and prints the actual H101-H110 reports.

### Pinned-fork harness release smoke

After `bun install --frozen-lockfile`, run:

```bash
forge build
BSC_RPC_URL="${BSC_ARCHIVE_RPC_URL:?set BSC_ARCHIVE_RPC_URL}" bun run smoke:fork
```

The command pins NVDAB to BSC block `122846004`, verifies chain ID `56`, deploys
`HoroiVault` and `NaiveHoroiVault` on separate isolated forks, then runs each through
the real adapter and `runConformance` path. It discovers the multiplier updater from
fork state, performs real deposits, position reads, multiplier changes, and redemption,
and prints the report metadata, H101-H110 statuses, and `resultHash` for both targets.
If holder discovery is rate-limited, set `HOROI_HOLDER_ADDRESS` to a funded holder at
the pinned block and rerun the same command.

The pinned state requires an archive-capable RPC. In the latest rerun,
`bsc.publicnode.com` required a personal token for historical state and the public
`bsc-dataseed.bnbchain.org` endpoint returned `missing trie node` at block `122846004`.
Those attempts produced `ERROR` reports before fork startup; they are not conformance
evidence. Supply the archive endpoint through `BSC_ARCHIVE_RPC_URL` before claiming a
full harness result.

## Publication simulation tests

- exact `HoroiRegistry.publish` calldata and report arguments;
- official Transaction API request shape (`binanceChainId` + `evmTx`);
- payload hash changes for chain/from/to/value/data changes;
- business-code failures are not treated as HTTP success;
- persisted run/payload/attempt/success/code/latency/evidence/error/timestamp fields;
- credentials and signing headers are never persisted.

## Observed release-session evidence

- Direct NVDAB BSC inspection: chain `56`; H001/H002/H003/H004 pass; all optional interface probes are true.
- Pinned Anvil smoke with a real holder and a real transfer receipt: H005, H007, and H008 pass.
- NVDAB authorization discovery found no callable `owner()`, an enumerable `DEFAULT_ADMIN_ROLE` member, and a working admin `setUIMultiplier` path on an isolated fork. Independent 2.0x, 0.1x, and 1.008x transitions passed pre/post-effective checks; no storage mutation was used.
- Token-only/custody runs keep H101–H110 `INCOMPLETE` because custody has no standardized deposit/redeem target. The transparent HoroiVault harness provides the production-neutral integration target; it is not an external protocol.
- Live Binance publication simulation is `BLOCKED_REGISTRY_NOT_DEPLOYED` because this PR does not invent or deploy `REGISTRY_ADDRESS`.

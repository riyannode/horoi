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
BSC_RPC_URL="${BSC_ARCHIVE_RPC_URL:?set BSC_ARCHIVE_RPC_URL}" HOROI_SMOKE_FIXTURE=compatible bun run smoke:fork
```

The command pins NVDAB to BSC block `122846004`, verifies chain ID `56`, deploys the
selected fixture inside an isolated fork, then runs it through the real adapter and
`runConformance` path. It discovers the multiplier updater from fork state, performs
real deposits, position reads, multiplier changes, and redemption, and prints report
metadata, H101-H110 statuses, H006 evidence, and `resultHash`. Run the compatible
fixture first; only after it passes, run the incompatible fixture:

```bash
BSC_RPC_URL="${BSC_ARCHIVE_RPC_URL:?set BSC_ARCHIVE_RPC_URL}" HOROI_SMOKE_FIXTURE=incompatible bun run smoke:fork
```

`HOROI_SMOKE_FIXTURE` accepts `compatible`, `incompatible`, or `both` (default).
`HOROI_HOLDER_ADDRESS` may identify a funded holder at the pinned block to skip log
discovery. Automatic discovery scans at most 1,000 blocks per log request and stops
with an error if the provider rejects a request. `HOROI_FORK_RPC_TIMEOUT_MS` controls
local fork HTTP and Anvil upstream request timeouts, defaults to `120000`, and accepts
positive values up to `300000` milliseconds. Anvil upstream retries are disabled so a
stalled archive request cannot hold a fork RPC operation through repeated retries.

The Ankr archive gate passed. The verified archive and full fork evidence are recorded
under [Observed release-session evidence](#observed-release-session-evidence); this
document does not store the endpoint or credential.

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
- Ankr archive gate: PASS; chain ID `56`; NVDAB pinned block `122846004`; historical `uiMultiplier=1000778223752807865`; historical code is present.
- Full pinned-fork smoke at implementation HEAD `ba79b29`: compatible `HoroiVault` profile `custom`, target `0xB63EAa97eC11623bBf873de50e805C46aF820d50`, report `PASS`, and H101–H110 all `PASS`. `suiteHash=0xc026467b2012f2e15bbfbe510af97cf234c430e0470c664916cfac73dbea4ee0`; `resultHash=0x39c1058021836b82016634fc400f1179de43d2eee3546d205565cf697444415a`.
- H006: PASS for the authorized forward 2.0x scheduled transition with pre/post-effective verification through discovered updater `0x45e35Fe982F3869221b222Abea372fA97AA7679d`.
- Compatible H104: PASS for the reverse 0.1x scenario. Compatible H105: PASS for the dividend-like 1.008x scenario.
- In a separate isolated fork, `NaiveHoroiVault` profile `custom` returned expected overall `FAIL`: H103, H104, and H105 fail because multiplier changes are ignored. H103 expected effective claim `2001556447505615`, observed `1000000000000000`; `resultHash=0xd5b621282c9d899da752de8080d48930cf86bfed237b740dc35498190f4ba933`.
- NVDAB authorization discovery found no callable `owner()`, an enumerable `DEFAULT_ADMIN_ROLE` member, and a working admin `setUIMultiplier` path on an isolated fork. No storage mutation was used; neither `anvil_setStorageAt` nor `vm.store` was used.
- Token-only/custody runs keep H101–H110 `INCOMPLETE` because custody has no standardized deposit/redeem target. The transparent HoroiVault harness provides the production-neutral integration target; it is not an external protocol.
- Live Binance publication simulation is `BLOCKED_REGISTRY_NOT_DEPLOYED` because this PR does not invent or deploy `REGISTRY_ADDRESS`.

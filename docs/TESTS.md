# Tests (HOROI-BSTOCK-1 v1.1.0)

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

## Observed release-session evidence

- Direct NVDAB BSC inspection: chain `56`; H001/H002/H003/H004 pass; all optional interface probes are true.
- Pinned Anvil smoke with a real holder and a real transfer receipt: H005, H007, and H008 pass.
- Multiplier update with an unauthorized/unknown updater is reported as H006 `INCOMPLETE` (`FORK_MUTATION_UNAVAILABLE`); no storage mutation is used.
- Token-only/custody runs keep H101–H110 `INCOMPLETE` because custody has no standardized deposit/redeem target. A full integration run requires an actual target that accepts NVDAB.
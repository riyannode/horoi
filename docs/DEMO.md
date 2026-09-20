# Judge demo (≤4 minutes)

## Script

**0:00–0:25 Problem**
Raw balance can stay unchanged while effective balance changes via multiplier. ERC-20 success ≠ economic correctness.

**0:25–0:50 Inspect**
Paste real bStock. Show chain 56, multiplier, pending state, supported interfaces.

**0:50–2:10 Run**
Pick profile + target. Show pinned block, local fork, checks table:
- baseline deposit/redeem
- forward 2.0x split
- reverse 0.1x
- dividend-like 1.008x
- scheduled transition (or INCOMPLETE with evidence)
- redemption after change

**2:10–2:45 Failure evidence**
Open a FAIL or known-bad fixture. Show expected vs observed economic claim + error code (`INVARIANT_MULTIPLIER_IGNORED`, etc.).

**2:45–3:20 Correct/incompatible comparison**
Show the transparent `HoroiVault` harness with raw canonical accounting and the
explicit `TEST/INCOMPATIBLE` stale-effective snapshot fixture. The compatible run
passes H101–H110; the incompatible run fails deterministically with
`INVARIANT_MULTIPLIER_IGNORED`. Neither fixture is an external production protocol.

**3:20–3:45 Publication preflight**
Show exact `HoroiRegistry.publish` arguments, ABI calldata, `chainId/from/to/value/data`
payload identity, and Binance Transaction API simulation evidence. This PR does not
deploy a registry, broadcast a transaction, or claim Wallet API readback; without a
deployed registry the stable result is `BLOCKED_REGISTRY_NOT_DEPLOYED`.

**3:45–4:00 Thesis**
“Horoi lets DeFi developers prove their tokenized-stock integration survives the events that make stocks different from ordinary tokens.”

## Repro commands

```bash
bun install
bun run api          # terminal 1
bun run web          # terminal 2
# or CLI
bun backend/cli.ts inspect <BSTOCK>
bun backend/cli.ts test <BSTOCK> <VAULT> --profile erc4626 --json > horoi.json
/root/.foundry/bin/forge test -vvv
bun backend/cli.ts simulate-publish <runId> --from <publisher>
```

## Notes

- Label every fork tx as FORK in UI evidence.
- Label `HoroiVault` as a transparent Horoi integration harness and `NaiveHoroiVault` as `TEST/INCOMPATIBLE`.
- Do not claim “certified safe.”
- Do not claim mainnet deployment, live publication, NVDAB production mutation, or Wallet API readback unless separately verified.
- If scheduled transition cannot be reproduced, show INCOMPLETE — that honesty is the product.

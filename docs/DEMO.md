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

**2:45–3:20 Correct result**
Show compatible integration PASS (or corrected adapter).

**3:20–3:45 Onchain proof**
Publish report summary to HoroiRegistry on BSC mainnet. Show reportId, suiteHash, resultHash, block, BscScan tx.

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
```

## Notes

- Label every fork tx as FORK in UI evidence.
- Do not claim “certified safe.”
- If scheduled transition cannot be reproduced, show INCOMPLETE — that honesty is the product.

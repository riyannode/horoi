# Error codes

Stable public codes used by API/CLI/reports.

| Code | HTTP | Meaning | Remediation |
|------|------|---------|-------------|
| INPUT_INVALID | 400 | malformed request | fix payload |
| ADDRESS_INVALID | 400 | not a valid address | checksum 0x address |
| CHAIN_MISMATCH | 400 | not BSC chainId 56 | switch RPC/network |
| RPC_UNAVAILABLE | 502 | upstream RPC down | retry / alt RPC |
| RPC_RATE_LIMITED | 429 | provider rate limit | backoff |
| RUN_BUSY | 429 | max concurrent conformance jobs reached | retry after current run completes |
| BLOCK_NOT_FOUND | 404 | pinned block missing | choose available block |
| ASSET_NOT_CONTRACT | 422 | no bytecode at asset | verify bStock address |
| CORE_INTERFACE_MISSING | 422 | no IScaledUIAmount | not a conforming bStock |
| PENDING_INTERFACE_MISSING | 422 | no NewUIMultiplier interface | required for suite |
| OPTIONAL_INTERFACE_UNAVAILABLE | 422 | optional IF absent | expected; usually SKIP |
| MULTIPLIER_INVALID | 422 | uiMultiplier missing/zero | token state anomaly |
| PENDING_STATE_INVALID | 422 | pending state inconsistent | inspect token admin events |
| TARGET_UNSUPPORTED | 400 | profile/target mismatch | pick correct profile/target |
| ADAPTER_INVALID | 400 | adapter incomplete | implement adapter interface |
| DEPOSIT_FAILED | 500* | baseline deposit failed | check fork funds/allowances |
| REDEEM_FAILED | 500* | redeem path failed | check shares/owner |
| FORK_START_FAILED | 500 | anvil failed | install Foundry / RPC |
| FORK_MUTATION_UNAVAILABLE | 422 | cannot reproduce corporate action | report INCOMPLETE |
| FORK_TRANSACTION_FAILED | 500 | fork tx reverted | inspect evidence |
| INVARIANT_VALUE_NOT_CONSERVED | 200+FAIL | economic notional drift | protocol bug or tolerance |
| INVARIANT_MULTIPLIER_IGNORED | 200+FAIL | raw treated as complete position | read BEP-677 semantics |
| INVARIANT_MULTIPLIER_DOUBLE_APPLIED | 200+FAIL | multiplier applied twice | fix accounting |
| INVARIANT_APPLIED_EARLY | 200+FAIL | pending used before effectiveAt | respect schedule |
| INVARIANT_APPLIED_LATE | 200+FAIL | stale multiplier after effectiveAt | refresh state |
| INVARIANT_REDEMPTION_DRIFT | 200+FAIL | redeem claim wrong | proportional math |
| INVARIANT_ROUNDING_EXCEEDED | 200+FAIL | outside tolerance | fix integer math |
| INVARIANT_EVENT_MISMATCH | 200+FAIL | events ≠ multiplier state | emit TransferWithUIAmount |
| REPORT_HASH_FAILED | 500 | canonical hash error | internal bug |
| CONTEXT_HASH_FAILED | 500 | external context canonicalization error | inspect normalized evidence |
| BINANCE_API_NOT_CONFIGURED | 424 | signed Binance Web3 credentials absent | configure backend-only credentials |
| BINANCE_AUTH_FAILED | 502 | Binance API key rejected | verify project permissions |
| BINANCE_SIGNATURE_MISMATCH | 502 | signed path/body mismatch | sign exact `/build` request path |
| BINANCE_TIMESTAMP_DRIFT | 502 | request timestamp outside receive window | synchronize system clock |
| BINANCE_RATE_LIMITED | 429 | Binance endpoint rate limit | bounded backoff |
| BINANCE_UPSTREAM_UNAVAILABLE | 502 | Binance service/network unavailable | record evidence; retry idempotent reads only |
| BINANCE_RESPONSE_INVALID | 502 | malformed or failed upstream response | inspect upstream code/message |
| PUBLISHER_NOT_CONFIGURED | 424 | no publisher/from address for simulation | provide `--from` or `HOROI_PUBLISHER_ADDRESS` |
| RWA_ASSET_NOT_FOUND | 424 | no selected RWA asset match | verify ticker/address |
| RWA_PLATFORM_UNSUPPORTED | 424 | selected platform not supported | choose a supported bStock |
| TX_SIMULATION_FAILED | 424 | publication simulation failed | inspect exact payload/upstream evidence |
| TX_PAYLOAD_CHANGED_AFTER_SIMULATION | 409 | stored simulation does not match current payload | rebuild and simulate the exact current payload |
| WALLET_READBACK_FAILED | 424 | transaction readback unavailable | compare with direct chain state |
| PUBLICATION_MISMATCH | 409 | sponsor readback disagrees with chain proof | keep publication unverified |
| REGISTRY_NOT_CONFIGURED | 500 | no REGISTRY_ADDRESS | deploy/configure |
| REGISTRY_ALREADY_PUBLISHED | 409 | duplicate reportId | use new run/block |
| REGISTRY_TX_REVERTED | 500 | publish reverted | check role/status |
| INTERNAL_ERROR | 500 | unexpected | logs; stack never to client |

\*Conformance FAIL is HTTP 200 with `status=FAIL`. Engine `INCOMPLETE` uses HTTP 200 as a **valid product result**; infrastructure codes may still map to HTTP errors on inspect/start.

Fork startup/mutation failures are represented as required INCOMPLETE checks in a valid report whenever the run can still be evaluated.

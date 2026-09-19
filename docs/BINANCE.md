# Binance Web3 integration

Horoi keeps Binance Web3 evidence separate from deterministic conformance truth.

## Implemented client boundary

`backend/binance.ts` is the single Binance Web3 client module. It implements:

- HMAC-SHA256 signed requests;
- `X-OC-APIKEY`, `X-OC-TIMESTAMP`, `X-OC-SIGN`, and a bounded receive window;
- the `/build` prefix in both the request URL and signed request path;
- RWA search, token price, underlying profile, and underlying market requests;
- Transaction API simulation for an exact BSC `HoroiRegistry.publish` payload;
- Wallet transaction-detail readback by transaction hash;
- normalized per-call latency, source timestamp, upstream code, and stable error fields.

Secrets are read only from `BINANCE_API_KEY` and `BINANCE_API_SECRET` on the backend. They are never returned to the frontend or included in `resultHash`.

## Official operations used

- Authentication: <https://web3.binance.com/en/dev-docs/authentication>
- RWA Data: <https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data>
  - `GET /api/v1/dex/market/rwa/search`
  - `GET /api/v1/dex/market/rwa/price`
  - `GET /api/v1/dex/market/rwa/underlying-profile`
  - `GET /api/v1/dex/market/rwa/underlying-market`
- Transaction API: <https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/transaction-api>
  - `POST /api/v1/dex/pre-transaction/simulate`
- Wallet API: <https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/wallet-api>
  - `GET /api/v1/dex/post-transaction/transaction-detail-by-txhash`

## Trust boundary

The UI and report label Binance data:

> Context only. It does not determine Horoi conformance status.

`resultHash` covers deterministic BSC/fork evidence only. `contextHash` covers the canonical normalized Binance observation separately. An RWA outage or stale market field cannot change PASS, FAIL, or INCOMPLETE.

## Runtime configuration

```text
BINANCE_API_KEY=
BINANCE_API_SECRET=
BINANCE_WEB3_BASE_URL=https://web3.binance.com/build
```

Both credentials are required. When they are absent, Horoi returns an explicit `BINANCE_API_NOT_CONFIGURED` evidence record; it does not manufacture a successful RWA result.

## Publication simulation

`GET /api/reports/:id/publish` returns the exact report ID, registry arguments, and saved simulation evidence. `POST /api/reports/:id/simulate-publication` requires a caller-supplied publisher address, builds the exact ABI calldata, hashes the exact transaction payload, and calls Binance Transaction API simulation. It never signs or broadcasts.

A simulation is preflight evidence only. Direct BSC receipt and registry readback remain final chain truth.

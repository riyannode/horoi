# Frontend deployment

Horoi's Vite frontend can be hosted on Vercel as a static site. Keep the Vercel
project root at the repository root; [`vercel.json`](../vercel.json) installs the
workspace dependencies and builds only `frontend/` into `frontend/dist`.

The backend remains a separately hosted Bun/Elysia service. It uses SQLite and
starts Anvil child processes for isolated forks, so this configuration does not
deploy or run the backend on Vercel.

## API configuration

The frontend reads `VITE_API_BASE` at build time and defaults to `/api`. Vite's
local development server proxies `/api` to the local backend. In Vercel project
settings, configure `VITE_API_BASE` for each deployment environment before
building:

- Set it to the public HTTPS backend API base, including `/api`, when the
  frontend calls the VPS directly. The backend must allow the deployed frontend
  origin through CORS.
- Set it to `/api` when Vercel is configured with a same-origin rewrite from
  `/api/:path*` to the HTTPS backend API.

The production backend hostname has not been confirmed, so this repository does
not define a rewrite destination. Add the rewrite only after that hostname is
known. Until `VITE_API_BASE` or a matching rewrite is configured in Vercel, the
frontend build can succeed but API requests will not reach the backend.

`VITE_*` values are included in the browser bundle. Only use this variable for a
public API base URL; never put Binance credentials, RPC credentials, or private
keys in frontend environment variables.

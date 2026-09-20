const BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = data as { error?: string; message?: string } | null;
    throw new Error(err?.error ? `${err.error}: ${err.message ?? ""}` : res.statusText);
  }
  return data as T;
}

export type Health = {
  ok: boolean;
  chainId: number;
  suite: string;
  version: string;
  binanceWeb3?: { rwaConfigured: boolean; transactionConfigured: boolean; walletConfigured: boolean };
  activeRuns?: number;
  maxConcurrentRuns?: number;
};
export type RwaCall = {
  module: string;
  operation: string;
  endpointId: string;
  success: boolean;
  sourceTimestamp?: number;
  latencyMs: number;
  upstreamCode?: string;
  errorCode?: string;
};
export type RwaContext = {
  capturedAt: number;
  contextHash: string;
  configured: boolean;
  assetQuery: string;
  selectedAsset?: Record<string, unknown>;
  tokenPrice?: string;
  referencePrice?: string;
  underlying?: Record<string, unknown>;
  market?: Record<string, unknown>;
  calls: RwaCall[];
};
export type AssetSearchItem = {
  ticker?: string;
  companyName?: string;
  platformId?: string;
  binanceChainId?: string;
  tokenContractAddress?: string;
  tokenSymbol?: string;
  tokenName?: string;
  underlyingTicker?: string;
};
export type InspectResult = {
  asset: string;
  chainId: number;
  name?: string;
  symbol?: string;
  decimals: number;
  interfaces: Record<string, boolean>;
  supportedInterfaces: string[];
  uiMultiplier: string;
  newUIMultiplier: string;
  effectiveAt: string;
  blockNumber: string;
  blockHash?: string;
  blockTimestamp?: string;
};
export type RunResult = { runId: string; status: string; blockNumber?: string };
export type CheckResult = {
  id: string;
  name: string;
  required: boolean;
  status: string;
  expected?: unknown;
  observed?: unknown;
  evidence?: Record<string, unknown>;
  errorCode?: string;
  durationMs?: number;
};
export type Report = {
  runId: string;
  status: string;
  chainId: number;
  blockNumber: number;
  blockHash: string;
  asset: string;
  target: string;
  profile: string;
  suiteId: string;
  suiteVersion: string;
  suiteHash: string;
  resultHash: string;
  token: {
    decimals: number;
    uiMultiplier: string;
    newUIMultiplier: string;
    effectiveAt: number;
    supportedInterfaces: string[];
  };
  checks: CheckResult[];
  economics?: Record<string, { rawClaim: string; multiplier: string; effectiveClaim: string }>;
  binanceWeb3?: RwaContext;
  summary: Record<string, number>;
  registry?: Record<string, string>;
};
export type ReportListItem = {
  runId: string;
  asset: string;
  target: string | null;
  profile: string;
  status: string;
  blockNumber: number;
  startedAt: number;
  resultHash?: string;
};

export const api = {
  health: () => req<Health>("/health"),
  search: (query: string) => req<{ query: string; source: string; calls: RwaCall[]; items: AssetSearchItem[] }>(`/assets/search?q=${encodeURIComponent(query)}`),
  context: (asset: string) => req<{ asset: string; source: string; context: RwaContext; note: string }>(`/assets/${encodeURIComponent(asset)}/context`),
  inspect: (asset: string) =>
    req<InspectResult>("/assets/inspect", { method: "POST", body: JSON.stringify({ asset }) }),
  startRun: (body: { asset: string; target: string | null; profile: string; blockNumber: number | null; holder?: string | null; updater?: string | null }) =>
    req<RunResult>("/runs", { method: "POST", body: JSON.stringify(body) }),
  getRun: (id: string) => req<{ runId: string; status: string; progress?: { completed: number; total: number }; report?: Report | null; errorCode?: string }>(`/runs/${id}`),
  getReport: (id: string) => req<Report>(`/reports/${id}`),
  listReports: () => req<{ items: ReportListItem[] }>("/reports"),
  publishPayload: (id: string) => req<Record<string, unknown>>(`/reports/${id}/publish`),
};

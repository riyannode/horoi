import { createHmac } from "node:crypto";
import { keccak256, toHex } from "viem";
import { canonicalJson } from "./engine";
import { ErrorCodes } from "./errors";

const BASE_PATH = "/build";
const DEFAULT_BASE_URL = "https://web3.binance.com/build";
const BSC_CHAIN = "56";

type JsonObject = Record<string, unknown>;

type BinanceCall = {
  module: string;
  operation: string;
  endpointId: string;
  success: boolean;
  sourceTimestamp?: number;
  latencyMs: number;
  upstreamCode?: string;
  errorCode?: string;
};

type BinanceResponse = {
  body: JsonObject;
  call: BinanceCall;
};

export type RwaAsset = {
  ticker?: string;
  companyName?: string;
  platformId?: string;
  binanceChainId?: string;
  tokenContractAddress?: string;
  tokenSymbol?: string;
  tokenName?: string;
  underlyingTicker?: string;
};

export type RwaContext = {
  capturedAt: number;
  contextHash: string;
  configured: boolean;
  assetQuery: string;
  selectedAsset?: RwaAsset;
  tokenPrice?: string;
  referencePrice?: string;
  underlying?: JsonObject;
  market?: JsonObject;
  calls: BinanceCall[];
};

export type PublicationSimulation = {
  attempted: boolean;
  success: boolean;
  payloadHash: string;
  simulatedAt: number;
  evidenceHash: string;
  latencyMs?: number;
  upstreamCode?: string;
  errorCode?: string;
  response?: JsonObject;
};

export type PublicationTransaction = {
  chainId: number;
  from: string;
  to: string;
  value: string;
  data: string;
};

export function publicationPayloadHash(tx: PublicationTransaction): string {
  return keccak256(toHex(canonicalJson(tx)));
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function responseItems(body: JsonObject): JsonObject[] {
  const data = body.data;
  if (Array.isArray(data)) return data.filter(isObject);
  if (!isObject(data)) return [];
  for (const key of ["list", "items", "results", "tokens", "platforms", "prices"]) {
    const value = data[key];
    if (Array.isArray(value)) return value.filter(isObject);
  }
  return [data];
}

function responseObject(body: JsonObject): JsonObject | undefined {
  if (isObject(body.data)) return body.data;
  return responseItems(body)[0];
}

function buildQuery(query: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(query).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return "";
  return `?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join("&")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function upstreamCode(body: JsonObject): string | undefined {
  const code = body.code;
  if (typeof code === "number" || typeof code === "string") return String(code);
  return undefined;
}

function errorCodeFor(status: number, body?: JsonObject): string {
  const code = upstreamCode(body ?? {});
  if (code === "40101") return ErrorCodes.BINANCE_AUTH_FAILED;
  if (code === "40102") return ErrorCodes.BINANCE_SIGNATURE_MISMATCH;
  if (code === "40103") return ErrorCodes.BINANCE_TIMESTAMP_DRIFT;
  if (code === "42900") return ErrorCodes.BINANCE_RATE_LIMITED;
  if (status === 401) return code === "40102" ? ErrorCodes.BINANCE_SIGNATURE_MISMATCH : ErrorCodes.BINANCE_AUTH_FAILED;
  if (status === 429) return ErrorCodes.BINANCE_RATE_LIMITED;
  if (status >= 500) return ErrorCodes.BINANCE_UPSTREAM_UNAVAILABLE;
  return code ? `BINANCE_UPSTREAM_${code}` : ErrorCodes.BINANCE_RESPONSE_INVALID;
}

function callFailure(module: string, operation: string, endpointId: string, errorCode: string): BinanceCall {
  return { module, operation, endpointId, success: false, latencyMs: 0, errorCode };
}

function normalizedRwaSearchItems(body: JsonObject): RwaAsset[] {
  return responseItems(body).flatMap((item) => {
    const nestedAssets = Array.isArray(item.assets)
      ? item.assets.filter(isObject)
      : [item];
    return nestedAssets.map((asset) => ({
      ticker: asString(item.ticker) ?? asString(asset.ticker),
      companyName: asString(item.companyName) ?? asString(asset.companyName),
      platformId: asString(asset.platformId) ?? asString(item.platformId),
      binanceChainId: asString(asset.binanceChainId) ?? asString(item.binanceChainId),
      tokenContractAddress: asString(asset.tokenContractAddress) ?? asString(item.tokenContractAddress),
      tokenSymbol: asString(asset.tokenSymbol) ?? asString(item.tokenSymbol),
      tokenName: asString(asset.tokenName) ?? asString(item.tokenName),
      underlyingTicker: asString(asset.underlyingTicker) ?? asString(item.underlyingTicker),
    }));
  });
}

function canonicalAsset(asset: RwaAsset | undefined): JsonObject | null {
  if (!asset) return null;
  return {
    ticker: asset.ticker ?? null,
    companyName: asset.companyName ?? null,
    platformId: asset.platformId ?? null,
    binanceChainId: asset.binanceChainId ?? null,
    tokenContractAddress: asset.tokenContractAddress ?? null,
    tokenSymbol: asset.tokenSymbol ?? null,
    tokenName: asset.tokenName ?? null,
    underlyingTicker: asset.underlyingTicker ?? null,
  };
}

export function computeRwaContextHash(input: {
  capturedAt: number;
  assetQuery: string;
  selectedAsset?: RwaAsset;
  tokenPrice?: string;
  referencePrice?: string;
  underlying?: JsonObject;
  market?: JsonObject;
  calls: BinanceCall[];
}): string {
  return keccak256(toHex(canonicalJson({
    capturedAt: input.capturedAt,
    assetQuery: input.assetQuery,
    selectedAsset: canonicalAsset(input.selectedAsset),
    tokenPrice: input.tokenPrice ?? null,
    referencePrice: input.referencePrice ?? null,
    underlying: input.underlying ?? null,
    market: input.market ?? null,
    calls: input.calls.map(({ module, operation, endpointId, success, sourceTimestamp, latencyMs, upstreamCode, errorCode }) => ({
      module,
      operation,
      endpointId,
      success,
      sourceTimestamp: sourceTimestamp ?? null,
      latencyMs,
      upstreamCode: upstreamCode ?? null,
      errorCode: errorCode ?? null,
    })),
  })));
}

export class BinanceWeb3Client {
  readonly apiKey = process.env.BINANCE_API_KEY?.trim() || "";
  private readonly secret = process.env.BINANCE_API_SECRET?.trim() || "";
  private readonly baseUrl = (process.env.BINANCE_WEB3_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
  readonly configured = Boolean(this.apiKey && this.secret);

  private async request(args: {
    module: string;
    operation: string;
    path: string;
    query?: Record<string, string | number | boolean | undefined>;
    method?: "GET" | "POST";
    body?: JsonObject;
  }): Promise<BinanceResponse> {
    const method = args.method ?? "GET";
    const query = buildQuery(args.query ?? {});
    const relativePath = `${args.path}${query}`;
    const requestPath = `${BASE_PATH}${relativePath}`;
    const bodyText = method === "GET" ? "" : JSON.stringify(args.body ?? {});
    const timestamp = nowIso();
    const signature = createHmac("sha256", this.secret)
      .update(`${timestamp}${method}${requestPath}${bodyText}`, "utf8")
      .digest("base64");
    const started = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${this.baseUrl}${relativePath}`, {
        method,
        headers: {
          "content-type": "application/json",
          "X-OC-APIKEY": this.apiKey,
          "X-OC-TIMESTAMP": timestamp,
          "X-OC-SIGN": signature,
          "X-OC-RECV-WINDOW": "5000",
        },
        ...(method === "POST" ? { body: bodyText } : {}),
        signal: controller.signal,
      });
      const raw = await response.text();
      let body: JsonObject = {};
      try {
        const parsed: unknown = raw ? JSON.parse(raw) : {};
        if (isObject(parsed)) body = parsed;
      } catch {
        body = {};
      }
      const success = response.ok && (body.code === undefined || body.code === 0 || body.code === "0" || body.success === true);
      const firstItem = responseObject(body);
      const sourceTimestamp = asNumber(firstItem?.tokenPriceUpdatedAt) ?? asNumber(firstItem?.sourceTimestamp);
      const call: BinanceCall = {
        module: args.module,
        operation: args.operation,
        endpointId: `${method} ${args.path}`,
        success,
        sourceTimestamp,
        latencyMs: Math.round(performance.now() - started),
        upstreamCode: upstreamCode(body),
        errorCode: success ? undefined : errorCodeFor(response.status, body),
      };
      return { body, call };
    } catch (error) {
      return {
        body: {},
        call: {
          module: args.module,
          operation: args.operation,
          endpointId: `${method} ${args.path}`,
          success: false,
          latencyMs: Math.round(performance.now() - started),
          errorCode: error instanceof DOMException && error.name === "AbortError"
            ? ErrorCodes.BINANCE_UPSTREAM_UNAVAILABLE
            : ErrorCodes.BINANCE_UPSTREAM_UNAVAILABLE,
        },
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async searchRwa(keyword: string): Promise<{ items: RwaAsset[]; call: BinanceCall }> {
    if (!this.configured) {
      return { items: [], call: callFailure("RWA_DATA", "searchRwaToken", "GET /api/v1/dex/market/rwa/search", ErrorCodes.BINANCE_API_NOT_CONFIGURED) };
    }
    const response = await this.request({
      module: "RWA_DATA",
      operation: "searchRwaToken",
      path: "/api/v1/dex/market/rwa/search",
      query: { keyword, platformId: "bstock" },
    });
    return {
      items: normalizedRwaSearchItems(response.body),
      call: response.call,
    };
  }

  async getRwaContext(assetQuery: string): Promise<RwaContext> {
    const calls: BinanceCall[] = [];
    if (!this.configured) {
      calls.push(callFailure("RWA_DATA", "context", "RWA_CONTEXT", ErrorCodes.BINANCE_API_NOT_CONFIGURED));
      const capturedAt = Date.now();
      return {
        capturedAt,
        contextHash: computeRwaContextHash({ capturedAt, assetQuery, calls }),
        configured: false,
        assetQuery,
        calls,
      };
    }

    const search = await this.searchRwa(assetQuery);
    calls.push(search.call);
    const normalizedQuery = assetQuery.toLowerCase();
    const isAddressQuery = /^0x[0-9a-f]{40}$/.test(normalizedQuery);
    const selectedAsset = isAddressQuery
      ? search.items.find((item) => item.binanceChainId === BSC_CHAIN && item.tokenContractAddress?.toLowerCase() === normalizedQuery)
      : search.items.find((item) => item.binanceChainId === BSC_CHAIN);

    let tokenPrice: string | undefined;
    let referencePrice: string | undefined;
    let underlying: JsonObject | undefined;
    let market: JsonObject | undefined;
    const address = selectedAsset?.tokenContractAddress;
    if (address) {
      const price = await this.request({
        module: "RWA_DATA",
        operation: "getRwaTokenPrice",
        path: "/api/v1/dex/market/rwa/price",
        query: { binanceChainId: BSC_CHAIN, tokenContractAddresses: address },
      });
      calls.push(price.call);
      const priceItem = responseItems(price.body).find((item) => asString(item.tokenContractAddress)?.toLowerCase() === address.toLowerCase()) ?? responseObject(price.body);
      tokenPrice = asString(priceItem?.tokenPrice);
      referencePrice = asString(priceItem?.referencePrice);

      const profile = await this.request({
        module: "RWA_DATA",
        operation: "getRwaUnderlyingInfo",
        path: "/api/v1/dex/market/rwa/underlying-profile",
        query: { tokenContractAddress: address },
      });
      calls.push(profile.call);
      if (profile.call.success) underlying = responseObject(profile.body) ?? underlying;

      const tokenList = await this.request({
        module: "RWA_DATA",
        operation: "getRwaTokenList",
        path: "/api/v1/dex/market/rwa/tokens",
        query: { binanceChainId: BSC_CHAIN, platformId: selectedAsset?.platformId ?? "bstock" },
      });
      calls.push(tokenList.call);
      const tokenItem = responseItems(tokenList.body).find(
        (item) => asString(item.tokenContractAddress)?.toLowerCase() === address.toLowerCase(),
      );
      if (tokenItem) {
        underlying ??= tokenItem;
        market ??= tokenItem;
      }

      const marketResponse = await this.request({
        module: "RWA_DATA",
        operation: "getRwaUnderlyingMarket",
        path: "/api/v1/dex/market/rwa/underlying-market",
        query: { tokenContractAddress: address },
      });
      calls.push(marketResponse.call);
      if (marketResponse.call.success) market = responseObject(marketResponse.body) ?? market;
    }

    const capturedAt = Date.now();
    return {
      capturedAt,
      contextHash: computeRwaContextHash({ capturedAt, assetQuery, selectedAsset, tokenPrice, referencePrice, underlying, market, calls }),
      configured: true,
      assetQuery,
      selectedAsset,
      tokenPrice,
      referencePrice,
      underlying,
      market,
      calls,
    };
  }

  async supportedTransactionChains(): Promise<{ chains: JsonObject[]; call: BinanceCall }> {
    if (!this.configured) return { chains: [], call: callFailure("TRANSACTION", "supportedChains", "GET /api/v1/dex/pre-transaction/supported/chain", ErrorCodes.BINANCE_API_NOT_CONFIGURED) };
    const response = await this.request({
      module: "TRANSACTION",
      operation: "supportedChains",
      path: "/api/v1/dex/pre-transaction/supported/chain",
    });
    return { chains: responseItems(response.body), call: response.call };
  }

  async simulatePublication(tx: PublicationTransaction): Promise<PublicationSimulation> {
    const payloadHash = publicationPayloadHash(tx);
    const simulatedAt = Date.now();
    if (!this.configured) {
      const evidenceHash = keccak256(toHex(canonicalJson({ attempted: false, payloadHash, errorCode: ErrorCodes.BINANCE_API_NOT_CONFIGURED })));
      return { attempted: false, success: false, payloadHash, simulatedAt, evidenceHash, errorCode: ErrorCodes.BINANCE_API_NOT_CONFIGURED };
    }
    const response = await this.request({
      module: "TRANSACTION",
      operation: "simulateTransaction",
      path: "/api/v1/dex/pre-transaction/simulate",
      method: "POST",
      body: {
        binanceChainId: String(tx.chainId),
        evmTx: { from: tx.from, to: tx.to, value: tx.value, data: tx.data },
      },
    });
    const responseData = responseObject(response.body);
    const status = asString(responseData?.status)?.toUpperCase();
    const executionOk = !status || ["SUCCESS", "SUCCEEDED", "PASS", "SIMULATED"].includes(status);
    const success = response.call.success && executionOk;
    const errorCode = success ? undefined : response.call.errorCode ?? ErrorCodes.TX_SIMULATION_FAILED;
    const evidenceHash = keccak256(toHex(canonicalJson({
      code: response.body.code ?? null,
      message: response.body.msg ?? null,
      data: responseData ?? null,
      errorCode: errorCode ?? null,
    })));
    return {
      attempted: true,
      success,
      payloadHash,
      simulatedAt,
      evidenceHash,
      latencyMs: response.call.latencyMs,
      upstreamCode: response.call.upstreamCode,
      errorCode,
      response: responseData,
    };
  }

  async transactionDetail(txHash: string): Promise<{ data: JsonObject[]; call: BinanceCall }> {
    if (!this.configured) return { data: [], call: callFailure("WALLET", "transactionDetail", "GET /api/v1/dex/post-transaction/transaction-detail-by-txhash", ErrorCodes.BINANCE_API_NOT_CONFIGURED) };
    const response = await this.request({
      module: "WALLET",
      operation: "transactionDetail",
      path: "/api/v1/dex/post-transaction/transaction-detail-by-txhash",
      query: { binanceChainId: BSC_CHAIN, txHash },
    });
    return { data: responseItems(response.body), call: response.call };
  }
}

export function binanceHealth(): { rwaConfigured: boolean; transactionConfigured: boolean; walletConfigured: boolean } {
  const configured = new BinanceWeb3Client().configured;
  return { rwaConfigured: configured, transactionConfigured: configured, walletConfigured: configured };
}

export function attachRwaContext<T extends { resultHash: string }>(report: T, context: RwaContext): T & { binanceWeb3: RwaContext } {
  return { ...report, binanceWeb3: context };
}

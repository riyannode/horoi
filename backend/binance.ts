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
  latencyMs?: number;
  upstreamCode?: string;
  errorCode?: string;
  response?: JsonObject;
};

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
  if (status === 401) return code === "40102" ? ErrorCodes.BINANCE_SIGNATURE_MISMATCH : ErrorCodes.BINANCE_AUTH_FAILED;
  if (status === 429) return ErrorCodes.BINANCE_RATE_LIMITED;
  if (status >= 500) return ErrorCodes.BINANCE_UPSTREAM_UNAVAILABLE;
  return code ? `BINANCE_UPSTREAM_${code}` : ErrorCodes.BINANCE_RESPONSE_INVALID;
}

function callFailure(module: string, operation: string, endpointId: string, errorCode: string): BinanceCall {
  return { module, operation, endpointId, success: false, latencyMs: 0, errorCode };
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
      items: responseItems(response.body).map((item) => ({
        ticker: asString(item.ticker),
        companyName: asString(item.companyName),
        platformId: asString(item.platformId),
        binanceChainId: asString(item.binanceChainId),
        tokenContractAddress: asString(item.tokenContractAddress),
        tokenSymbol: asString(item.tokenSymbol),
        tokenName: asString(item.tokenName),
        underlyingTicker: asString(item.underlyingTicker),
      })),
      call: response.call,
    };
  }

  async getRwaContext(assetQuery: string): Promise<RwaContext> {
    const calls: BinanceCall[] = [];
    if (!this.configured) {
      calls.push(callFailure("RWA_DATA", "context", "RWA_CONTEXT", ErrorCodes.BINANCE_API_NOT_CONFIGURED));
      const normalized = { assetQuery, selectedAsset: null, calls };
      return {
        capturedAt: Date.now(),
        contextHash: keccak256(toHex(canonicalJson(normalized))),
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
      underlying = responseObject(profile.body);

      const marketResponse = await this.request({
        module: "RWA_DATA",
        operation: "getRwaUnderlyingMarket",
        path: "/api/v1/dex/market/rwa/underlying-market",
        query: { tokenContractAddress: address },
      });
      calls.push(marketResponse.call);
      market = responseObject(marketResponse.body);
    }

    const normalized = {
      assetQuery,
      selectedAsset: selectedAsset ?? null,
      tokenPrice: tokenPrice ?? null,
      referencePrice: referencePrice ?? null,
      underlying: underlying ?? null,
      market: market ?? null,
      calls: calls.map(({ module, operation, endpointId, success, sourceTimestamp, upstreamCode, errorCode }) => ({
        module, operation, endpointId, success, sourceTimestamp: sourceTimestamp ?? null, upstreamCode: upstreamCode ?? null, errorCode: errorCode ?? null,
      })),
    };
    return {
      capturedAt: Date.now(),
      contextHash: keccak256(toHex(canonicalJson(normalized))),
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

  async simulatePublication(tx: { from: string; to: string; value: string; data: string }): Promise<PublicationSimulation> {
    const payloadHash = keccak256(toHex(canonicalJson(tx)));
    if (!this.configured) {
      return { attempted: false, success: false, payloadHash, errorCode: ErrorCodes.BINANCE_API_NOT_CONFIGURED };
    }
    const response = await this.request({
      module: "TRANSACTION",
      operation: "simulateTransaction",
      path: "/api/v1/dex/pre-transaction/simulate",
      method: "POST",
      body: { binanceChainId: BSC_CHAIN, evmTx: tx },
    });
    const responseData = responseObject(response.body);
    return {
      attempted: true,
      success: response.call.success && (asString(responseData?.status)?.toUpperCase() === "SUCCESS" || response.body.code === 0),
      payloadHash,
      latencyMs: response.call.latencyMs,
      upstreamCode: response.call.upstreamCode,
      errorCode: response.call.errorCode,
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

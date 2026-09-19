import type { RwaContext } from "./binance";

const BSC_CHAIN_ID = "56";
const CONTEXT_OPERATIONS = new Set([
  "getRwaTokenList",
  "getRwaUnderlyingInfo",
  "getRwaUnderlyingMarket",
]);

export function isRwaContextSufficient(context: RwaContext, requestedAsset: string): boolean {
  const selected = context.selectedAsset;
  const identityResolved = selected?.binanceChainId === BSC_CHAIN_ID
    && selected.tokenContractAddress?.toLowerCase() === requestedAsset.toLowerCase();
  const searchSucceeded = context.calls.some(
    (call) => call.operation === "searchRwaToken" && call.success,
  );
  const priceSucceeded = Boolean(context.tokenPrice && context.referencePrice)
    && context.calls.some(
      (call) => call.operation === "getRwaTokenPrice" && call.success,
    );
  const contextSucceeded = Boolean(context.underlying || context.market)
    && context.calls.some(
      (call) => CONTEXT_OPERATIONS.has(call.operation) && call.success,
    );

  return Boolean(identityResolved && searchSucceeded && priceSucceeded && contextSucceeded);
}

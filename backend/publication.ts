import { encodeFunctionData, getAddress, isAddress, type Address, type Hex } from "viem";
import { CHAIN_ID } from "./chain";
import { ErrorCodes, HoroiError } from "./errors";
import type { PublicationTransaction } from "./binance";

export const registryAbi = [{
  type: "function",
  name: "publish",
  stateMutability: "nonpayable",
  inputs: [
    { name: "asset", type: "address" },
    { name: "target", type: "address" },
    { name: "suiteHash", type: "bytes32" },
    { name: "resultHash", type: "bytes32" },
    { name: "blockNumber", type: "uint64" },
    { name: "status", type: "uint8" },
  ],
  outputs: [{ name: "reportId", type: "bytes32" }],
}] as const;

type PublishableReport = {
  status: string;
  chainId: number;
  asset: string;
  target: string;
  blockNumber: number;
  resultHash: string;
  suiteHash: string;
};

function address(value: string): Address {
  if (!isAddress(value, { strict: false })) throw new HoroiError(ErrorCodes.ADDRESS_INVALID, `invalid address: ${value}`);
  return getAddress(value);
}

function registryStatus(status: string): 1 | 2 | 3 {
  if (status === "PASS") return 1;
  if (status === "FAIL") return 2;
  if (status === "INCOMPLETE") return 3;
  throw new HoroiError(ErrorCodes.INPUT_INVALID, "ERROR reports cannot be published");
}

function hash(value: string, name: string): Hex {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new HoroiError(ErrorCodes.INPUT_INVALID, `${name} must be a bytes32 hex value`);
  }
  return value as Hex;
}

export function buildPublicationTransaction(
  report: PublishableReport,
  from: string,
  registry: string,
): PublicationTransaction {
  if (report.chainId !== CHAIN_ID) throw new HoroiError(ErrorCodes.CHAIN_MISMATCH, `publication requires chain ${CHAIN_ID}, got ${report.chainId}`);
  const publisher = address(from);
  const to = address(registry);
  const args = [
    address(report.asset),
    address(report.target),
    hash(report.suiteHash, "suiteHash"),
    hash(report.resultHash, "resultHash"),
    BigInt(report.blockNumber),
    registryStatus(report.status),
  ] as const;
  return {
    chainId: report.chainId,
    from: publisher,
    to,
    value: "0",
    data: encodeFunctionData({ abi: registryAbi, functionName: "publish", args }),
  };
}

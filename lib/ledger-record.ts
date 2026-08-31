const PAYLOAD_HASH_PATTERN = /^0x[0-9a-f]{64}$/;
const SOLANA_SIGNATURE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;
const MAX_MEMO_BYTES = 480;

export type LedgerRecordInput = {
  entityType: "donation" | "disbursement" | "confirmation" | "program_approval";
  entityId: string;
  scopeId: string;
  amountCentavos: number;
  payloadHash: string;
};

export function buildLedgerMemo(input: LedgerRecordInput) {
  if (!Number.isSafeInteger(input.amountCentavos) || input.amountCentavos < 0) {
    throw new Error("Ledger amounts must be non-negative integer centavos.");
  }
  if (!PAYLOAD_HASH_PATTERN.test(input.payloadHash)) {
    throw new Error("Invalid ledger payload hash.");
  }

  const memo = JSON.stringify({
    p: "trackaid-ledger",
    v: 1,
    t: input.entityType,
    id: input.entityId,
    scope: input.scopeId,
    phpCentavos: input.amountCentavos,
    currency: "PHP",
    funds: "offchain",
    hash: input.payloadHash.slice(2),
  });

  if (Buffer.byteLength(memo, "utf8") > MAX_MEMO_BYTES) {
    throw new Error("Ledger memo exceeds the safe on-chain size limit.");
  }
  return memo;
}

export function isSolanaLedgerSignature(value: string) {
  return SOLANA_SIGNATURE_PATTERN.test(value);
}

export function ledgerTransactionUrl(value: string) {
  if (isSolanaLedgerSignature(value)) {
    return `https://explorer.solana.com/tx/${value}?cluster=devnet`;
  }
  return null;
}

export function solanaAddressUrl(value: string) {
  return `https://explorer.solana.com/address/${encodeURIComponent(value)}?cluster=devnet`;
}

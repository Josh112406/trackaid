import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  keccak256,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygonAmoy } from "viem/chains";

import { trackAidLedgerAbi } from "@/lib/contracts/ledger-abi";
import { createAdminClient } from "@/lib/supabase/admin";

type LedgerJob = {
  id: string;
  entity_type:
    "donation" | "disbursement" | "confirmation" | "program_approval";
  entity_id: string;
  campaign_id: string | null;
  program_submission_id: string | null;
  amount_centavos: number;
  payload_hash: Hex;
  attempts: number;
};

const PRIVATE_KEY_PATTERN = /^0x[0-9a-fA-F]{64}$/;
const HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

function getLedgerConfiguration() {
  const rpcUrl = process.env.POLYGON_AMOY_RPC_URL;
  const contractAddress = process.env.TRACKAID_LEDGER_ADDRESS;
  const privateKey = process.env.TRACKAID_RECORDER_PRIVATE_KEY;

  if (
    !rpcUrl ||
    !contractAddress ||
    !isAddress(contractAddress) ||
    !privateKey ||
    !PRIVATE_KEY_PATTERN.test(privateKey)
  ) {
    return null;
  }

  return {
    rpcUrl,
    contractAddress: contractAddress as Address,
    privateKey: privateKey as Hex,
  };
}

function recordKind(entityType: LedgerJob["entity_type"]) {
  if (entityType === "donation") return 0;
  if (entityType === "disbursement") return 1;
  if (entityType === "confirmation") return 2;
  return 3;
}

function retryAt(attempts: number) {
  const delayMinutes = Math.min(2 ** Math.max(attempts, 0), 60);
  return new Date(Date.now() + delayMinutes * 60_000).toISOString();
}

export async function processLedgerJobs(limit = 5) {
  const admin = createAdminClient();
  const configuration = getLedgerConfiguration();
  if (!admin || !configuration) {
    return { processed: 0, configured: false };
  }

  const { data: jobs, error } = await admin
    .from("ledger_jobs")
    .select(
      "id,entity_type,entity_id,campaign_id,program_submission_id,amount_centavos,payload_hash,attempts",
    )
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 20)));

  if (error) throw error;

  const account = privateKeyToAccount(configuration.privateKey);
  const transport = http(configuration.rpcUrl);
  const walletClient = createWalletClient({
    account,
    chain: polygonAmoy,
    transport,
  });
  const publicClient = createPublicClient({ chain: polygonAmoy, transport });
  let processed = 0;

  for (const candidate of (jobs ?? []) as LedgerJob[]) {
    const { data: claimed } = await admin
      .from("ledger_jobs")
      .update({
        status: "processing",
        attempts: candidate.attempts + 1,
        last_error: null,
      })
      .eq("id", candidate.id)
      .in("status", ["pending", "failed"])
      .select("id")
      .maybeSingle();

    if (!claimed) continue;

    try {
      if (!HASH_PATTERN.test(candidate.payload_hash))
        throw new Error("Invalid ledger payload hash.");

      const transactionHash = await walletClient.writeContract({
        address: configuration.contractAddress,
        abi: trackAidLedgerAbi,
        functionName: "anchorRecord",
        args: [
          keccak256(toHex(`${candidate.entity_type}:${candidate.entity_id}`)),
          keccak256(
            toHex(
              candidate.campaign_id ??
                candidate.program_submission_id ??
                candidate.entity_id,
            ),
          ),
          recordKind(candidate.entity_type),
          BigInt(candidate.amount_centavos),
          candidate.payload_hash,
        ],
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: transactionHash,
      });
      if (receipt.status !== "success")
        throw new Error("Polygon rejected the audit transaction.");

      await admin
        .from("ledger_jobs")
        .update({
          status: "confirmed",
          tx_hash: transactionHash,
          last_error: null,
        })
        .eq("id", candidate.id);
      if (candidate.entity_type === "program_approval") {
        await admin.from("admin_audit_log").insert({
          action: "program_approval_anchor_confirmed",
          entity_type: "program_submission",
          entity_id: candidate.entity_id,
          detail: { transaction_hash: transactionHash },
        });
      } else {
        await admin
          .from("audit_entries")
          .update({ status: "confirmed", ledger_tx_hash: transactionHash })
          .eq("entity_id", candidate.entity_id);
      }
      processed += 1;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.slice(0, 500)
          : "Unknown ledger error";
      await admin
        .from("ledger_jobs")
        .update({
          status: "failed",
          last_error: message,
          next_attempt_at: retryAt(candidate.attempts + 1),
        })
        .eq("id", candidate.id);
    }
  }

  return { processed, configured: true };
}

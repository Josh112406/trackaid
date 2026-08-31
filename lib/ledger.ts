import "server-only";

import { getAddMemoInstruction } from "@solana-program/memo";
import {
  appendTransactionMessageInstruction,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  devnet,
  getSignatureFromTransaction,
  pipe,
  sendTransactionWithoutConfirmingFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signature,
  signTransactionMessageWithSigners,
  type RpcDevnet,
  type SolanaRpcApiDevnet,
} from "@solana/kit";

import { buildLedgerMemo, isSolanaLedgerSignature } from "@/lib/ledger-record";
import { createAdminClient } from "@/lib/supabase/admin";

type LedgerJob = {
  id: string;
  entity_type:
    "donation" | "disbursement" | "confirmation" | "program_approval";
  entity_id: string;
  campaign_id: string | null;
  program_submission_id: string | null;
  amount_centavos: number;
  payload_hash: string;
  attempts: number;
  tx_hash: string | null;
};

const DEFAULT_DEVNET_RPC_URL = "https://api.devnet.solana.com";

function retryAt(attempts: number) {
  const delayMinutes = Math.min(2 ** Math.max(attempts, 0), 60);
  return new Date(Date.now() + delayMinutes * 60_000).toISOString();
}

async function getLedgerConfiguration() {
  const encodedSecret = process.env.SOLANA_LEDGER_SECRET_KEY;
  if (!encodedSecret) return null;

  const rpcUrl = process.env.SOLANA_DEVNET_RPC_URL ?? DEFAULT_DEVNET_RPC_URL;
  if (/mainnet|testnet/i.test(rpcUrl)) {
    throw new Error("The ledger RPC must point to Solana Devnet.");
  }

  const secretBytes = Buffer.from(encodedSecret, "base64");
  if (secretBytes.byteLength !== 64) {
    throw new Error("The Solana ledger signer is not a valid 64-byte key.");
  }

  const signer = await createKeyPairSignerFromBytes(secretBytes);
  const configuredAddress = process.env.SOLANA_LEDGER_SIGNER_ADDRESS;
  if (configuredAddress && configuredAddress !== signer.address) {
    throw new Error(
      "The configured Solana signer address does not match its key.",
    );
  }

  return {
    rpc: createSolanaRpc(devnet(rpcUrl)),
    signer,
  };
}

async function transactionIsConfirmed(
  rpc: RpcDevnet<SolanaRpcApiDevnet>,
  transactionSignature: string,
) {
  if (!isSolanaLedgerSignature(transactionSignature)) return false;
  const { value } = await rpc
    .getSignatureStatuses([signature(transactionSignature)], {
      searchTransactionHistory: true,
    })
    .send();
  const status = value[0];
  if (!status) return false;
  if (status.err) throw new Error("Solana rejected the audit transaction.");
  return (
    status.confirmationStatus === "confirmed" ||
    status.confirmationStatus === "finalized"
  );
}

async function waitForConfirmation(
  rpc: RpcDevnet<SolanaRpcApiDevnet>,
  transactionSignature: string,
) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    if (await transactionIsConfirmed(rpc, transactionSignature)) return;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(
    "Solana confirmation timed out; the job will be checked again.",
  );
}

async function finalizeLedgerJob(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  candidate: LedgerJob,
  transactionSignature: string,
) {
  const { error: jobError } = await admin
    .from("ledger_jobs")
    .update({
      status: "confirmed",
      tx_hash: transactionSignature,
      last_error: null,
    })
    .eq("id", candidate.id);
  if (jobError) throw jobError;

  if (candidate.entity_type === "program_approval") {
    const { error } = await admin.from("admin_audit_log").insert({
      action: "program_approval_anchor_confirmed",
      entity_type: "program_submission",
      entity_id: candidate.entity_id,
      detail: {
        network: "solana-devnet",
        transaction_signature: transactionSignature,
      },
    });
    if (error) throw error;
  } else {
    const { error } = await admin
      .from("audit_entries")
      .update({
        status: "confirmed",
        ledger_tx_hash: transactionSignature,
      })
      .eq("entity_id", candidate.entity_id);
    if (error) throw error;
  }
}

export async function processLedgerJobs(limit = 5) {
  const admin = createAdminClient();
  const configuration = await getLedgerConfiguration();
  if (!admin || !configuration) {
    return { processed: 0, configured: false };
  }

  const { data: jobs, error } = await admin
    .from("ledger_jobs")
    .select(
      "id,entity_type,entity_id,campaign_id,program_submission_id,amount_centavos,payload_hash,attempts,tx_hash",
    )
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 20)));

  if (error) throw error;

  const sendTransaction = sendTransactionWithoutConfirmingFactory({
    rpc: configuration.rpc,
  });
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
      if (
        candidate.tx_hash &&
        (await transactionIsConfirmed(configuration.rpc, candidate.tx_hash))
      ) {
        await finalizeLedgerJob(admin, candidate, candidate.tx_hash);
        processed += 1;
        continue;
      }

      const memo = buildLedgerMemo({
        entityType: candidate.entity_type,
        entityId: candidate.entity_id,
        scopeId:
          candidate.campaign_id ??
          candidate.program_submission_id ??
          candidate.entity_id,
        amountCentavos: Number(candidate.amount_centavos),
        payloadHash: candidate.payload_hash,
      });
      const { value: latestBlockhash } = await configuration.rpc
        .getLatestBlockhash({ commitment: "confirmed" })
        .send();
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (message) =>
          setTransactionMessageFeePayerSigner(configuration.signer, message),
        (message) =>
          setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message),
        (message) =>
          appendTransactionMessageInstruction(
            getAddMemoInstruction({
              memo,
              signers: [configuration.signer],
            }),
            message,
          ),
      );
      const signedTransaction =
        await signTransactionMessageWithSigners(transactionMessage);
      const transactionSignature =
        getSignatureFromTransaction(signedTransaction);

      const { error: signatureError } = await admin
        .from("ledger_jobs")
        .update({ tx_hash: transactionSignature })
        .eq("id", candidate.id);
      if (signatureError) throw signatureError;

      await sendTransaction(signedTransaction, {
        commitment: "confirmed",
        skipPreflight: false,
      });
      await waitForConfirmation(configuration.rpc, transactionSignature);
      await finalizeLedgerJob(admin, candidate, transactionSignature);
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

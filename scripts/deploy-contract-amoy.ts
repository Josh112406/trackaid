import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  isAddress,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygonAmoy } from "viem/chains";

type ContractArtifact = {
  abi: readonly unknown[];
  evm: { bytecode: { object: string } };
};

const PRIVATE_KEY_PATTERN = /^0x[0-9a-fA-F]{64}$/;
const DEFAULT_RPC_URL = "https://polygon-amoy.drpc.org";

function configuredAddress(name: string, fallback: Address) {
  const value = process.env[name];
  if (!value) return fallback;
  if (!isAddress(value)) throw new Error(`${name} is not a valid address.`);
  return value;
}

async function main() {
  const privateKey = process.env.TRACKAID_RECORDER_PRIVATE_KEY;
  if (!privateKey || !PRIVATE_KEY_PATTERN.test(privateKey)) {
    throw new Error(
      "TRACKAID_RECORDER_PRIVATE_KEY must be a server-only 0x-prefixed 32-byte key.",
    );
  }

  const account = privateKeyToAccount(privateKey as Hex);
  const owner = configuredAddress(
    "TRACKAID_LEDGER_OWNER_ADDRESS",
    account.address,
  );
  const recorder = configuredAddress(
    "TRACKAID_LEDGER_RECORDER_ADDRESS",
    account.address,
  );
  const rpcUrl = process.env.POLYGON_AMOY_RPC_URL ?? DEFAULT_RPC_URL;
  const transport = http(rpcUrl);
  const publicClient = createPublicClient({ chain: polygonAmoy, transport });
  const chainId = await publicClient.getChainId();
  if (chainId !== polygonAmoy.id) {
    throw new Error(
      `Expected Polygon Amoy chain ${polygonAmoy.id}, received ${chainId}.`,
    );
  }

  const balance = await publicClient.getBalance({ address: account.address });
  if (balance === 0n) {
    throw new Error(
      `Recorder ${account.address} has no Amoy POL. Fund it from the Polygon faucet before deployment.`,
    );
  }

  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "TrackAidLedger.json",
  );
  const artifact = JSON.parse(
    await readFile(artifactPath, "utf8"),
  ) as ContractArtifact;
  const bytecode = `0x${artifact.evm.bytecode.object}` as Hex;
  if (bytecode === "0x")
    throw new Error("The contract artifact has no bytecode.");

  const walletClient = createWalletClient({
    account,
    chain: polygonAmoy,
    transport,
  });
  const transactionHash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode,
    args: [owner, recorder],
  });
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: transactionHash,
  });
  if (receipt.status !== "success" || !receipt.contractAddress) {
    throw new Error("Polygon Amoy rejected the contract deployment.");
  }

  console.log(`Deployer: ${account.address}`);
  console.log(`Starting balance: ${formatEther(balance)} POL`);
  console.log(`Owner: ${owner}`);
  console.log(`Recorder: ${recorder}`);
  console.log(
    `Transaction: https://amoy.polygonscan.com/tx/${transactionHash}`,
  );
  console.log(
    `Contract: https://amoy.polygonscan.com/address/${receipt.contractAddress}`,
  );
  console.log(`TRACKAID_LEDGER_ADDRESS=${receipt.contractAddress}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

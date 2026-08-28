import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import solc from "solc";

async function main() {
  const root = process.cwd();
  const contractPath = path.join(root, "contracts", "TrackAidLedger.sol");
  const source = await readFile(contractPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "TrackAidLedger.sol": { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input))) as {
    contracts?: Record<string, Record<string, unknown>>;
    errors?: Array<{ severity: string; formattedMessage: string }>;
  };

  const errors =
    output.errors?.filter((entry) => entry.severity === "error") ?? [];
  if (errors.length > 0) {
    throw new Error(errors.map((entry) => entry.formattedMessage).join("\n"));
  }

  const artifact = output.contracts?.["TrackAidLedger.sol"]?.TrackAidLedger;
  if (!artifact) throw new Error("TrackAidLedger artifact was not produced.");

  const artifactDirectory = path.join(root, "artifacts");
  await mkdir(artifactDirectory, { recursive: true });
  await writeFile(
    path.join(artifactDirectory, "TrackAidLedger.json"),
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );

  console.log("Compiled TrackAidLedger.sol to artifacts/TrackAidLedger.json");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

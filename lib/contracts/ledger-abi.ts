export const trackAidLedgerAbi = [
  {
    type: "function",
    name: "anchorRecord",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recordId", type: "bytes32" },
      { name: "campaignIdHash", type: "bytes32" },
      { name: "kind", type: "uint8" },
      { name: "amountCentavos", type: "uint256" },
      { name: "payloadHash", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

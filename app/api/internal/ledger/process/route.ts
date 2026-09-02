import { NextResponse } from "next/server";

import { processLedgerJobs } from "@/lib/ledger";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

async function handleLedgerProcessing(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processLedgerJobs();
  if (!result.configured) {
    return NextResponse.json(
      { error: "Ledger worker is not configured." },
      { status: 503 },
    );
  }

  return NextResponse.json(result);
}

export const POST = handleLedgerProcessing;

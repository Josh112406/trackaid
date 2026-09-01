"use client";

import { LoaderCircle, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { reconcilePendingPayments } from "@/app/admin/transactions/actions";

export function PaymentReconciliationButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function reconcile() {
    setBusy(true);
    setMessage("");
    const result = await reconcilePendingPayments();
    setMessage(result.message);
    if (result.ok) router.refresh();
    setBusy(false);
  }

  return (
    <div className="admin-inline-action">
      <button
        className="secondary-button"
        disabled={busy}
        onClick={reconcile}
        type="button"
      >
        {busy ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <RefreshCcw size={17} />
        )}
        Reconcile pending
      </button>
      {message ? <span role="status">{message}</span> : null}
    </div>
  );
}

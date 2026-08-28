"use client";

import { FormEvent, useState } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";

type Result = {
  kind: "idle" | "loading" | "ready" | "blocked";
  message?: string;
};

export function DonationReadiness({ campaignId }: { campaignId: string }) {
  const [amount, setAmount] = useState("500");
  const [result, setResult] = useState<Result>({ kind: "idle" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pesos = Number(amount);
    if (!Number.isFinite(pesos) || pesos < 100) {
      setResult({ kind: "blocked", message: "Enter at least PHP 100." });
      return;
    }

    setResult({ kind: "loading" });
    try {
      const response = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId,
          amountCentavos: Math.round(pesos * 100),
        }),
      });
      const payload = (await response.json()) as {
        message?: string;
        clientKey?: string;
      };

      if (!response.ok) {
        setResult({
          kind: "blocked",
          message:
            payload.message ??
            "Payment setup is not available in this demonstration.",
        });
        return;
      }

      setResult({
        kind: "ready",
        message: payload.clientKey
          ? "A test Payment Intent was created. A production checkout would now collect a PayMongo payment method."
          : "The server is ready for the next PayMongo step.",
      });
    } catch {
      setResult({
        kind: "blocked",
        message:
          "The payment readiness service could not be reached. Please try again.",
      });
    }
  }

  return (
    <form className="donation-panel" onSubmit={submit}>
      <span className="demo-label">Test-mode readiness check</span>
      <h2>Try the payment setup</h2>
      <p>
        This does not charge money. With test credentials configured, it creates
        a PayMongo Payment Intent on the server.
      </p>
      <label htmlFor="donation-amount">Amount in Philippine pesos</label>
      <div className="amount-field">
        <span aria-hidden="true">PHP</span>
        <input
          id="donation-amount"
          aria-describedby="donation-amount-help"
          inputMode="decimal"
          min="100"
          name="donationAmount"
          step="50"
          type="number"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </div>
      <span className="field-help" id="donation-amount-help">
        Minimum test amount: PHP 100
      </span>
      <button
        className="primary-button"
        disabled={result.kind === "loading"}
        type="submit"
      >
        {result.kind === "loading" ? (
          <LoaderCircle className="spin" size={18} />
        ) : null}
        Check payment readiness
      </button>
      {result.message ? (
        <p className={`form-message form-message-${result.kind}`} role="status">
          {result.kind === "blocked" ? (
            <CircleAlert size={18} aria-hidden="true" />
          ) : null}
          {result.message}
        </p>
      ) : null}
    </form>
  );
}

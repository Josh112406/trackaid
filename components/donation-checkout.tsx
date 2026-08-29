"use client";

import { FormEvent, useState } from "react";
import {
  ArrowUpRight,
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";

export function DonationCheckout({ campaignId }: { campaignId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(new FormData(event.currentTarget).get("amount"));
    setState("loading");
    setMessage("");
    try {
      const response = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId,
          amountCentavos: Math.round(amount * 100),
        }),
      });
      const payload = (await response.json()) as {
        checkoutUrl?: string;
        message?: string;
      };
      if (!response.ok || !payload.checkoutUrl)
        throw new Error(payload.message ?? "Checkout is unavailable.");
      window.location.assign(payload.checkoutUrl);
    } catch (caught) {
      setState("error");
      setMessage(
        caught instanceof Error ? caught.message : "Checkout is unavailable.",
      );
    }
  }
  return (
    <form className="donation-panel" onSubmit={submit}>
      <span className="eyebrow">Secure contribution</span>
      <h2>Donate through PayMongo</h2>
      <p>
        Choose an amount, then complete payment on PayMongo’s secure checkout
        page. Live proceeds route to the independently approved organization
        recipient; TrackAid records the exact PHP amount on Polygon without
        converting it to cryptocurrency.
      </p>
      <label>
        Amount in Philippine pesos
        <span className="money-input">
          <span>PHP</span>
          <input
            name="amount"
            type="number"
            min="100"
            max="500000"
            step="1"
            required
            placeholder="1,000"
          />
        </span>
      </label>
      <button
        className="primary-button"
        disabled={state === "loading"}
        type="submit"
      >
        {state === "loading" ? (
          <LoaderCircle className="spin" size={18} aria-hidden="true" />
        ) : (
          <ArrowUpRight size={18} aria-hidden="true" />
        )}
        {state === "loading"
          ? "Opening PayMongo…"
          : "Continue to secure checkout"}
      </button>
      <small className="checkout-security">
        <LockKeyhole size={14} aria-hidden="true" /> Payment details are entered
        on PayMongo and never stored by TrackAid.
      </small>
      {message ? (
        <p className="form-message form-message-blocked" role="alert">
          <CircleAlert size={17} aria-hidden="true" />
          {message}
        </p>
      ) : null}
    </form>
  );
}

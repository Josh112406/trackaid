"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { reviewProgram } from "@/app/admin/programs/actions";

export function ProgramReviewActions({
  id,
  status,
  isOwnSubmission,
  canApproveOwnSubmission,
}: {
  id: string;
  status: string;
  isOwnSubmission: boolean;
  canApproveOwnSubmission: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const usesOwnerOverride = isOwnSubmission && canApproveOwnSubmission;
  async function update(next: "approved" | "needs_information" | "rejected") {
    if (isOwnSubmission && next === "approved" && !canApproveOwnSubmission) {
      setMessage(
        "A different owner or reviewer must make the final decision on this submission.",
      );
      return;
    }
    setBusy(next);
    setMessage("");
    const result = await reviewProgram(id, next);
    setMessage(result.message);
    if (result.ok) {
      router.refresh();
    }
    setBusy(null);
  }
  return (
    <div className="review-actions">
      <button
        className="primary-button"
        disabled={!!busy || (isOwnSubmission && !canApproveOwnSubmission)}
        onClick={() => update("approved")}
        type="button"
      >
        {busy === "approved" ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <CheckCircle2 size={17} />
        )}
        {status === "approved" ? "Publish on website" : "Approve and publish"}
      </button>
      <button
        className="secondary-button"
        disabled={!!busy || status === "approved"}
        onClick={() => update("needs_information")}
        type="button"
      >
        <CircleAlert size={17} />
        Request information
      </button>
      <button
        className="text-button danger-button"
        disabled={!!busy || status === "approved" || isOwnSubmission}
        onClick={() => update("rejected")}
        type="button"
      >
        Reject
      </button>
      {usesOwnerOverride && status !== "approved" ? (
        <p className="review-policy-note">
          <ShieldCheck size={16} />
          This approval will be recorded as an owner override.
        </p>
      ) : null}
      {message ? (
        <p className="form-message form-message-neutral" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

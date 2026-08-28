"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function ProgramReviewActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  async function update(next: "approved" | "needs_information" | "rejected") {
    setBusy(next);
    setMessage("");
    const supabase = createBrowserSupabaseClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      setMessage("Your administrator session expired.");
      setBusy(null);
      return;
    }
    const values =
      next === "approved" || next === "rejected"
        ? {
            status: next,
            reviewed_by: user.user.id,
            reviewed_at: new Date().toISOString(),
          }
        : { status: next, reviewed_by: null, reviewed_at: null };
    const { error } = await supabase
      .from("program_submissions")
      .update(values)
      .eq("id", id);
    if (error) setMessage(error.message);
    else {
      setMessage(`Program marked ${next.replace("_", " ")}.`);
      router.refresh();
    }
    setBusy(null);
  }
  return (
    <div className="review-actions">
      <button
        className="primary-button"
        disabled={!!busy || status === "approved"}
        onClick={() => update("approved")}
        type="button"
      >
        {busy === "approved" ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <CheckCircle2 size={17} />
        )}
        Approve
      </button>
      <button
        className="secondary-button"
        disabled={!!busy}
        onClick={() => update("needs_information")}
        type="button"
      >
        <CircleAlert size={17} />
        Request information
      </button>
      <button
        className="text-button danger-button"
        disabled={!!busy}
        onClick={() => update("rejected")}
        type="button"
      >
        Reject
      </button>
      {message ? (
        <p className="form-message form-message-neutral" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

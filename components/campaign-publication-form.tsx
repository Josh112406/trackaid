"use client";

import Link from "next/link";
import { ArrowUpRight, LoaderCircle, Megaphone } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { publishProgramCampaign } from "@/app/admin/programs/actions";

export function CampaignPublicationForm({
  submissionId,
  programName,
  campaignSlug,
  campaignStatus,
}: {
  submissionId: string;
  programName: string;
  campaignSlug?: string;
  campaignStatus?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [publishedSlug, setPublishedSlug] = useState(campaignSlug);

  if (publishedSlug && campaignStatus === "draft") {
    return (
      <section className="admin-panel campaign-publication-card">
        <Megaphone size={22} />
        <div>
          <span className="eyebrow">Campaign removed</span>
          <h2>{programName}</h2>
          <p>
            This campaign is hidden from the public website. Use Restore to
            publish it again without losing its records.
          </p>
        </div>
      </section>
    );
  }

  if (publishedSlug) {
    return (
      <section className="admin-panel campaign-publication-card">
        <Megaphone size={22} />
        <div>
          <span className="eyebrow">Campaign published</span>
          <h2>{programName}</h2>
          <p>This program is listed on the public campaigns page.</p>
          <Link href={`/campaigns/${publishedSlug}`}>
            Open public campaign <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const result = await publishProgramCampaign({
      submissionId,
      disasterName: String(form.get("disasterName") ?? ""),
      targetBeneficiaries: String(form.get("targetBeneficiaries") ?? ""),
      fundingGoalPesos: String(form.get("fundingGoalPesos") ?? ""),
    });
    setMessage(result.message);
    if (result.ok && result.campaignSlug) {
      setPublishedSlug(result.campaignSlug);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <section className="admin-panel campaign-publication-card">
      <div className="campaign-publication-heading">
        <Megaphone size={22} />
        <div>
          <span className="eyebrow">Campaign publication</span>
          <h2>Finish the public listing</h2>
          <p>
            Approval confirms the proof. Add the funding details required to
            open this campaign for donations.
          </p>
        </div>
      </div>
      <form className="campaign-publication-form" onSubmit={submit}>
        <label>
          Cause or emergency name
          <input
            name="disasterName"
            required
            minLength={2}
            maxLength={180}
            placeholder="Typhoon recovery in Quezon"
          />
        </label>
        <label>
          Target beneficiaries
          <input
            name="targetBeneficiaries"
            required
            minLength={2}
            maxLength={500}
            placeholder="500 affected families"
          />
        </label>
        <label>
          Funding goal
          <span className="campaign-money-input">
            <span>PHP</span>
            <input
              name="fundingGoalPesos"
              required
              inputMode="decimal"
              pattern="[0-9]+(?:\.[0-9]{1,2})?"
              placeholder="2500000"
            />
          </span>
        </label>
        <button className="primary-button" disabled={busy} type="submit">
          {busy ? (
            <LoaderCircle className="spin" size={17} />
          ) : (
            <Megaphone size={17} />
          )}
          Publish campaign
        </button>
        {message ? (
          <p className="form-message form-message-neutral" role="status">
            {message}
          </p>
        ) : null}
      </form>
    </section>
  );
}

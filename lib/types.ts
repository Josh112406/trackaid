export type AuditStatus = "confirmed" | "submitted" | "pending";

export type AuditEvent = {
  id: string;
  type:
    | "donation"
    | "disbursement"
    | "beneficiary_confirmation"
    | "supplier_confirmation";
  title: string;
  detail: string;
  amountCentavos?: number;
  occurredAt: string;
  status: AuditStatus;
  ledgerTxHash?: string;
  evidenceHash?: string;
};

export type Campaign = {
  id: string;
  slug: string;
  title: string;
  disasterName: string;
  location: string;
  organization: string;
  summary: string;
  targetBeneficiaries: string;
  fundingGoalCentavos: number;
  receivedCentavos: number;
  disbursedCentavos: number;
  status: "published" | "closed";
  isDemonstration: boolean;
  events: AuditEvent[];
};

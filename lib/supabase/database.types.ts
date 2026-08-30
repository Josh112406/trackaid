export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string;
          actor_user_id: string | null;
          created_at: string;
          detail: Json;
          entity_id: string;
          entity_type: string;
          id: number;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          created_at?: string;
          detail?: Json;
          entity_id: string;
          entity_type: string;
          id?: never;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          created_at?: string;
          detail?: Json;
          entity_id?: string;
          entity_type?: string;
          id?: never;
        };
        Relationships: [];
      };
      analytics_events: {
        Row: {
          amount_centavos: number | null;
          campaign_id: string | null;
          event_kind: Database["public"]["Enums"]["analytics_event_kind"];
          external_source_id: string | null;
          id: number;
          metadata: Json;
          occurred_at: string;
          path: string;
          session_token_hash: string | null;
        };
        Insert: {
          amount_centavos?: number | null;
          campaign_id?: string | null;
          event_kind: Database["public"]["Enums"]["analytics_event_kind"];
          external_source_id?: string | null;
          id?: never;
          metadata?: Json;
          occurred_at?: string;
          path?: string;
          session_token_hash?: string | null;
        };
        Update: {
          amount_centavos?: number | null;
          campaign_id?: string | null;
          event_kind?: Database["public"]["Enums"]["analytics_event_kind"];
          external_source_id?: string | null;
          id?: never;
          metadata?: Json;
          occurred_at?: string;
          path?: string;
          session_token_hash?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "analytics_events_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analytics_events_external_source_id_fkey";
            columns: ["external_source_id"];
            isOneToOne: false;
            referencedRelation: "external_campaign_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      app_admins: {
        Row: {
          created_at: string;
          invited_by: string | null;
          role: Database["public"]["Enums"]["app_admin_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["app_admin_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["app_admin_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      audit_entries: {
        Row: {
          amount_centavos: number | null;
          campaign_id: string;
          created_at: string;
          entity_id: string;
          entity_type: Database["public"]["Enums"]["audit_event_type"];
          evidence_sha256: string | null;
          id: string;
          ledger_tx_hash: string | null;
          occurred_at: string;
          public_detail: string;
          status: Database["public"]["Enums"]["audit_event_status"];
          title: string;
        };
        Insert: {
          amount_centavos?: number | null;
          campaign_id: string;
          created_at?: string;
          entity_id: string;
          entity_type: Database["public"]["Enums"]["audit_event_type"];
          evidence_sha256?: string | null;
          id?: string;
          ledger_tx_hash?: string | null;
          occurred_at: string;
          public_detail: string;
          status?: Database["public"]["Enums"]["audit_event_status"];
          title: string;
        };
        Update: {
          amount_centavos?: number | null;
          campaign_id?: string;
          created_at?: string;
          entity_id?: string;
          entity_type?: Database["public"]["Enums"]["audit_event_type"];
          evidence_sha256?: string | null;
          id?: string;
          ledger_tx_hash?: string | null;
          occurred_at?: string;
          public_detail?: string;
          status?: Database["public"]["Enums"]["audit_event_status"];
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_entries_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      campaigns: {
        Row: {
          closes_at: string | null;
          created_at: string;
          disaster_name: string;
          disbursed_centavos: number;
          funding_goal_centavos: number;
          id: string;
          is_demonstration: boolean;
          location: string;
          net_received_centavos: number;
          organization_id: string;
          processing_fee_centavos: number;
          published_at: string | null;
          received_centavos: number;
          slug: string;
          status: Database["public"]["Enums"]["campaign_status"];
          summary: string;
          target_beneficiaries: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          closes_at?: string | null;
          created_at?: string;
          disaster_name: string;
          disbursed_centavos?: number;
          funding_goal_centavos: number;
          id?: string;
          is_demonstration?: boolean;
          location: string;
          net_received_centavos?: number;
          organization_id: string;
          processing_fee_centavos?: number;
          published_at?: string | null;
          received_centavos?: number;
          slug: string;
          status?: Database["public"]["Enums"]["campaign_status"];
          summary: string;
          target_beneficiaries: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          closes_at?: string | null;
          created_at?: string;
          disaster_name?: string;
          disbursed_centavos?: number;
          funding_goal_centavos?: number;
          id?: string;
          is_demonstration?: boolean;
          location?: string;
          net_received_centavos?: number;
          organization_id?: string;
          processing_fee_centavos?: number;
          published_at?: string | null;
          received_centavos?: number;
          slug?: string;
          status?: Database["public"]["Enums"]["campaign_status"];
          summary?: string;
          target_beneficiaries?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      confirmations: {
        Row: {
          campaign_id: string;
          confirmed_at: string | null;
          disbursement_id: string;
          evidence_object_path: string | null;
          evidence_sha256: string | null;
          id: string;
          kind: Database["public"]["Enums"]["confirmation_kind"];
          public_note: string;
          status: Database["public"]["Enums"]["confirmation_status"];
          submitted_at: string;
          submitted_by: string | null;
        };
        Insert: {
          campaign_id: string;
          confirmed_at?: string | null;
          disbursement_id: string;
          evidence_object_path?: string | null;
          evidence_sha256?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["confirmation_kind"];
          public_note?: string;
          status?: Database["public"]["Enums"]["confirmation_status"];
          submitted_at?: string;
          submitted_by?: string | null;
        };
        Update: {
          campaign_id?: string;
          confirmed_at?: string | null;
          disbursement_id?: string;
          evidence_object_path?: string | null;
          evidence_sha256?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["confirmation_kind"];
          public_note?: string;
          status?: Database["public"]["Enums"]["confirmation_status"];
          submitted_at?: string;
          submitted_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "confirmations_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "confirmations_disbursement_id_fkey";
            columns: ["disbursement_id"];
            isOneToOne: false;
            referencedRelation: "disbursements";
            referencedColumns: ["id"];
          },
        ];
      };
      disbursements: {
        Row: {
          amount_centavos: number;
          campaign_id: string;
          confirmed_at: string | null;
          created_at: string;
          created_by: string;
          evidence_object_path: string;
          evidence_sha256: string;
          id: string;
          occurred_at: string;
          purpose: string;
          status: Database["public"]["Enums"]["disbursement_status"];
          supplier_name: string | null;
          updated_at: string;
        };
        Insert: {
          amount_centavos: number;
          campaign_id: string;
          confirmed_at?: string | null;
          created_at?: string;
          created_by: string;
          evidence_object_path: string;
          evidence_sha256: string;
          id?: string;
          occurred_at: string;
          purpose: string;
          status?: Database["public"]["Enums"]["disbursement_status"];
          supplier_name?: string | null;
          updated_at?: string;
        };
        Update: {
          amount_centavos?: number;
          campaign_id?: string;
          confirmed_at?: string | null;
          created_at?: string;
          created_by?: string;
          evidence_object_path?: string;
          evidence_sha256?: string;
          id?: string;
          occurred_at?: string;
          purpose?: string;
          status?: Database["public"]["Enums"]["disbursement_status"];
          supplier_name?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "disbursements_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      donations: {
        Row: {
          amount_centavos: number;
          campaign_id: string;
          created_at: string;
          currency: string;
          donor_user_id: string | null;
          fee_centavos: number;
          id: string;
          livemode: boolean | null;
          net_amount_centavos: number;
          paid_at: string | null;
          payment_method_type: string | null;
          paymongo_checkout_session_id: string | null;
          paymongo_event_id: string | null;
          paymongo_payment_id: string | null;
          paymongo_payment_intent_id: string | null;
          status: Database["public"]["Enums"]["donation_status"];
          updated_at: string;
        };
        Insert: {
          amount_centavos: number;
          campaign_id: string;
          created_at?: string;
          currency?: string;
          donor_user_id?: string | null;
          fee_centavos?: number;
          id: string;
          livemode?: boolean | null;
          net_amount_centavos?: number;
          paid_at?: string | null;
          payment_method_type?: string | null;
          paymongo_checkout_session_id?: string | null;
          paymongo_event_id?: string | null;
          paymongo_payment_id?: string | null;
          paymongo_payment_intent_id?: string | null;
          status?: Database["public"]["Enums"]["donation_status"];
          updated_at?: string;
        };
        Update: {
          amount_centavos?: number;
          campaign_id?: string;
          created_at?: string;
          currency?: string;
          donor_user_id?: string | null;
          fee_centavos?: number;
          id?: string;
          livemode?: boolean | null;
          net_amount_centavos?: number;
          paid_at?: string | null;
          payment_method_type?: string | null;
          paymongo_checkout_session_id?: string | null;
          paymongo_event_id?: string | null;
          paymongo_payment_id?: string | null;
          paymongo_payment_intent_id?: string | null;
          status?: Database["public"]["Enums"]["donation_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "donations_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      external_campaign_sources: {
        Row: {
          consecutive_failures: number;
          created_at: string;
          donation_url: string;
          id: string;
          is_visible: boolean;
          last_checked_at: string;
          last_success_at: string;
          location: string;
          official_source_url: string;
          organization_name: string;
          slug: string;
          source_domain: string;
          source_health: Database["public"]["Enums"]["source_health"];
          summary: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          consecutive_failures?: number;
          created_at?: string;
          donation_url: string;
          id?: string;
          is_visible?: boolean;
          last_checked_at?: string;
          last_success_at?: string;
          location?: string;
          official_source_url: string;
          organization_name: string;
          slug: string;
          source_domain: string;
          source_health?: Database["public"]["Enums"]["source_health"];
          summary: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          consecutive_failures?: number;
          created_at?: string;
          donation_url?: string;
          id?: string;
          is_visible?: boolean;
          last_checked_at?: string;
          last_success_at?: string;
          location?: string;
          official_source_url?: string;
          organization_name?: string;
          slug?: string;
          source_domain?: string;
          source_health?: Database["public"]["Enums"]["source_health"];
          summary?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ledger_jobs: {
        Row: {
          amount_centavos: number;
          attempts: number;
          campaign_id: string | null;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          last_error: string | null;
          next_attempt_at: string;
          payload_hash: string;
          program_submission_id: string | null;
          status: Database["public"]["Enums"]["ledger_job_status"];
          tx_hash: string | null;
          updated_at: string;
        };
        Insert: {
          amount_centavos?: number;
          attempts?: number;
          campaign_id?: string | null;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          last_error?: string | null;
          next_attempt_at?: string;
          payload_hash: string;
          program_submission_id?: string | null;
          status?: Database["public"]["Enums"]["ledger_job_status"];
          tx_hash?: string | null;
          updated_at?: string;
        };
        Update: {
          amount_centavos?: number;
          attempts?: number;
          campaign_id?: string | null;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          last_error?: string | null;
          next_attempt_at?: string;
          payload_hash?: string;
          program_submission_id?: string | null;
          status?: Database["public"]["Enums"]["ledger_job_status"];
          tx_hash?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ledger_jobs_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ledger_jobs_program_submission_id_fkey";
            columns: ["program_submission_id"];
            isOneToOne: false;
            referencedRelation: "program_submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_members: {
        Row: {
          created_at: string;
          organization_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          organization_id: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          organization_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_verification_submissions: {
        Row: {
          created_at: string;
          id: string;
          official_email: string;
          organization_id: string;
          permit_mime_type: string;
          permit_object_path: string;
          permit_original_name: string;
          permit_sha256: string;
          permit_size_bytes: number;
          review_reason: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          settlement_account_holder: string;
          status: Database["public"]["Enums"]["submission_status"];
          submitted_at: string;
          submitted_by: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          official_email: string;
          organization_id: string;
          permit_mime_type: string;
          permit_object_path: string;
          permit_original_name: string;
          permit_sha256: string;
          permit_size_bytes: number;
          review_reason?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          settlement_account_holder: string;
          status?: Database["public"]["Enums"]["submission_status"];
          submitted_at?: string;
          submitted_by: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          official_email?: string;
          organization_id?: string;
          permit_mime_type?: string;
          permit_object_path?: string;
          permit_original_name?: string;
          permit_sha256?: string;
          permit_size_bytes?: number;
          review_reason?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          settlement_account_holder?: string;
          status?: Database["public"]["Enums"]["submission_status"];
          submitted_at?: string;
          submitted_by?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_verification_submissions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_payment_destinations: {
        Row: {
          created_at: string;
          organization_id: string;
          paymongo_merchant_id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          submitted_by: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          organization_id: string;
          paymongo_merchant_id: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          submitted_by: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          organization_id?: string;
          paymongo_merchant_id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          submitted_by?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_payment_destinations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          name: string;
          owner_user_id: string;
          slug: string;
          status: Database["public"]["Enums"]["organization_status"];
          updated_at: string;
          verified_at: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string;
          id?: string;
          name: string;
          owner_user_id: string;
          slug: string;
          status?: Database["public"]["Enums"]["organization_status"];
          updated_at?: string;
          verified_at?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          owner_user_id?: string;
          slug?: string;
          status?: Database["public"]["Enums"]["organization_status"];
          updated_at?: string;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      program_proofs: {
        Row: {
          created_at: string;
          id: string;
          is_identity_proof: boolean;
          kind: Database["public"]["Enums"]["proof_kind"];
          label: string;
          private_object_path: string | null;
          public_url: string | null;
          sha256: string;
          submission_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_identity_proof?: boolean;
          kind: Database["public"]["Enums"]["proof_kind"];
          label: string;
          private_object_path?: string | null;
          public_url?: string | null;
          sha256: string;
          submission_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_identity_proof?: boolean;
          kind?: Database["public"]["Enums"]["proof_kind"];
          label?: string;
          private_object_path?: string | null;
          public_url?: string | null;
          sha256?: string;
          submission_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "program_proofs_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "program_submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      program_submissions: {
        Row: {
          created_at: string;
          id: string;
          location: string;
          official_domain: string | null;
          organization_name: string;
          program_name: string;
          proof_expires_at: string | null;
          public_source_url: string;
          review_reason: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["submission_status"];
          submitted_at: string | null;
          submitted_by: string;
          summary: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          location: string;
          official_domain?: string | null;
          organization_name: string;
          program_name: string;
          proof_expires_at?: string | null;
          public_source_url: string;
          review_reason?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["submission_status"];
          submitted_at?: string | null;
          submitted_by: string;
          summary: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          location?: string;
          official_domain?: string | null;
          organization_name?: string;
          program_name?: string;
          proof_expires_at?: string | null;
          public_source_url?: string;
          review_reason?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["submission_status"];
          submitted_at?: string | null;
          submitted_by?: string;
          summary?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      source_check_logs: {
        Row: {
          checked_at: string;
          checked_url: string;
          detail: string;
          donation_cta_found: boolean;
          id: number;
          source_id: string;
          status_code: number | null;
        };
        Insert: {
          checked_at?: string;
          checked_url: string;
          detail?: string;
          donation_cta_found: boolean;
          id?: never;
          source_id: string;
          status_code?: number | null;
        };
        Update: {
          checked_at?: string;
          checked_url?: string;
          detail?: string;
          donation_cta_found?: boolean;
          id?: never;
          source_id?: string;
          status_code?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "source_check_logs_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "external_campaign_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      webhook_events: {
        Row: {
          event_type: string;
          id: string;
          payload_sha256: string;
          processed_at: string | null;
          processing_error: string | null;
          received_at: string;
          status: Database["public"]["Enums"]["webhook_status"];
        };
        Insert: {
          event_type: string;
          id: string;
          payload_sha256: string;
          processed_at?: string | null;
          processing_error?: string | null;
          received_at?: string;
          status?: Database["public"]["Enums"]["webhook_status"];
        };
        Update: {
          event_type?: string;
          id?: string;
          payload_sha256?: string;
          processed_at?: string | null;
          processing_error?: string | null;
          received_at?: string;
          status?: Database["public"]["Enums"]["webhook_status"];
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      consume_security_rate_limit: {
        Args: {
          p_key_hash: string;
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      verify_source_monitor_secret: {
        Args: { candidate: string };
        Returns: boolean;
      };
    };
    Enums: {
      analytics_event_kind:
        | "page_view"
        | "campaign_view"
        | "external_redirect"
        | "submission_created"
        | "submission_approved"
        | "payment_intent_created"
        | "payment_paid"
        | "payment_failed"
        | "payment_refunded"
        | "disbursement_confirmed"
        | "ledger_confirmed";
      app_admin_role: "owner" | "reviewer" | "auditor";
      audit_event_status: "confirmed" | "submitted" | "pending";
      audit_event_type:
        | "donation"
        | "disbursement"
        | "beneficiary_confirmation"
        | "supplier_confirmation";
      campaign_status: "draft" | "published" | "closed";
      confirmation_kind: "beneficiary" | "supplier";
      confirmation_status: "submitted" | "confirmed" | "disputed";
      disbursement_status: "submitted" | "confirmed" | "rejected";
      donation_status: "pending" | "paid" | "failed" | "refunded";
      ledger_job_status: "pending" | "processing" | "confirmed" | "failed";
      organization_status: "pending" | "verified" | "suspended";
      proof_kind:
        | "public_website"
        | "social_post"
        | "pubmat"
        | "video"
        | "news_coverage"
        | "registration"
        | "representative_authorization"
        | "payout_account"
        | "budget"
        | "beneficiary_plan"
        | "other";
      source_health: "healthy" | "warning" | "unavailable";
      submission_status:
        | "draft"
        | "submitted"
        | "needs_information"
        | "approved"
        | "rejected"
        | "suspended"
        | "expired";
      webhook_status: "received" | "processed" | "ignored" | "failed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      analytics_event_kind: [
        "page_view",
        "campaign_view",
        "external_redirect",
        "submission_created",
        "submission_approved",
        "payment_intent_created",
        "payment_paid",
        "payment_failed",
        "payment_refunded",
        "disbursement_confirmed",
        "ledger_confirmed",
      ],
      app_admin_role: ["owner", "reviewer", "auditor"],
      audit_event_status: ["confirmed", "submitted", "pending"],
      audit_event_type: [
        "donation",
        "disbursement",
        "beneficiary_confirmation",
        "supplier_confirmation",
      ],
      campaign_status: ["draft", "published", "closed"],
      confirmation_kind: ["beneficiary", "supplier"],
      confirmation_status: ["submitted", "confirmed", "disputed"],
      disbursement_status: ["submitted", "confirmed", "rejected"],
      donation_status: ["pending", "paid", "failed", "refunded"],
      ledger_job_status: ["pending", "processing", "confirmed", "failed"],
      organization_status: ["pending", "verified", "suspended"],
      proof_kind: [
        "public_website",
        "social_post",
        "pubmat",
        "video",
        "news_coverage",
        "registration",
        "representative_authorization",
        "payout_account",
        "budget",
        "beneficiary_plan",
        "other",
      ],
      source_health: ["healthy", "warning", "unavailable"],
      submission_status: [
        "draft",
        "submitted",
        "needs_information",
        "approved",
        "rejected",
        "suspended",
        "expired",
      ],
      webhook_status: ["received", "processed", "ignored", "failed"],
    },
  },
} as const;

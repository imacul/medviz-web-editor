export const OPS_LEAD_STAGES = [
  'sourced',
  'contacted',
  'replied',
  'qualified',
  'pilot',
  'won',
  'lost',
] as const;

export type OpsLeadStage = (typeof OPS_LEAD_STAGES)[number];

export const OPS_CONTACT_ROUTE_IDS = [
  'email',
  'linkedin',
  'phone',
  'website_form',
  'x_dm',
  'whatsapp',
  'referral',
] as const;

export type OpsContactRouteId = (typeof OPS_CONTACT_ROUTE_IDS)[number];

export interface OpsLead {
  id: string;
  owner_user_id: string;
  account_name: string;
  contact_name: string;
  reason_fit: string | null;
  contact_email: string | null;
  contact_route: string | null;
  segment: string | null;
  stage: OpsLeadStage;
  priority: number;
  source_url: string | null;
  next_action: string | null;
  notes: string | null;
  last_outreach_at: string | null;
  last_reply_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachBatchRow {
  email: string;
  subject: string;
  body: string;
  reply_to?: string;
}

export interface OutreachBatchFile {
  fileName: string;
  modifiedAt: string;
  sizeBytes: number;
  rowCount: number;
  rows: OutreachBatchRow[];
}

export interface CreateOpsLeadInput {
  account_name: string;
  contact_name: string;
  reason_fit?: string | null;
  contact_email?: string | null;
  contact_route?: string | null;
  segment?: string | null;
  stage?: OpsLeadStage;
  priority?: number;
  source_url?: string | null;
  next_action?: string | null;
  notes?: string | null;
}

export interface UpdateOpsLeadInput {
  account_name?: string;
  contact_name?: string;
  reason_fit?: string | null;
  contact_email?: string | null;
  contact_route?: string | null;
  segment?: string | null;
  stage?: OpsLeadStage;
  priority?: number;
  source_url?: string | null;
  next_action?: string | null;
  notes?: string | null;
  last_outreach_at?: string | null;
  last_reply_at?: string | null;
}

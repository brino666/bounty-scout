/**
 * Types for the HackerOne Scout API.
 * Hand-maintained to mirror workspace-api-spec/openapi.yaml's bounty paths.
 */

export interface ErrorResponse {
  error: string;
}

export interface OkResult {
  ok: boolean;
}

export type ProbeItemPriority = typeof ProbeItemPriority[keyof typeof ProbeItemPriority];

export const ProbeItemPriority = {
  high: 'high',
  medium: 'medium',
  low: 'low',
} as const;

export interface ProbeItem {
  title: string;
  category: string;
  priority?: ProbeItemPriority;
  rationale: string;
  steps: string[];
}

export type ProgramPlatform = typeof ProgramPlatform[keyof typeof ProgramPlatform];

export const ProgramPlatform = {
  hackerone: 'hackerone',
  bugcrowd: 'bugcrowd',
  intigriti: 'intigriti',
  other: 'other',
} as const;

export type ProgramTechSignals = { [key: string]: unknown };

export type ProgramStatus = typeof ProgramStatus[keyof typeof ProgramStatus];

export const ProgramStatus = {
  pending_approval: 'pending_approval',
  analysing: 'analysing',
  active: 'active',
  failed: 'failed',
  archived: 'archived',
} as const;

export interface Program {
  id: number;
  slug: string;
  platform: ProgramPlatform;
  name: string;
  url: string;
  max_reward_usd: number;
  scope_assets: string[];
  out_of_scope: string[];
  tech_signals?: ProgramTechSignals;
  disclosed_count: number;
  probe_guide: ProbeItem[];
  status: ProgramStatus;
  added_at: string;
  /** @nullable */
  analysed_at?: string | null;
}

export interface ProgramInput {
  /** @minLength 1 */
  url: string;
}

export type ReportSeverity = typeof ReportSeverity[keyof typeof ReportSeverity];

export const ReportSeverity = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  info: 'info',
} as const;

export interface Report {
  title: string;
  severity: ReportSeverity;
  cvss_estimate: string;
  vuln_type: string;
  affected_asset: string;
  description: string;
  impact: string;
  poc_steps: string[];
  fix_recommendation: string;
}

export type FindingStatus = typeof FindingStatus[keyof typeof FindingStatus];

export const FindingStatus = {
  drafting: 'drafting',
  draft: 'draft',
  submitted: 'submitted',
  triaged: 'triaged',
  needs_info: 'needs_info',
  accepted: 'accepted',
  duplicate: 'duplicate',
  paid: 'paid',
} as const;

export interface Finding {
  id: number;
  slug: string;
  program_id: number;
  /** @nullable */
  probe_item_ref?: string | null;
  vuln_description: string;
  draft_report: Report;
  status: FindingStatus;
  /** @nullable */
  submitted_at?: string | null;
  /** @nullable */
  triaged_at?: string | null;
  /** @nullable */
  resolved_at?: string | null;
  /** @nullable */
  payout_usd?: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface FindingInput {
  program_id: number;
  /** @minLength 1 */
  vuln_description: string;
  probe_item_ref?: string;
}

export type FindingUpdateStatus = typeof FindingUpdateStatus[keyof typeof FindingUpdateStatus];

export const FindingUpdateStatus = {
  draft: 'draft',
  submitted: 'submitted',
  triaged: 'triaged',
  needs_info: 'needs_info',
  accepted: 'accepted',
  duplicate: 'duplicate',
  paid: 'paid',
} as const;

export interface FindingUpdate {
  status?: FindingUpdateStatus;
  notes?: string;
  payout_usd?: number;
}

export type BountyStatsFindingsByStatus = { [key: string]: number };

export interface BountyStats {
  total_programs: number;
  total_paid_usd: number;
  findings_by_status: BountyStatsFindingsByStatus;
}

export interface AnalyseStatus {
  running: boolean;
  /** @nullable */
  program_id?: number | null;
  log?: string;
  /** @nullable */
  finished_at?: string | null;
}

export interface DraftStatus {
  running: boolean;
  /** @nullable */
  finding_id?: number | null;
  log?: string;
}

export interface ScoutStatus {
  /** Whether HackerOne credentials are configured */
  enabled: boolean;
  running: boolean;
  /** @nullable */
  last_run_at?: string | null;
  last_found_count?: number;
}

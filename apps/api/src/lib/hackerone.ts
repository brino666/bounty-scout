// hackerone.ts — thin client for the HackerOne Hacker API v1.
//
// Auth: HTTP Basic, username = API identifier, password = API token.
// Both come from HackerOne → Settings → API Token, and are supplied via
// env vars H1_API_USERNAME / H1_API_TOKEN (same credentials bug-bounty-scout's
// Python recon.py already uses for /v1/programs/{slug}).
//
// Every call here is read-only except submitReport, which posts a real
// disclosure to a live program — it is never called automatically.

import { logger } from "./logger.js";

const BASE = "https://api.hackerone.com/v1";

export function hasH1Credentials(): boolean {
  return !!(process.env.H1_API_USERNAME && process.env.H1_API_TOKEN);
}

function authHeader(): string {
  const user = process.env.H1_API_USERNAME ?? "";
  const token = process.env.H1_API_TOKEN ?? "";
  return "Basic " + Buffer.from(`${user}:${token}`).toString("base64");
}

async function h1Fetch(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HackerOne API ${res.status} on ${path}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

export interface H1ProgramSummary {
  handle: string;
  name: string;
  url: string;
  offersBounties: boolean;
  submissionState: string;
}

/**
 * List programs the authenticated hacker can currently see, filtered to
 * ones actually open for report submission — never returns paused/closed
 * programs, so nothing gets tracked that can't legally be reported to.
 */
export async function listOpenPrograms(): Promise<H1ProgramSummary[]> {
  const results: H1ProgramSummary[] = [];
  let url = `/hackers/programs?page[size]=100`;
  let rawTotal = 0;
  let loggedSample = false;

  while (url) {
    const page = await h1Fetch(url);
    const items = page.data ?? [];
    rawTotal += items.length;

    if (!loggedSample && items.length > 0) {
      // One-time diagnostic: log the real shape HackerOne actually returns,
      // since filtering below depends on guessing the right attribute names.
      logger.info({ sampleAttributes: items[0].attributes }, "HackerOne program sample (diagnostic)");
      loggedSample = true;
    }

    for (const item of items) {
      const attrs = item.attributes ?? {};
      // HackerOne's field for "currently accepting reports" — try the
      // documented name first, fall back to alternates seen in the wild.
      const submissionState = attrs.submission_state ?? attrs.state;
      if (submissionState !== "open" && submissionState !== "public_mode") continue;
      results.push({
        handle: attrs.handle,
        name: attrs.name ?? attrs.handle,
        url: `https://hackerone.com/${attrs.handle}`,
        offersBounties: !!attrs.offers_bounties,
        submissionState: submissionState ?? "unknown",
      });
    }
    url = page.links?.next ? page.links.next.replace(BASE, "") : "";
  }

  logger.info({ rawTotal, filtered: results.length }, "HackerOne program scan: raw vs filtered count");
  return results;
}

export interface H1ProgramScope {
  scopeAssets: string[];
  outOfScope: string[];
  maxRewardUsd: number;
}

/** Real in-scope/out-of-scope assets for one program, straight from HackerOne. */
export async function getProgramScope(handle: string): Promise<H1ProgramScope> {
  const data = await h1Fetch(`/programs/${handle}`);
  const included: any[] = data.included ?? [];
  const scopeAssets: string[] = [];
  const outOfScope: string[] = [];

  for (const item of included) {
    if (item.type !== "structured-scope") continue;
    const a = item.attributes ?? {};
    const target = a.asset_identifier ?? "";
    if (!target) continue;
    if (a.eligible_for_submission === false) outOfScope.push(target);
    else scopeAssets.push(target);
  }

  const attrs = data.data?.attributes ?? {};
  const maxRewardUsd = Number(attrs.offered_rewards?.high ?? attrs.bounty_high_range ?? 0);

  return { scopeAssets, outOfScope, maxRewardUsd };
}

export interface H1SubmitReportInput {
  teamHandle: string;
  title: string;
  vulnerabilityInformation: string;
  impact: string;
  severityRating: "none" | "low" | "medium" | "high" | "critical";
  weaknessId?: number;
}

/** Submits a real report to a live HackerOne program. Never call this without explicit user confirmation. */
export async function submitReport(input: H1SubmitReportInput): Promise<{ id: string; url: string }> {
  const body = {
    data: {
      type: "report",
      attributes: {
        team_handle: input.teamHandle,
        title: input.title,
        vulnerability_information: input.vulnerabilityInformation,
        impact: input.impact,
        severity_rating: input.severityRating,
        ...(input.weaknessId ? { weakness_id: input.weaknessId } : {}),
      },
    },
  };
  const res = await h1Fetch(`/hackers/reports`, { method: "POST", body: JSON.stringify(body) });
  const id = res.data?.id;
  return { id, url: `https://hackerone.com/reports/${id}` };
}

export interface H1ReportStatus {
  id: string;
  state: string;
  title: string;
  bountyAwardedAmount: number | null;
}

/** Current state of one of your own submitted reports. */
export async function getReportStatus(reportId: string): Promise<H1ReportStatus> {
  const data = await h1Fetch(`/reports/${reportId}`);
  const attrs = data.data?.attributes ?? {};
  return {
    id: data.data?.id,
    state: attrs.state ?? "unknown",
    title: attrs.title ?? "",
    bountyAwardedAmount: attrs.bounty_awarded_amount ?? null,
  };
}

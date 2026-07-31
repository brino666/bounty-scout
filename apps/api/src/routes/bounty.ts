import { Router } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { Anthropic } from "@anthropic-ai/sdk";
import { db, bountyProgramsTable, bountyFindingsTable, FINDING_TRANSITIONS } from "@bounty-scout/db";
import { z } from "zod";
import { hasH1Credentials, listOpenPrograms, getProgramScope } from "../lib/hackerone";
import { logger } from "../lib/logger";

const router = Router();
const anthropic = new Anthropic();

// ---------------------------------------------------------------------------
// In-process job trackers (one analysis / one draft at a time)
// ---------------------------------------------------------------------------

let activeAnalyse: { programId: number; log: string } | null = null;
let analyseLastFinishedAt: Date | null = null;
let activeDraft: { findingId: number; log: string } | null = null;
let scoutRunning = false;
let scoutLastRunAt: Date | null = null;
let scoutLastFoundCount = 0;

// ---------------------------------------------------------------------------
// Zod request schemas
// ---------------------------------------------------------------------------

const ProgramInputBody = z.object({
  url: z.string().min(1),
});

const FindingInputBody = z.object({
  program_id:      z.number().int().positive(),
  vuln_description: z.string().min(1),
  probe_item_ref:  z.string().optional(),
});

const FindingUpdateBody = z.object({
  status:    z.enum(["draft","submitted","triaged","needs_info","accepted","duplicate","paid"]).optional(),
  notes:     z.string().optional(),
  payout_usd: z.number().nonnegative().optional(),
});

const IntId = z.object({ id: z.number().int().positive() });

// ---------------------------------------------------------------------------
// Shape helpers
// ---------------------------------------------------------------------------

function shapeProgram(p: typeof bountyProgramsTable.$inferSelect) {
  return {
    id:              p.id,
    slug:            p.slug,
    platform:        p.platform,
    name:            p.name,
    url:             p.url,
    max_reward_usd:  p.maxRewardUsd,
    scope_assets:    p.scopeAssets,
    out_of_scope:    p.outOfScope,
    tech_signals:    p.techSignals,
    disclosed_count: p.disclosedCount,
    probe_guide:     p.probeGuide,
    status:          p.status,
    added_at:        p.addedAt.toISOString(),
    analysed_at:     p.analysedAt?.toISOString() ?? null,
  };
}

function shapeFinding(f: typeof bountyFindingsTable.$inferSelect) {
  return {
    id:               f.id,
    slug:             f.slug,
    program_id:       f.programId,
    probe_item_ref:   f.probeItemRef ?? null,
    vuln_description: f.vulnDescription,
    draft_report:     f.draftReport,
    status:           f.status,
    submitted_at:     f.submittedAt?.toISOString() ?? null,
    triaged_at:       f.triagedAt?.toISOString() ?? null,
    resolved_at:      f.resolvedAt?.toISOString() ?? null,
    payout_usd:       f.payoutUsd ?? null,
    notes:            f.notes,
    created_at:       f.createdAt.toISOString(),
    updated_at:       f.updatedAt.toISOString(),
  };
}

function transitionTimestamps(toStatus: string): Record<string, Date> {
  const now = new Date();
  if (toStatus === "submitted") return { submittedAt: now };
  if (toStatus === "triaged")   return { triagedAt: now };
  if (["accepted","duplicate","paid"].includes(toStatus)) return { resolvedAt: now };
  return {};
}

function slugFromUrl(url: string): string {
  // Stable hex from URL + timestamp
  const raw = url + Date.now();
  let h = 5381;
  for (let i = 0; i < raw.length; i++) h = ((h << 5) + h) ^ raw.charCodeAt(i);
  return Math.abs(h).toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// Async Claude jobs
// ---------------------------------------------------------------------------

async function runAnalysis(programId: number, url: string): Promise<void> {
  try {
    const [existing] = await db.select().from(bountyProgramsTable).where(eq(bountyProgramsTable.id, programId));

    // Prefer HackerOne's own scope data over an LLM guess when we can get it —
    // real scope is what keeps testing inside the program's rules of engagement.
    let realScope: { scopeAssets: string[]; outOfScope: string[]; maxRewardUsd: number } | null = null;
    if (existing?.platform === "hackerone" && hasH1Credentials()) {
      if (activeAnalyse) activeAnalyse.log = "Fetching real scope from HackerOne…";
      try {
        const handle = new URL(url).pathname.replace(/^\//, "").split("/")[0];
        realScope = await getProgramScope(handle);
      } catch (err) {
        logger.warn({ err, programId }, "HackerOne scope lookup failed, falling back to LLM guess");
      }
    }

    if (activeAnalyse) activeAnalyse.log = "Generating probe guide with Claude…";
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `You are a bug bounty analyst. Analyse this bug bounty program URL and return a JSON object with these fields:
- platform: one of "hackerone", "bugcrowd", "intigriti", "other" (detect from URL)
- name: short program name (derive from URL domain if needed)
- max_reward_usd: estimated top reward in USD (0 if unknown)
- scope_assets: array of strings describing in-scope targets (e.g. ["*.example.com", "api.example.com"])
- out_of_scope: array of out-of-scope items
- probe_guide: array of 5 probe items, each { title: string, category: string (e.g. "IDOR", "XSS", "SSRF", "Auth bypass"), priority: "high"|"medium"|"low", rationale: string (why this is worth testing, 1-2 sentences), steps: array of 3-5 numbered plain-English steps to test it }
${realScope ? `\nKnown real in-scope assets (use these verbatim, do not invent others): ${JSON.stringify(realScope.scopeAssets)}\nKnown real out-of-scope assets: ${JSON.stringify(realScope.outOfScope)}` : ""}

URL: ${url}

Respond with ONLY valid JSON, no markdown.`,
      }],
    });

    const text = (msg.content[0] as { text: string }).text.trim();
    const parsed = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```\s*$/, ""));

    await db.update(bountyProgramsTable).set({
      platform:       parsed.platform ?? "other",
      name:           parsed.name ?? new URL(url).hostname,
      // Real HackerOne scope always wins over the LLM's guess when we have it.
      maxRewardUsd:   realScope && realScope.maxRewardUsd > 0 ? realScope.maxRewardUsd : Number(parsed.max_reward_usd ?? 0),
      scopeAssets:    realScope ? realScope.scopeAssets : (Array.isArray(parsed.scope_assets) ? parsed.scope_assets : []),
      outOfScope:     realScope ? realScope.outOfScope : (Array.isArray(parsed.out_of_scope) ? parsed.out_of_scope : []),
      probeGuide:     Array.isArray(parsed.probe_guide) ? parsed.probe_guide : [],
      status:         "active",
      analysedAt:     new Date(),
    }).where(eq(bountyProgramsTable.id, programId));
  } catch (err) {
    logger.error({ err, programId }, "Program analysis failed");
    await db.update(bountyProgramsTable)
      .set({ status: "failed" })
      .where(eq(bountyProgramsTable.id, programId));
  } finally {
    activeAnalyse = null;
    analyseLastFinishedAt = new Date();
  }
}

// ---------------------------------------------------------------------------
// Discovery scout — reads HackerOne's public program list on a schedule.
// Read-only, public/documented API only. New programs land as
// "pending_approval" — nothing further happens until a human approves them.
// ---------------------------------------------------------------------------

async function runDiscoveryScan(): Promise<void> {
  if (scoutRunning || !hasH1Credentials()) return;
  scoutRunning = true;
  try {
    const programs = await listOpenPrograms();
    let found = 0;
    for (const p of programs) {
      const slug = slugFromUrl(p.url);
      const [row] = await db.insert(bountyProgramsTable).values({
        slug,
        platform: "hackerone",
        name: p.name,
        url: p.url,
        status: "pending_approval",
      }).onConflictDoNothing({ target: bountyProgramsTable.url }).returning();
      if (row) found++;
    }
    scoutLastFoundCount = found;
    logger.info({ found, scanned: programs.length }, "Bounty discovery scan complete");
  } catch (err) {
    logger.error({ err }, "Bounty discovery scan failed");
  } finally {
    scoutRunning = false;
    scoutLastRunAt = new Date();
  }
}

// Auto-run every 6 hours if credentials are configured; first run 30s after boot
// so it doesn't compete with server startup.
if (hasH1Credentials()) {
  setTimeout(() => runDiscoveryScan().catch(() => {}), 30_000);
  setInterval(() => runDiscoveryScan().catch(() => {}), 6 * 60 * 60 * 1000);
}

async function runDraft(findingId: number): Promise<void> {
  try {
    activeDraft!.log = "Loading program context…";

    const [finding] = await db.select().from(bountyFindingsTable)
      .where(eq(bountyFindingsTable.id, findingId));
    if (!finding) { activeDraft = null; return; }

    const [program] = await db.select().from(bountyProgramsTable)
      .where(eq(bountyProgramsTable.id, finding.programId));

    activeDraft!.log = "Generating draft report with Claude…";

    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `You are a professional bug bounty report writer. Generate a structured vulnerability report.

Program: ${program?.name ?? "Unknown"} (${program?.url ?? ""})
Vulnerability description: ${finding.vulnDescription}
${finding.probeItemRef ? `Related probe: ${finding.probeItemRef}` : ""}

Return a JSON object with exactly these keys:
- title: concise vulnerability title (e.g. "Stored XSS in profile bio field")
- severity: "critical" | "high" | "medium" | "low" | "info"
- cvss_estimate: CVSS v3 score estimate as a string, e.g. "7.5 (High)" — reason briefly
- vuln_type: CWE or OWASP category (e.g. "CWE-79: Cross-Site Scripting")
- affected_asset: the specific URL, endpoint, or component that is vulnerable
- description: detailed technical description (2-3 paragraphs)
- impact: what an attacker could achieve, be specific (1-2 paragraphs)
- poc_steps: array of numbered strings — exact reproduction steps
- fix_recommendation: concrete remediation advice for the development team (1-2 paragraphs)

Respond with ONLY valid JSON, no markdown.`,
      }],
    });

    const text = (msg.content[0] as { text: string }).text.trim();
    const report = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```\s*$/, ""));

    activeDraft!.log = "Saving draft…";

    await db.update(bountyFindingsTable).set({
      draftReport: report,
      status:      "draft",
      updatedAt:   new Date(),
    }).where(eq(bountyFindingsTable.id, findingId));
  } catch {
    await db.update(bountyFindingsTable)
      .set({ status: "draft", updatedAt: new Date() })
      .where(eq(bountyFindingsTable.id, findingId));
  } finally {
    activeDraft = null;
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /api/bounty/scout/status
router.get("/bounty/scout/status", (_req, res): void => {
  res.json({
    enabled: hasH1Credentials(),
    running: scoutRunning,
    last_run_at: scoutLastRunAt?.toISOString() ?? null,
    last_found_count: scoutLastFoundCount,
  });
});

// POST /api/bounty/scout/run — manually trigger a discovery scan now
router.post("/bounty/scout/run", (_req, res): void => {
  if (!hasH1Credentials()) {
    res.status(400).json({ ok: false, error: "H1_API_USERNAME / H1_API_TOKEN are not configured" });
    return;
  }
  if (scoutRunning) {
    res.json({ ok: true, message: "Scan already running" });
    return;
  }
  runDiscoveryScan().catch(() => {});
  res.json({ ok: true, message: "Scan started" });
});

// GET /api/bounty/programs/pending — programs the scout found, awaiting your approval
router.get("/bounty/programs/pending", async (_req, res): Promise<void> => {
  const rows = await db.select().from(bountyProgramsTable)
    .where(eq(bountyProgramsTable.status, "pending_approval"))
    .orderBy(desc(bountyProgramsTable.addedAt));
  res.json(rows.map(shapeProgram));
});

// POST /api/bounty/programs/:id/approve — starts real analysis + probe guide generation
router.post("/bounty/programs/:id/approve", async (req, res): Promise<void> => {
  const p = IntId.safeParse({ id: parseInt(req.params.id, 10) });
  if (!p.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(bountyProgramsTable).where(eq(bountyProgramsTable.id, p.data.id));
  if (!row) { res.status(404).json({ error: "Program not found" }); return; }
  if (row.status !== "pending_approval") { res.status(422).json({ error: `Program is '${row.status}', not pending approval` }); return; }

  await db.update(bountyProgramsTable).set({ status: "analysing" }).where(eq(bountyProgramsTable.id, p.data.id));

  if (!activeAnalyse) {
    activeAnalyse = { programId: p.data.id, log: "Starting…" };
    runAnalysis(p.data.id, row.url).catch(() => { activeAnalyse = null; });
  }

  const [fresh] = await db.select().from(bountyProgramsTable).where(eq(bountyProgramsTable.id, p.data.id));
  res.json(shapeProgram(fresh));
});

// POST /api/bounty/programs/:id/reject — archives a scout-found program you don't want to pursue
router.post("/bounty/programs/:id/reject", async (req, res): Promise<void> => {
  const p = IntId.safeParse({ id: parseInt(req.params.id, 10) });
  if (!p.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(bountyProgramsTable).where(eq(bountyProgramsTable.id, p.data.id));
  if (!row) { res.status(404).json({ error: "Program not found" }); return; }
  if (row.status !== "pending_approval") { res.status(422).json({ error: `Program is '${row.status}', not pending approval` }); return; }

  await db.update(bountyProgramsTable).set({ status: "archived" }).where(eq(bountyProgramsTable.id, p.data.id));
  const [fresh] = await db.select().from(bountyProgramsTable).where(eq(bountyProgramsTable.id, p.data.id));
  res.json(shapeProgram(fresh));
});

// GET /api/bounty/stats
router.get("/bounty/stats", async (_req, res): Promise<void> => {
  const [programCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bountyProgramsTable)
    .where(sql`${bountyProgramsTable.status} != 'pending_approval'`);

  const [earnings] = await db
    .select({ total: sql<number>`coalesce(sum(payout_usd), 0)` })
    .from(bountyFindingsTable)
    .where(eq(bountyFindingsTable.status, "paid"));

  const statusRows = await db
    .select({ status: bountyFindingsTable.status, count: sql<number>`count(*)::int` })
    .from(bountyFindingsTable)
    .groupBy(bountyFindingsTable.status);

  res.json({
    total_programs:     programCount?.count ?? 0,
    total_paid_usd:      earnings?.total ?? 0,
    findings_by_status: Object.fromEntries(statusRows.map((r: { status: string; count: number }) => [r.status, r.count])),
  });
});

// GET /api/bounty/analyse-status
router.get("/bounty/analyse-status", (_req, res): void => {
  res.json({
    running:     !!activeAnalyse,
    program_id:  activeAnalyse?.programId ?? null,
    log:         activeAnalyse?.log ?? "",
    finished_at: !activeAnalyse ? (analyseLastFinishedAt?.toISOString() ?? null) : null,
  });
});

// GET /api/bounty/draft-status
router.get("/bounty/draft-status", (_req, res): void => {
  res.json({
    running:    !!activeDraft,
    finding_id: activeDraft?.findingId ?? null,
    log:        activeDraft?.log ?? "",
  });
});

// GET /api/bounty/programs
router.get("/bounty/programs", async (_req, res): Promise<void> => {
  // Scout finds awaiting approval live on /bounty/programs/pending, not here.
  const rows = await db.select().from(bountyProgramsTable)
    .where(sql`${bountyProgramsTable.status} != 'pending_approval'`)
    .orderBy(desc(bountyProgramsTable.addedAt));
  res.json(rows.map(shapeProgram));
});

// POST /api/bounty/programs  — accepts {url}, fires async analysis
router.post("/bounty/programs", async (req, res): Promise<void> => {
  const parsed = ProgramInputBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { url } = parsed.data;

  let hostname = url;
  try { hostname = new URL(url).hostname; } catch { /* use raw string */ }

  // Detect platform from URL
  const platform =
    url.includes("hackerone.com") ? "hackerone" :
    url.includes("bugcrowd.com")  ? "bugcrowd"  :
    url.includes("intigriti.com") ? "intigriti" : "other";

  const slug = slugFromUrl(url);

  const [row] = await db.insert(bountyProgramsTable).values({
    slug,
    platform,
    name:     hostname,
    url,
    status:   "analysing",
  }).onConflictDoUpdate({
    target: bountyProgramsTable.url,
    set: { status: "analysing", analysedAt: null },
  }).returning();

  // Kick off analysis (one at a time)
  if (!activeAnalyse) {
    activeAnalyse = { programId: row.id, log: "Starting…" };
    runAnalysis(row.id, url).catch(() => { activeAnalyse = null; });
  }

  res.status(201).json(shapeProgram(row));
});

// GET /api/bounty/programs/:id
router.get("/bounty/programs/:id", async (req, res): Promise<void> => {
  const p = IntId.safeParse({ id: parseInt(req.params.id, 10) });
  if (!p.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(bountyProgramsTable).where(eq(bountyProgramsTable.id, p.data.id));
  if (!row) { res.status(404).json({ error: "Program not found" }); return; }
  res.json(shapeProgram(row));
});

// DELETE /api/bounty/programs/:id
router.delete("/bounty/programs/:id", async (req, res): Promise<void> => {
  const p = IntId.safeParse({ id: parseInt(req.params.id, 10) });
  if (!p.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select({ id: bountyProgramsTable.id }).from(bountyProgramsTable).where(eq(bountyProgramsTable.id, p.data.id));
  if (!row) { res.status(404).json({ error: "Program not found" }); return; }
  await db.delete(bountyProgramsTable).where(eq(bountyProgramsTable.id, p.data.id));
  res.json({ ok: true });
});

// GET /api/bounty/findings
router.get("/bounty/findings", async (_req, res): Promise<void> => {
  const rows = await db.select().from(bountyFindingsTable).orderBy(desc(bountyFindingsTable.createdAt));
  res.json(rows.map(shapeFinding));
});

// POST /api/bounty/findings — accepts {program_id, vuln_description, probe_item_ref?}, fires async draft
router.post("/bounty/findings", async (req, res): Promise<void> => {
  const parsed = FindingInputBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { program_id, vuln_description, probe_item_ref } = parsed.data;

  const [program] = await db.select({ id: bountyProgramsTable.id }).from(bountyProgramsTable).where(eq(bountyProgramsTable.id, program_id));
  if (!program) { res.status(400).json({ error: "Program not found" }); return; }

  const slug = slugFromUrl(vuln_description + program_id);

  const [row] = await db.insert(bountyFindingsTable).values({
    slug,
    programId:       program_id,
    probeItemRef:    probe_item_ref,
    vulnDescription: vuln_description,
    draftReport:     {},
    status:          "drafting",
    notes:           "",
  }).returning();

  // Kick off draft generation (one at a time)
  if (!activeDraft) {
    activeDraft = { findingId: row.id, log: "Starting…" };
    runDraft(row.id).catch(() => { activeDraft = null; });
  }

  res.status(201).json(shapeFinding(row));
});

// GET /api/bounty/findings/:id
router.get("/bounty/findings/:id", async (req, res): Promise<void> => {
  const p = IntId.safeParse({ id: parseInt(req.params.id, 10) });
  if (!p.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(bountyFindingsTable).where(eq(bountyFindingsTable.id, p.data.id));
  if (!row) { res.status(404).json({ error: "Finding not found" }); return; }
  res.json(shapeFinding(row));
});

// PATCH /api/bounty/findings/:id
router.patch("/bounty/findings/:id", async (req, res): Promise<void> => {
  const p = IntId.safeParse({ id: parseInt(req.params.id, 10) });
  if (!p.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [finding] = await db.select().from(bountyFindingsTable).where(eq(bountyFindingsTable.id, p.data.id));
  if (!finding) { res.status(404).json({ error: "Finding not found" }); return; }

  const bodyParsed = FindingUpdateBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: bodyParsed.error.message }); return; }
  const upd = bodyParsed.data;

  if (upd.status && upd.status !== finding.status) {
    const allowed = FINDING_TRANSITIONS[finding.status] ?? [];
    if (!allowed.includes(upd.status)) {
      res.status(422).json({ error: `Cannot transition '${finding.status}' → '${upd.status}'. Allowed: ${allowed.join(", ") || "none"}` });
      return;
    }
  }

  const [updated] = await db.update(bountyFindingsTable).set({
    ...(upd.status    !== undefined ? { status: upd.status }           : {}),
    ...(upd.notes     !== undefined ? { notes: upd.notes }             : {}),
    ...(upd.payout_usd !== undefined ? { payoutUsd: upd.payout_usd }   : {}),
    ...(upd.status ? transitionTimestamps(upd.status) : {}),
    updatedAt: new Date(),
  }).where(eq(bountyFindingsTable.id, p.data.id)).returning();

  res.json(shapeFinding(updated));
});

// DELETE /api/bounty/findings/:id
router.delete("/bounty/findings/:id", async (req, res): Promise<void> => {
  const p = IntId.safeParse({ id: parseInt(req.params.id, 10) });
  if (!p.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select({ id: bountyFindingsTable.id }).from(bountyFindingsTable).where(eq(bountyFindingsTable.id, p.data.id));
  if (!row) { res.status(404).json({ error: "Finding not found" }); return; }
  await db.delete(bountyFindingsTable).where(eq(bountyFindingsTable.id, p.data.id));
  res.json({ ok: true });
});

export default router;

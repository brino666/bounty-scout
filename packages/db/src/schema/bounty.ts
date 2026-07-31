import {
  pgTable,
  serial,
  text,
  real,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Programs — scouted bug bounty programs + recon data + probe guide
// Mirrors the `programs` table in bug-bounty-scout's store.py
// ---------------------------------------------------------------------------

export const bountyProgramsTable = pgTable("bounty_programs", {
  id:             serial("id").primaryKey(),
  // Text PK from Python is mapped to a unique slug column; serial is the real PK
  slug:           text("slug").notNull().unique(),               // hex id from Python store
  platform:       text("platform").notNull(),                    // hackerone | bugcrowd | intigriti | other
  name:           text("name").notNull(),
  url:            text("url").notNull().unique(),
  maxRewardUsd:   real("max_reward_usd").notNull().default(0),
  scopeAssets:    jsonb("scope_assets").notNull().default([]),   // string[]
  outOfScope:     jsonb("out_of_scope").notNull().default([]),   // string[]
  techSignals:    jsonb("tech_signals").notNull().default({}),   // Record<string,any>
  disclosedCount: integer("disclosed_count").notNull().default(0),
  probeGuide:     jsonb("probe_guide").notNull().default([]),    // probe item objects[]
  status:         text("status").notNull().default("analysing"), // analysing | active | failed | archived
  addedAt:        timestamp("added_at").notNull().defaultNow(),
  analysedAt:     timestamp("analysed_at"),
});

export type BountyProgram = typeof bountyProgramsTable.$inferSelect;

// ---------------------------------------------------------------------------
// Findings — per-finding vulnerability reports + full lifecycle tracking
// Mirrors the `findings` table in bug-bounty-scout's store.py
// ---------------------------------------------------------------------------

export const bountyFindingsTable = pgTable("bounty_findings", {
  id:               serial("id").primaryKey(),
  slug:             text("slug").notNull().unique(),              // hex id from Python store
  programId:        integer("program_id").notNull().references(() => bountyProgramsTable.id, { onDelete: "cascade" }),
  probeItemRef:     text("probe_item_ref"),                      // which probe guide item this targets
  vulnDescription:  text("vuln_description").notNull(),
  draftReport:      jsonb("draft_report").notNull().default({}), // structured report from Claude
  // Status lifecycle: draft → submitted → triaged → accepted → paid
  //                                     ↘ needs_info → submitted
  //                               any → duplicate (terminal)
  status:           text("status").notNull().default("draft"),   // draft|submitted|triaged|needs_info|accepted|duplicate|paid
  submittedAt:      timestamp("submitted_at"),
  triagedAt:        timestamp("triaged_at"),
  resolvedAt:       timestamp("resolved_at"),
  payoutUsd:        real("payout_usd"),
  notes:            text("notes").notNull().default(""),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
});

export type BountyFinding = typeof bountyFindingsTable.$inferSelect;

// ---------------------------------------------------------------------------
// Allowed status transitions (mirrors _TRANSITIONS in Python store)
// ---------------------------------------------------------------------------

export const FINDING_TRANSITIONS: Record<string, string[]> = {
  drafting:   ["draft"],                                   // AI finishing → ready to review
  draft:      ["submitted", "duplicate"],
  submitted:  ["triaged", "needs_info", "duplicate"],
  triaged:    ["accepted", "needs_info", "duplicate"],
  needs_info: ["submitted", "duplicate"],
  accepted:   ["paid", "duplicate"],
  duplicate:  [],
  paid:       [],
};

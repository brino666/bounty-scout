import { useState, useRef, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetFinding, useUpdateFindingStatus, useGetProgram, type FindingUpdateStatus } from "@bounty-scout/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Copy, CheckCircle2, AlertTriangle, ShieldAlert, ArrowRight, Loader2 } from "lucide-react";
import { getStatusColor, getSeverityColor } from "@/lib/colors";
import { useQueryClient } from "@tanstack/react-query";

// Need standard Radix Select imports
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function FindingDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { data: finding, isLoading } = useGetFinding(Number(id), { query: { enabled: !!id } });
  const { data: program } = useGetProgram(Number(finding?.program_id), { query: { enabled: !!finding?.program_id } });
  
  const updateStatus = useUpdateFindingStatus();
  const [copied, setCopied] = useState(false);
  
  // Status advancement state
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<string>("");
  const [payout, setPayout] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!finding) {
    return <div className="p-4 text-center">Finding not found</div>;
  }

  // draft_report starts as {} while Claude is still drafting — not a real report yet.
  const report = finding.draft_report?.title ? finding.draft_report : null;

  const fullReportText = report ? `
**Title:** ${report.title}
**Severity:** ${report.severity}
**CVSS Estimate:** ${report.cvss_estimate}
**Vulnerability Type:** ${report.vuln_type}
**Affected Asset:** ${report.affected_asset}

## Description
${report.description}

## Impact
${report.impact}

## Steps to Reproduce
${report.poc_steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## Recommended Fix
${report.fix_recommendation}
  `.trim() : finding.vuln_description;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullReportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getValidNextStatuses = (current: string) => {
    const s = current.toLowerCase();
    const common = ["duplicate"];
    if (s === "draft") return ["submitted", ...common];
    if (s === "submitted") return ["triaged", "needs_info", ...common];
    if (s === "triaged") return ["accepted", "needs_info", ...common];
    if (s === "needs_info") return ["submitted", "duplicate"];
    if (s === "accepted") return ["paid", "duplicate"];
    return common; // terminal states
  };

  const validNext = getValidNextStatuses(finding.status);

  const handleUpdateStatus = async () => {
    if (!nextStatus) return;
    try {
      await updateStatus.mutateAsync({
        id: finding.id,
        data: {
          status: nextStatus as FindingUpdateStatus,
          notes: notes || undefined,
          payout_usd: nextStatus === "paid" && payout ? parseFloat(payout) : undefined
        }
      });
      // Invalidate instead of manual patch just to be safe with all fields (updated_at etc)
      queryClient.invalidateQueries({ queryKey: [`/api/bounty/findings/${finding.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bounty/findings`] });
      setIsStatusOpen(false);
      setNextStatus("");
      setPayout("");
      setNotes("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3 pb-2">
        <Link href="/findings">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 -ml-2 mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-lg font-bold leading-tight">
              {report?.title || "Untitled Finding"}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`font-mono text-xs ${getStatusColor(finding.status)}`}>
              {finding.status}
            </Badge>
            {report && (
              <Badge variant="outline" className={`font-mono text-xs ${getSeverityColor(report.severity)}`}>
                {report.severity}
              </Badge>
            )}
            {finding.payout_usd && (
              <Badge variant="outline" className="font-mono text-xs text-emerald-400 border-emerald-500/20 bg-emerald-500/10">
                ${finding.payout_usd}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground font-mono ml-auto">
              {program?.name}
            </span>
          </div>
        </div>
      </header>

      {validNext.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-primary/80">Update status on platform?</span>
            <Button size="sm" onClick={() => setIsStatusOpen(true)}>
              Advance Status <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {!report ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-mono text-muted-foreground whitespace-pre-wrap">
              {finding.vuln_description}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Draft Report
            </h2>
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied" : "Copy Markdown"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 rounded-lg p-3 border border-border/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Vuln Type</p>
              <p className="text-sm font-mono">{report.vuln_type}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 border border-border/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Target Asset</p>
              <p className="text-sm font-mono break-all">{report.affected_asset}</p>
            </div>
            <div className="col-span-2 bg-secondary/50 rounded-lg p-3 border border-border/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">CVSS</p>
              <p className="text-sm font-mono">{report.cvss_estimate}</p>
            </div>
          </div>

          <Card>
            <CardContent className="p-0 divide-y divide-border/50">
              <div className="p-4 space-y-2">
                <h3 className="font-medium text-sm text-primary">Description</h3>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {report.description}
                </p>
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-medium text-sm text-destructive">Impact</h3>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {report.impact}
                </p>
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-medium text-sm text-amber-500">Steps to Reproduce</h3>
                <ol className="list-decimal pl-4 space-y-2 text-sm font-mono text-foreground/90">
                  {report.poc_steps.map((step, i) => (
                    <li key={i} className="pl-2 marker:text-muted-foreground">{step}</li>
                  ))}
                </ol>
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-medium text-sm text-emerald-500">Fix Recommendation</h3>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {report.fix_recommendation}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {finding.notes && (
        <Card className="bg-secondary/20">
          <CardContent className="p-4 space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Internal Notes
            </h3>
            <p className="text-sm whitespace-pre-wrap text-foreground/80">{finding.notes}</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent className="sm:max-w-md w-[90vw] rounded-xl">
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>
              Mirror the state from the bug bounty platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Status</label>
              <Select value={nextStatus} onValueChange={setNextStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select next status..." />
                </SelectTrigger>
                <SelectContent>
                  {validNext.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {nextStatus === "paid" && (
              <div className="space-y-2 animate-in fade-in zoom-in slide-in-from-top-2 duration-200">
                <label className="text-sm font-medium text-emerald-400">Payout Amount (USD)</label>
                <Input 
                  type="number" 
                  placeholder="2500" 
                  value={payout}
                  onChange={e => setPayout(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea 
                placeholder="Added platform comment regarding..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleUpdateStatus} 
              disabled={updateStatus.isPending || !nextStatus || (nextStatus === "paid" && !payout)}
            >
              {updateStatus.isPending ? "Saving..." : "Save Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetProgram, useAddFinding, useGetDraftStatus, useApproveProgram, useGetAnalyseStatus } from "@bounty-scout/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ChevronDown, ChevronRight, ExternalLink, ShieldAlert, Loader2, AlertTriangle } from "lucide-react";
import { getPriorityColor } from "@/lib/colors";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function ProgramDetail() {
  const { id } = useParams();
  const [_, setLocation] = useLocation();
  const { data: program, isLoading, refetch: refetchProgram } = useGetProgram(Number(id), { query: { enabled: !!id } });

  const [expandedProbes, setExpandedProbes] = useState<Set<number>>(new Set());

  // Retry state — for when a program's analysis previously failed (e.g. a
  // truncated Claude response) and needs to be re-run.
  const approveProgram = useApproveProgram();
  const [isRetrying, setIsRetrying] = useState(false);
  const { data: analyseStatus } = useGetAnalyseStatus({
    query: { enabled: isRetrying, refetchInterval: isRetrying ? 2000 : false, queryKey: ["analyseStatus"] }
  });

  useEffect(() => {
    if (isRetrying && analyseStatus && !analyseStatus.running) {
      setIsRetrying(false);
      refetchProgram();
    }
  }, [analyseStatus, isRetrying, refetchProgram]);

  const handleRetry = async () => {
    if (!program) return;
    await approveProgram.mutateAsync({ id: program.id });
    setIsRetrying(true);
  };
  
  // Finding submission state
  const [isLogFindingOpen, setIsLogFindingOpen] = useState(false);
  const [selectedProbeRef, setSelectedProbeRef] = useState<string>("");
  const [vulnDescription, setVulnDescription] = useState("");
  
  const addFinding = useAddFinding();
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftedFindingId, setDraftedFindingId] = useState<string | null>(null);

  const { data: draftStatus } = useGetDraftStatus({
    query: {
      enabled: isDrafting,
      refetchInterval: isDrafting ? 2000 : false,
      queryKey: ["draftStatus"]
    }
  });

  useEffect(() => {
    if (isDrafting && draftStatus && !draftStatus.running && draftedFindingId) {
      setIsDrafting(false);
      setLocation(`/findings/${draftedFindingId}`);
    }
  }, [draftStatus, isDrafting, draftedFindingId, setLocation]);

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!program) {
    return <div className="p-4 text-center">Program not found</div>;
  }

  const toggleProbe = (index: number) => {
    const next = new Set(expandedProbes);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setExpandedProbes(next);
  };

  const handleLogFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vulnDescription.trim()) return;

    try {
      const res = await addFinding.mutateAsync({
        data: {
          program_id: program.id,
          vuln_description: vulnDescription,
          probe_item_ref: selectedProbeRef || undefined
        }
      });
      if (res.id) {
        setDraftedFindingId(String(res.id));
        setIsDrafting(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3 pb-2">
        <Link href="/programs">
          <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold leading-tight">{program.name}</h1>
          <p className="text-xs text-muted-foreground font-mono">{program.platform}</p>
        </div>
        <a href={program.url} target="_blank" rel="noreferrer" className="text-primary p-2">
          <ExternalLink className="h-5 w-5" />
        </a>
      </header>

      {program.status === "failed" && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-sm">
              {isRetrying ? "Retrying analysis…" : "Analysis failed — Claude's response didn't come back usable. No scope or probe guide was generated."}
            </p>
          </div>
          {!isRetrying && (
            <Button size="sm" variant="outline" onClick={handleRetry} disabled={approveProgram.isPending}>
              {approveProgram.isPending ? "Starting…" : "Retry"}
            </Button>
          )}
        </div>
      )}

      <Card className="border-dashed bg-secondary/50">
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">In Scope Assets</p>
            <div className="flex flex-wrap gap-2">
              {program.scope_assets?.map((asset, i) => (
                <code key={i} className="text-xs bg-background border px-2 py-1 rounded-md text-foreground">{asset}</code>
              ))}
              {(!program.scope_assets || program.scope_assets.length === 0) && <span className="text-xs text-muted-foreground">Not specified</span>}
            </div>
          </div>
          {program.out_of_scope && program.out_of_scope.length > 0 && (
            <div>
              <p className="text-xs font-medium text-destructive mb-1 uppercase tracking-wider">Out of Scope</p>
              <div className="flex flex-wrap gap-2">
                {program.out_of_scope.map((asset, i) => (
                  <code key={i} className="text-xs bg-destructive/10 border-destructive/20 border px-2 py-1 rounded-md text-destructive">{asset}</code>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" /> Probe Guide
        </h2>
        <Button size="sm" onClick={() => {
          setSelectedProbeRef("");
          setVulnDescription("");
          setIsLogFindingOpen(true);
        }}>
          Log Finding
        </Button>
      </div>

      <div className="space-y-3">
        {program.probe_guide?.map((probe, i) => {
          const isExpanded = expandedProbes.has(i);
          return (
            <Card key={i} className={`overflow-hidden transition-colors ${isExpanded ? 'border-primary/50' : ''}`}>
              <div 
                className="p-4 flex gap-3 cursor-pointer select-none items-start"
                onClick={() => toggleProbe(i)}
              >
                <div className="mt-1">
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`font-medium text-sm leading-tight ${isExpanded ? 'text-primary' : ''}`}>
                      {probe.title}
                    </h3>
                    <Badge variant="outline" className={`font-mono text-[10px] uppercase shrink-0 ${getPriorityColor(probe.priority)}`}>
                      {probe.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{probe.category}</p>
                </div>
              </div>
              
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 pl-11 space-y-3 border-t border-border/50 mt-2 pt-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Rationale</p>
                    <p className="text-sm text-foreground leading-relaxed">{probe.rationale}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Steps</p>
                    <ol className="list-decimal pl-4 space-y-1 text-sm text-foreground/90">
                      {probe.steps.map((step, idx) => (
                        <li key={idx} className="pl-1">{step}</li>
                      ))}
                    </ol>
                  </div>
                  <div className="pt-2">
                    <Button variant="secondary" size="sm" className="w-full text-xs" onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProbeRef(probe.title);
                      setVulnDescription("");
                      setIsLogFindingOpen(true);
                    }}>
                      Log finding for this probe
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <Dialog open={isLogFindingOpen} onOpenChange={(open) => !isDrafting && setIsLogFindingOpen(open)}>
        <DialogContent className="sm:max-w-md w-[90vw] rounded-xl flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Log New Finding</DialogTitle>
            <DialogDescription>
              Describe the vulnerability. Scout will automatically draft a full severity-scored report.
            </DialogDescription>
          </DialogHeader>

          {isDrafting ? (
            <div className="py-8 space-y-4 flex-1">
              <div className="flex flex-col items-center justify-center gap-3 text-primary py-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="font-medium">Drafting Report...</span>
              </div>
              <div className="bg-secondary p-3 rounded-md border border-border h-32 overflow-y-auto font-mono text-xs text-muted-foreground whitespace-pre-wrap flex flex-col justify-end">
                {draftStatus?.log || "Initializing AI drafter..."}
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogFinding} className="space-y-4 py-2 flex-1 overflow-y-auto">
              {selectedProbeRef && (
                <div className="bg-secondary/50 p-3 rounded-md border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Related Probe</p>
                  <p className="text-sm font-medium">{selectedProbeRef}</p>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Vulnerability Notes</label>
                <Textarea 
                  placeholder="Found blind XSS in the feedback form parameter 'email'. Payload triggered on internal admin panel..."
                  className="min-h-[150px] font-mono text-sm"
                  value={vulnDescription}
                  onChange={e => setVulnDescription(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full mt-4" disabled={addFinding.isPending || !vulnDescription.trim()}>
                {addFinding.isPending ? "Starting Drafter..." : "Generate Report Draft"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
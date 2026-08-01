import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  useListPrograms,
  useAddProgram,
  useGetAnalyseStatus,
  useListPendingPrograms,
  useApproveProgram,
  useRejectProgram,
  useGetScoutStatus,
  useRunScout,
} from "@bounty-scout/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Target, CheckCircle2, Loader2, ArrowRight, Search, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function Programs() {
  const { data: programs, isLoading, refetch } = useListPrograms();
  const addProgram = useAddProgram();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const { data: analyseStatus } = useGetAnalyseStatus({
    query: {
      enabled: isPolling,
      refetchInterval: isPolling ? 2000 : false,
      queryKey: ["analyseStatus"]
    }
  });

  const { data: pendingPrograms, refetch: refetchPending } = useListPendingPrograms();
  const { data: scoutStatus } = useGetScoutStatus({
    // Cheap endpoint — poll often so the button's state (and when a scan
    // actually finishes) reflects reality within a few seconds, not 15.
    query: { refetchInterval: 4000, queryKey: ["scoutStatus"] }
  });
  const runScout = useRunScout();
  const approveProgram = useApproveProgram();
  const rejectProgram = useRejectProgram();

  const handleApprove = async (id: number) => {
    await approveProgram.mutateAsync({ id });
    refetchPending();
    setIsPolling(true);
    setIsAddOpen(true);
  };

  const handleReject = async (id: number) => {
    await rejectProgram.mutateAsync({ id });
    refetchPending();
  };

  const handleScanNow = async () => {
    await runScout.mutateAsync();
    setTimeout(() => refetchPending(), 3000);
  };

  useEffect(() => {
    if (isPolling && analyseStatus && !analyseStatus.running) {
      setIsPolling(false);
      setIsAddOpen(false);
      refetch();
    }
  }, [analyseStatus, isPolling, refetch]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    
    try {
      await addProgram.mutateAsync({ data: { url: newUrl } });
      setIsPolling(true);
    } catch (err) {
      console.error(err);
      // Let standard error handling handle it
    }
  };

  const getPlatformIcon = (platform: string) => {
    return <Target className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Programs</h1>
          <p className="text-sm text-muted-foreground font-mono">Tracked targets & scopes</p>
        </div>
        <div className="flex items-center gap-2">
          {scoutStatus?.enabled && (
            <Button variant="outline" size="sm" onClick={handleScanNow} disabled={runScout.isPending || scoutStatus.running}>
              <Search className="h-4 w-4 mr-1.5" />
              {runScout.isPending || scoutStatus.running ? "Scanning…" : "Scan for new programs"}
            </Button>
          )}
          <Button size="icon" onClick={() => setIsAddOpen(true)}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {pendingPrograms && pendingPrograms.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-amber-500 flex items-center gap-2">
            <Search className="h-4 w-4" />
            {pendingPrograms.length} new program{pendingPrograms.length !== 1 ? "s" : ""} found — waiting for your approval
          </h2>
          <div className="space-y-2">
            {pendingPrograms.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-background rounded-lg border p-3">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{p.url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleReject(p.id)} disabled={rejectProgram.isPending}>
                    <X className="h-4 w-4 mr-1" /> Skip
                  </Button>
                  <Button size="sm" onClick={() => handleApprove(p.id)} disabled={approveProgram.isPending}>
                    <Check className="h-4 w-4 mr-1" /> Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-28" />)}
        </div>
      ) : programs?.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center flex flex-col items-center gap-3">
          <Target className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">No programs tracked yet.</p>
          <Button variant="outline" onClick={() => setIsAddOpen(true)}>Add your first target</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {programs?.map(program => (
            <Link key={program.id} href={`/programs/${program.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                      {getPlatformIcon(program.platform)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                        {program.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {program.platform}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {program.probe_guide?.length || 0} probes
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Max Reward</p>
                    <p className="font-mono font-medium text-emerald-400">
                      ${program.max_reward_usd?.toLocaleString() || "0"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={(open) => {
        if (!open && !isPolling) setIsAddOpen(false);
      }}>
        <DialogContent className="sm:max-w-md w-[90vw] rounded-xl">
          <DialogHeader>
            <DialogTitle>Track New Target</DialogTitle>
            <DialogDescription>
              Paste the program URL. Scout will analyze the scope and generate a customized probe guide.
            </DialogDescription>
          </DialogHeader>

          {isPolling ? (
            <div className="py-6 space-y-4">
              <div className="flex items-center justify-center gap-3 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="font-medium">Analyzing scope...</span>
              </div>
              <div className="bg-secondary p-3 rounded-md border border-border h-32 overflow-y-auto font-mono text-xs text-muted-foreground whitespace-pre-wrap flex flex-col justify-end">
                {analyseStatus?.log || "Starting job..."}
              </div>
              {!analyseStatus?.running && analyseStatus?.finished_at && (
                <Button className="w-full" onClick={() => {
                  setIsAddOpen(false);
                  setIsPolling(false);
                }}>
                  View Program <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <form onSubmit={handleAdd} className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Program URL</label>
                <Input 
                  placeholder="https://hackerone.com/..." 
                  type="url" 
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={addProgram.isPending}>
                {addProgram.isPending ? "Starting..." : "Analyze Program"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
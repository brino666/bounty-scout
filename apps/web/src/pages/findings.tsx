import { useState } from "react";
import { Link } from "wouter";
import { useListFindings, useListPrograms } from "@bounty-scout/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug, Search } from "lucide-react";
import { getStatusColor, getSeverityColor } from "@/lib/colors";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Findings() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: findings, isLoading: findingsLoading } = useListFindings();
  const { data: programs, isLoading: programsLoading } = useListPrograms();

  const filteredFindings = findings?.filter(f => 
    statusFilter === "all" ? true : f.status.toLowerCase() === statusFilter.toLowerCase()
  ) || [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Findings</h1>
          <p className="text-sm text-muted-foreground font-mono">Your vulnerability pipeline</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-full max-w-[200px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="triaged">Triaged</SelectItem>
                <SelectItem value="needs_info">Needs Info</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="duplicate">Duplicate</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {findingsLoading || programsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Card key={i} className="animate-pulse h-28" />)}
        </div>
      ) : filteredFindings.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center flex flex-col items-center gap-3">
          <Search className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">No findings match this filter.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredFindings.map(finding => {
            const program = programs?.find(p => p.id === finding.program_id);
            const severity = finding.draft_report?.severity || "Unscored";
            
            return (
              <Link key={finding.id} href={`/findings/${finding.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-[15px] leading-tight group-hover:text-primary transition-colors line-clamp-2">
                          {finding.draft_report?.title || finding.vuln_description}
                        </h3>
                        <p className="text-xs font-mono text-muted-foreground uppercase">
                          {program?.name || "Unknown Program"}
                        </p>
                      </div>
                      <Badge variant="outline" className={`font-mono text-[10px] shrink-0 ${getStatusColor(finding.status)}`}>
                        {finding.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Badge variant="outline" className={`font-mono text-[10px] ${getSeverityColor(severity)}`}>
                          {severity}
                        </Badge>
                        {finding.payout_usd ? (
                          <Badge variant="outline" className="font-mono text-[10px] text-emerald-400 border-emerald-500/20 bg-emerald-500/10">
                            ${finding.payout_usd}
                          </Badge>
                        ) : null}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(finding.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
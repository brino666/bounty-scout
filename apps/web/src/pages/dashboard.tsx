import { useGetBountyStats, useListFindings, useListPrograms } from "@bounty-scout/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Target, Bug, Activity, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { getStatusColor, getSeverityColor } from "@/lib/colors";
import { Badge } from "@/components/ui/badge";

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetBountyStats();
  const { data: findings, isLoading: findingsLoading } = useListFindings();
  const { data: programs, isLoading: programsLoading } = useListPrograms();

  const recentFindings = findings?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between pb-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Scout</h1>
          <p className="text-sm text-muted-foreground font-mono">bounty-ops-dashboard v1.0.0</p>
        </div>
        <a
          href="/api/review"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Open the Income Agent Review Center to run the Opportunity Scout"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Review Center
        </a>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Card className="col-span-2 bg-primary/10 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-primary">Total Paid</p>
              <div className="text-3xl font-bold font-mono tracking-tighter">
                {statsLoading ? "---" : `$${(stats?.total_paid_usd || 0).toLocaleString()}`}
              </div>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <DollarSign className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Programs</p>
              <div className="text-2xl font-bold font-mono">
                {programsLoading ? "-" : stats?.total_programs || programs?.length || 0}
              </div>
            </div>
            <Target className="h-8 w-8 text-muted-foreground opacity-50" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Findings</p>
              <div className="text-2xl font-bold font-mono">
                {findingsLoading ? "-" : findings?.length || 0}
              </div>
            </div>
            <Bug className="h-8 w-8 text-muted-foreground opacity-50" />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" /> Recent Activity
          </h2>
          <Link href="/findings" className="text-sm text-primary hover:underline">View all</Link>
        </div>

        {findingsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse h-24" />
            ))}
          </div>
        ) : recentFindings.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            No findings yet. Add a program to start hunting.
          </div>
        ) : (
          <div className="space-y-3">
            {recentFindings.map(finding => {
              const program = programs?.find(p => p.id === finding.program_id);
              return (
                <Link key={finding.id} href={`/findings/${finding.id}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-muted-foreground uppercase">
                            {program?.name || "Unknown Program"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(finding.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                          {finding.draft_report?.title || finding.vuln_description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={`font-mono ${getStatusColor(finding.status)}`}>
                            {finding.status}
                          </Badge>
                          {finding.draft_report?.severity && (
                            <Badge variant="outline" className={`font-mono ${getSeverityColor(finding.draft_report.severity)}`}>
                              {finding.draft_report.severity}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
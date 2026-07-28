import * as React from "react"
import { cn } from "@/lib/utils"

export const getSeverityColor = (severity?: string) => {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
    case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    case 'informational': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    default: return 'text-muted-foreground bg-muted border-border';
  }
}

export const getPriorityColor = (priority?: string) => {
  switch (priority?.toLowerCase()) {
    case 'high': return 'text-red-500 bg-red-500/10 border-red-500/20';
    case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    case 'low': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    default: return 'text-muted-foreground bg-muted border-border';
  }
}

export const getStatusColor = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'draft': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    case 'submitted': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'triaged': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    case 'needs_info': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'accepted': return 'text-green-400 bg-green-500/10 border-green-500/20';
    case 'duplicate': return 'text-red-400 bg-red-500/10 border-red-500/20';
    case 'paid': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    default: return 'text-muted-foreground bg-muted border-border';
  }
}
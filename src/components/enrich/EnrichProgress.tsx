import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";

interface EnrichProgressProps {
  status: 'pending' | 'enriching' | 'completed' | 'failed' | 'partial';
  className?: string;
}

export function EnrichProgress({ status, className }: EnrichProgressProps) {
  if (status !== 'enriching') return null;

  return (
    <div className={cn("flex items-center gap-3 text-sm text-primary animate-pulse", className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="font-medium">Enriquecendo Lead...</span>
    </div>
  );
}

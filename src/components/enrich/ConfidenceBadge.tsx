import type { ConfidenceLabel } from '@/lib/enrichment/types';
import { getConfidenceColor } from '@/lib/enrichment/scoring-engine';

interface ConfidenceBadgeProps {
  label: ConfidenceLabel;
  score?: number;
}

export function ConfidenceBadge({ label, score }: ConfidenceBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${getConfidenceColor(label)}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {label}
      {score !== undefined && (
        <span className="opacity-60 font-normal">({Math.round(score * 100)}%)</span>
      )}
    </span>
  );
}

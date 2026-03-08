'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Zap } from 'lucide-react';
import { ConfidenceBadge } from './ConfidenceBadge';
import type { ConfidenceLabel } from '@/lib/enrichment/types';

interface EnrichResult {
  primaryEmail?: string;
  primaryPhone?: string;
  hasWhatsApp: boolean;
  enrichmentScore: number;
}

interface EnrichButtonProps {
  contactId: string;
  currentStatus?: string;
  onSuccess?: (result: EnrichResult) => void;
}

export function EnrichButton({ contactId, currentStatus, onSuccess }: EnrichButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnrichResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEnriched = currentStatus === 'completed';

  async function handleEnrich() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/contacts/${contactId}/enrich`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Falha no enriquecimento');

      const data = await res.json();
      setResult(data.data);
      onSuccess?.(data.data);
    } catch (err) {
      setError('Erro ao enriquecer. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const scoreLabel: ConfidenceLabel =
    !result ? 'ESPECULATIVO'
    : result.enrichmentScore >= 0.80 ? 'ALTO'
    : result.enrichmentScore >= 0.60 ? 'MÉDIO'
    : result.enrichmentScore >= 0.40 ? 'BAIXO'
    : 'ESPECULATIVO';

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="sm"
        variant={isEnriched ? 'outline' : 'default'}
        onClick={handleEnrich}
        disabled={loading}
        className="gap-1.5"
      >
        {loading ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enriquecendo...</>
        ) : (
          <><Zap className="w-3.5 h-3.5" /> {isEnriched ? 'Re-enriquecer' : 'Enriquecer'}</>
        )}
      </Button>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {result && (
        <div className="flex flex-col gap-1 text-xs">
          <ConfidenceBadge label={scoreLabel} score={result.enrichmentScore} />
          {result.primaryEmail && (
            <span className="text-gray-600">📧 {result.primaryEmail}</span>
          )}
          {result.primaryPhone && (
            <span className="text-gray-600">
              {result.hasWhatsApp ? '💬 WA:' : '📞'} {result.primaryPhone}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

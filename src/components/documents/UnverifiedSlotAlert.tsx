import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { DocumentSlot } from '@/types/domain';

export interface UnverifiedSlotAlertProps {
  slots?: DocumentSlot[];
  renderedText?: string;
  className?: string;
}

export const UnverifiedSlotAlert: React.FC<UnverifiedSlotAlertProps> = ({
  slots = [],
  renderedText = '',
  className = '',
}) => {
  // Find slots explicitly flagged by backend
  const flaggedSlots = slots.filter(
    (s) => s.needs_review || !s.verified || s.value?.includes('[BITTE PRÜFEN]')
  );

  // Also parse renderedText for any inline [BITTE PRÜFEN...] markers
  const textPattern = /\[BITTE PRÜFEN:?\s*([^\]]*)\]/g;
  const inlineMatches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = textPattern.exec(renderedText)) !== null) {
    const desc = match[1]?.trim() || 'Angabe fehlt oder ist unsicher';
    if (!inlineMatches.includes(desc)) {
      inlineMatches.push(desc);
    }
  }

  const totalUnverifiedCount = Math.max(flaggedSlots.length, inlineMatches.length);

  if (totalUnverifiedCount === 0) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-label="Warnung vor ungeprüften Datenfeldern"
      className={`p-4 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-bg-warning-subtle)] border border-[var(--ds-color-border-warning)] text-[var(--ds-color-text-warning)] space-y-2 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="w-5 h-5 shrink-0 mt-0.5 text-[var(--ds-color-text-warning)]"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <h4 className="ds-text-title-sm font-semibold text-[var(--ds-color-text-primary)]">
            Achtung: {totalUnverifiedCount} ungeprüfte{totalUnverifiedCount === 1 ? 's Datenfeld' : ' Datenfelder'} ([BITTE PRÜFEN])
          </h4>
          <p className="ds-text-body-sm text-[var(--ds-color-text-primary)]">
            Dieser Schriftsatz enthält Angaben, die von der KI nicht zweifelsfrei aus den Unterlagen belegt werden konnten. Bitte prüfen und ergänzen Sie die markierten Stellen vor dem Einreichen handschriftlich oder im Entwurf.
          </p>

          <ul className="mt-2 space-y-1 list-disc list-inside ds-text-body-sm text-[var(--ds-color-text-primary)]">
            {flaggedSlots.length > 0 ? (
              flaggedSlots.map((slot, idx) => (
                <li key={slot.key || idx}>
                  <span className="font-semibold">{slot.key}:</span>{' '}
                  <span className="font-mono bg-[var(--ds-color-surface-sunken)] px-1.5 py-0.5 rounded-[var(--ds-radius-control-sm)] border border-[var(--ds-color-border-warning)]">
                    {slot.value || '[BITTE PRÜFEN]'}
                  </span>
                </li>
              ))
            ) : (
              inlineMatches.map((desc, idx) => (
                <li key={idx}>
                  <span className="font-mono bg-[var(--ds-color-surface-sunken)] px-1.5 py-0.5 rounded-[var(--ds-radius-control-sm)] border border-[var(--ds-color-border-warning)]">
                    [BITTE PRÜFEN: {desc}]
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

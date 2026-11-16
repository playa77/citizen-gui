import React from 'react';
import { HelpCircle, AlertCircle } from 'lucide-react';

export interface TurnCounterProps {
  turnCount: number;
  maxTurns: number;
  className?: string;
}

export const TurnCounter: React.FC<TurnCounterProps> = ({
  turnCount,
  maxTurns,
  className = '',
}) => {
  const percentage = Math.min(100, Math.round((turnCount / Math.max(1, maxTurns)) * 100));
  const isNearLimit = turnCount >= maxTurns - 1;

  return (
    <div
      role="region"
      aria-label="Fortschritt des Erstberatungsinterviews"
      className={`p-4 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] space-y-2 ${className}`}
    >
      <div className="flex items-center justify-between ds-text-body-sm">
        <div className="flex items-center gap-1.5 font-semibold text-[var(--ds-color-text-primary)]">
          <HelpCircle className="w-4 h-4 text-[var(--ds-color-text-accent)]" aria-hidden="true" />
          <span>Interview-Fortschritt</span>
        </div>
        <span className="font-mono text-[var(--ds-color-text-secondary)]">
          Frage {turnCount} von {maxTurns}
        </span>
      </div>

      {/* Progress Track & Bar */}
      <div
        className="w-full h-2 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-surface-sunken)] overflow-hidden"
        role="progressbar"
        aria-valuenow={turnCount}
        aria-valuemin={0}
        aria-valuemax={maxTurns}
      >
        <div
          className="h-full bg-[var(--ds-color-bg-action-primary)]"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {isNearLimit && (
        <div className="flex items-center gap-1.5 ds-text-label-sm text-[var(--ds-color-text-warning)] pt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Das Interview nähert sich dem Abschluss. Die Sachverhaltserfassung wird vorbereitet.</span>
        </div>
      )}
    </div>
  );
};

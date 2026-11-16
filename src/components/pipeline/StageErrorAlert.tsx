import React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { useStreamingStore } from '@/stores/streamingStore';

export interface StageErrorAlertProps {
  onRetry?: () => void;
  className?: string;
}

export const StageErrorAlert: React.FC<StageErrorAlertProps> = ({
  onRetry,
  className = '',
}) => {
  const error = useStreamingStore((s) => s.error);
  const status = useStreamingStore((s) => s.status);

  if (status !== 'error' || !error) {
    return null;
  }

  return (
    <div
      role="alert"
      className={`p-4 rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-danger)] bg-[var(--ds-color-bg-danger-subtle)] text-[var(--ds-color-text-danger)] ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-danger)] text-[var(--ds-color-text-danger)] shrink-0">
          <AlertOctagon className="w-5 h-5" aria-hidden="true" />
        </div>

        <div className="flex-1 space-y-2">
          <div>
            <h3 className="ds-text-title-sm font-semibold text-[var(--ds-color-text-danger)]">
              Analyse-Fehler aufgetreten
            </h3>
            <p className="ds-text-body-sm text-[var(--ds-color-text-primary)] mt-1 font-semibold">
              {error.error}
            </p>
            {error.detail && (
              <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)] mt-0.5">
                {error.detail}
              </p>
            )}
            {error.session_id && (
              <p className="ds-text-code-sm text-[var(--ds-color-text-tertiary)] mt-1">
                Sitzungs-ID: {error.session_id}
              </p>
            )}
          </div>

          <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
            Die Analyse konnte nicht vollständig abgeschlossen werden. Dies kann auf eine
            Netzwerkunterbrechung, eine Überschreitung des Zeitlimits oder ein temporäres Problem
            der Backend-Dienste zurückzuführen sein.
          </p>

          {onRetry && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-danger)] text-[var(--ds-color-text-danger)] hover:bg-[var(--ds-color-bg-neutral-subtle-hover)] transition-colors ds-text-label-md font-semibold"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>Analyse erneut versuchen</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

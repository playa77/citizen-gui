import React, { useEffect, useState } from 'react';
import { Scale, AlertCircle } from 'lucide-react';
import { CompositionRoot } from '@/compositionRoot';
import { useComplianceStore, complianceStore } from '@/stores/complianceStore';
import { SanitizedHtml } from '@/components/common/SanitizedHtml';

export const DisclaimerModal: React.FC = () => {
  const { isDisclaimerModalOpen, currentDisclaimerVersion, disclaimerText, isLoading, error } =
    useComplianceStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // If modal is open and text is not yet loaded, load it
    if (isDisclaimerModalOpen && !disclaimerText) {
      let isCancelled = false;
      complianceStore.setLoading(true);

      CompositionRoot.disclaimer
        .fetchDisclaimerText()
        .then((res) => {
          if (!isCancelled) {
            complianceStore.setDisclaimerText(res.text, res.version);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            complianceStore.setError(
              err instanceof Error ? err.message : 'Fehler beim Laden des Hinweistextes'
            );
          }
        });

      return () => {
        isCancelled = true;
      };
    }
  }, [isDisclaimerModalOpen, disclaimerText]);

  if (!isDisclaimerModalOpen) {
    return null;
  }

  const handleAcknowledge = () => {
    if (!currentDisclaimerVersion) return;
    setIsSubmitting(true);
    try {
      CompositionRoot.disclaimer.acknowledge(currentDisclaimerVersion);
      complianceStore.setDisclaimerModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--ds-color-overlay-scrim)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-modal-title"
      aria-describedby="disclaimer-modal-description"
    >
      <div className="flex flex-col w-full max-w-2xl max-h-[85vh] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] shadow-[var(--ds-elevation-overlay)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-[var(--ds-color-border-separator)] bg-[var(--ds-color-surface-raised)]">
          <div className="flex items-center justify-center p-2 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-accent-subtle)] text-[var(--ds-color-text-accent)]">
            <Scale className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="disclaimer-modal-title" className="ds-text-title-lg text-[var(--ds-color-text-primary)]">
              Rechtlicher Hinweis & Nutzungsbedingungen
            </h2>
            {currentDisclaimerVersion && (
              <span className="ds-text-body-sm text-[var(--ds-color-text-tertiary)]">
                Version: {currentDisclaimerVersion}
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div
          id="disclaimer-modal-description"
          className="p-6 overflow-y-auto ds-text-body-md text-[var(--ds-color-text-secondary)] space-y-4"
        >
          {isLoading && !disclaimerText && (
            <div className="flex items-center justify-center py-12 text-[var(--ds-color-text-tertiary)]">
              <span className="ds-text-body-md">Rechtlicher Hinweis wird geladen…</span>
            </div>
          )}

          {error && !disclaimerText && (
            <div className="flex items-start gap-3 p-4 border rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-danger-subtle)] border-[var(--ds-color-border-danger)] text-[var(--ds-color-text-danger)]">
              <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold ds-text-body-md">Hinweistext konnte nicht geladen werden</p>
                <p className="mt-1 ds-text-body-sm">{error}</p>
              </div>
            </div>
          )}

          {disclaimerText && (
            <div className="prose max-w-none text-[var(--ds-color-text-secondary)]">
              <SanitizedHtml html={disclaimerText} />
            </div>
          )}
        </div>

        {/* Footer with Mandatory Zustimmen Button */}
        <div className="flex items-center justify-between p-6 border-t border-[var(--ds-color-border-separator)] bg-[var(--ds-color-surface-base)]">
          <p className="ds-text-body-sm text-[var(--ds-color-text-tertiary)] max-w-sm">
            Mit Ihrer Bestätigung erklären Sie sich mit den Hinweisen einverstanden.
          </p>
          <button
            type="button"
            onClick={handleAcknowledge}
            disabled={isLoading || isSubmitting || !currentDisclaimerVersion}
            className="min-h-[var(--ds-size-target-min)] px-6 py-2.5 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-action-primary)] hover:bg-[var(--ds-color-bg-action-primary-hover)] active:bg-[var(--ds-color-bg-action-primary-pressed)] disabled:bg-[var(--ds-color-bg-disabled)] text-[var(--ds-color-text-on-action)] ds-text-label-md font-semibold transition-colors ds-focus-ring cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Wird gespeichert…' : 'Zustimmen'}
          </button>
        </div>
      </div>
    </div>
  );
};

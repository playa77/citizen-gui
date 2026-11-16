import React, { useEffect, useRef } from 'react';
import { X, BookOpen, CheckCircle2, AlertTriangle, Hash, Percent } from 'lucide-react';
import type { EvidenceBinding } from '@/types/domain';
import { formatConfidenceScore } from '@/utils/formatters';

export interface EvidenceCitationDrawerProps {
  isOpen: boolean;
  binding: EvidenceBinding | null;
  onClose: () => void;
}

export const EvidenceCitationDrawer: React.FC<EvidenceCitationDrawerProps> = ({
  isOpen,
  binding,
  onClose,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !binding) {
    return null;
  }

  const { chunk_id, quote_excerpt, binding_strength, verified } = binding;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Evidenz-Zitation und Zitatnachweis"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[var(--ds-color-overlay-scrim)] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-md md:max-w-lg bg-[var(--ds-color-surface-raised)] border-l border-[var(--ds-color-border-default)] shadow-overlay flex flex-col focus:outline-none"
        >
          {/* Drawer Header */}
          <div className="px-6 py-4 border-b border-[var(--ds-color-border-default)] bg-[var(--ds-color-bg-accent-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-accent)]">
                <BookOpen className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="ds-text-title-md font-semibold text-[var(--ds-color-text-primary)]">
                  Evidenz-Zitation
                </h2>
                <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
                  Originalbeleg aus Bescheid & Urteilskorpus
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              className="flex items-center justify-center min-h-[var(--ds-size-target-min)] min-w-[var(--ds-size-target-min)] p-2 rounded-[var(--ds-radius-control)] text-[var(--ds-color-text-secondary)] hover:text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-surface-raised)] transition-colors ds-focus-ring cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Meta attributes */}
            <div className="space-y-3">
              {/* Chunk ID */}
              <div className="p-3 rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)] flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--ds-color-text-secondary)]">
                  <Hash className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="ds-text-label-sm">Text-Chunk ID</span>
                </div>
                <span className="font-mono ds-text-body-sm font-semibold text-[var(--ds-color-text-primary)] select-all">
                  {chunk_id}
                </span>
              </div>

              {/* Binding Strength & Verification Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)] space-y-1">
                  <div className="flex items-center gap-1.5 text-[var(--ds-color-text-secondary)]">
                    <Percent className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="ds-text-label-sm">Bindungsstärke</span>
                  </div>
                  <div className="ds-text-title-sm font-semibold text-[var(--ds-color-text-primary)]">
                    {formatConfidenceScore(binding_strength)}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-[var(--ds-color-surface-raised)] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[var(--ds-color-bg-action-primary)] h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, binding_strength * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)] space-y-1">
                  <span className="ds-text-label-sm text-[var(--ds-color-text-secondary)]">
                    Status
                  </span>
                  <div>
                    {verified ? (
                      <span className="inline-flex items-center gap-1 text-[var(--ds-color-text-success)] ds-text-label-sm font-semibold">
                        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>Verifiziert</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[var(--ds-color-text-warning)] ds-text-label-sm font-semibold">
                        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>Unverifiziert</span>
                      </span>
                    )}
                  </div>
                  <p className="ds-text-body-sm text-[var(--ds-color-text-tertiary)]">
                    {verified ? 'Gegen Korpus belegt' : 'Prüfung empfohlen'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quoted Excerpt */}
            <div className="space-y-2">
              <h3 className="ds-text-label-sm font-semibold text-[var(--ds-color-text-primary)] uppercase tracking-wider">
                Originaltext-Auszug
              </h3>
              <blockquote className="p-4 rounded-[var(--ds-radius-container)] border-l-4 border-l-[var(--ds-color-border-focus)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-primary)] ds-text-body-md italic leading-relaxed whitespace-pre-wrap">
                „{quote_excerpt}“
              </blockquote>
            </div>

            {/* Statutory Guidance */}
            <div className="p-4 rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)] text-[var(--ds-color-text-secondary)] space-y-2">
              <h4 className="ds-text-title-sm font-semibold text-[var(--ds-color-text-primary)]">
                Hinweis zur Beweisführung
              </h4>
              <p className="ds-text-body-sm leading-relaxed">
                Dieser Textabschnitt dient als Evidenzgrundlage für die automatische Rüge. Er wird
                bei der Erstellung eines Widerspruchsschreibens als wörtliches Zitat und
                Behördenfundstelle referenziert.
              </p>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center px-4 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)] transition-colors ds-text-label-md font-semibold cursor-pointer ds-focus-ring"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

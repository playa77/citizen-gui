import React, { useState } from 'react';
import { ShieldAlert, Building2, User, Scale } from 'lucide-react';
import type { FinalOutputStructure } from '@/types/api';

export interface AdversarialReviewCardProps {
  adversarial?: FinalOutputStructure['adversarial_verhaeltnis'];
  className?: string;
}

type TabKey = 'all' | 'authority' | 'citizen' | 'risk';

export const AdversarialReviewCard: React.FC<AdversarialReviewCardProps> = ({
  adversarial,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  if (!adversarial) {
    return null;
  }

  const { behoerden_sicht, buerger_sicht, risiko_einschaetzung } = adversarial;

  if (!behoerden_sicht && !buerger_sicht && !risiko_einschaetzung) {
    return null;
  }

  return (
    <section
      className={`border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] overflow-hidden shadow-raised ${className}`}
      role="region"
      aria-label="Mehrperspektivische Gegenprüfung"
    >
      {/* Header */}
      <div className="bg-[var(--ds-color-bg-accent-subtle)] border-b border-[var(--ds-color-border-default)] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-accent)] shrink-0">
            <Scale className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="ds-text-title-md font-semibold text-[var(--ds-color-text-primary)]">
              Mehrperspektivische Gegenprüfung
            </h2>
            <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
              Adversariale Simulation: Behördensicht, Bürgersicht und rechtliches Prozessrisiko
            </p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 p-1 bg-[var(--ds-color-surface-sunken)] rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 ds-text-label-sm font-semibold rounded-[var(--ds-radius-control-sm)] transition-colors min-h-[var(--ds-size-target-min)] ${
              activeTab === 'all'
                ? 'bg-[var(--ds-color-surface-raised)] text-[var(--ds-color-text-primary)] shadow-raised'
                : 'text-[var(--ds-color-text-secondary)] hover:text-[var(--ds-color-text-primary)]'
            }`}
          >
            Alle
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('authority')}
            className={`px-3 py-1 ds-text-label-sm font-semibold rounded-[var(--ds-radius-control-sm)] transition-colors min-h-[var(--ds-size-target-min)] ${
              activeTab === 'authority'
                ? 'bg-[var(--ds-color-surface-raised)] text-[var(--ds-color-text-primary)] shadow-raised'
                : 'text-[var(--ds-color-text-secondary)] hover:text-[var(--ds-color-text-primary)]'
            }`}
          >
            Behörde
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('citizen')}
            className={`px-3 py-1 ds-text-label-sm font-semibold rounded-[var(--ds-radius-control-sm)] transition-colors min-h-[var(--ds-size-target-min)] ${
              activeTab === 'citizen'
                ? 'bg-[var(--ds-color-surface-raised)] text-[var(--ds-color-text-primary)] shadow-raised'
                : 'text-[var(--ds-color-text-secondary)] hover:text-[var(--ds-color-text-primary)]'
            }`}
          >
            Bürger
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('risk')}
            className={`px-3 py-1 ds-text-label-sm font-semibold rounded-[var(--ds-radius-control-sm)] transition-colors min-h-[var(--ds-size-target-min)] ${
              activeTab === 'risk'
                ? 'bg-[var(--ds-color-surface-raised)] text-[var(--ds-color-text-primary)] shadow-raised'
                : 'text-[var(--ds-color-text-secondary)] hover:text-[var(--ds-color-text-primary)]'
            }`}
          >
            Risiko
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Behördensicht */}
          {(activeTab === 'all' || activeTab === 'authority') && (
            <div
              className={`p-5 rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)] flex flex-col ${
                activeTab !== 'all' ? 'md:col-span-3' : ''
              }`}
            >
              <div className="flex items-center gap-2 text-[var(--ds-color-text-primary)] pb-3 border-b border-[var(--ds-color-border-default)]">
                <Building2 className="w-5 h-5 text-[var(--ds-color-text-accent)] shrink-0" aria-hidden="true" />
                <h3 className="ds-text-title-sm font-semibold">
                  Position der Behörde (Jobcenter)
                </h3>
              </div>
              <div className="mt-3 ds-text-body-sm text-[var(--ds-color-text-secondary)] leading-relaxed whitespace-pre-wrap flex-1">
                {behoerden_sicht || 'Keine spezifische behördliche Position ermittelt.'}
              </div>
            </div>
          )}

          {/* 2. Bürgersicht */}
          {(activeTab === 'all' || activeTab === 'citizen') && (
            <div
              className={`p-5 rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)] flex flex-col ${
                activeTab !== 'all' ? 'md:col-span-3' : ''
              }`}
            >
              <div className="flex items-center gap-2 text-[var(--ds-color-text-primary)] pb-3 border-b border-[var(--ds-color-border-default)]">
                <User className="w-5 h-5 text-[var(--ds-color-text-accent)] shrink-0" aria-hidden="true" />
                <h3 className="ds-text-title-sm font-semibold">
                  Position des Bürgers (Antragsteller)
                </h3>
              </div>
              <div className="mt-3 ds-text-body-sm text-[var(--ds-color-text-secondary)] leading-relaxed whitespace-pre-wrap flex-1">
                {buerger_sicht || 'Keine bürgerseitige Position ermittelt.'}
              </div>
            </div>
          )}

          {/* 3. Risiko- & Erfolgseinschätzung */}
          {(activeTab === 'all' || activeTab === 'risk') && (
            <div
              className={`p-5 rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)] flex flex-col ${
                activeTab !== 'all' ? 'md:col-span-3' : ''
              }`}
            >
              <div className="flex items-center gap-2 text-[var(--ds-color-text-primary)] pb-3 border-b border-[var(--ds-color-border-default)]">
                <ShieldAlert className="w-5 h-5 text-[var(--ds-color-text-accent)] shrink-0" aria-hidden="true" />
                <h3 className="ds-text-title-sm font-semibold">
                  Risiko- & Erfolgseinschätzung
                </h3>
              </div>
              <div className="mt-3 ds-text-body-sm text-[var(--ds-color-text-secondary)] leading-relaxed whitespace-pre-wrap flex-1">
                {risiko_einschaetzung || 'Keine spezifische Risikoeinschätzung hinterlegt.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

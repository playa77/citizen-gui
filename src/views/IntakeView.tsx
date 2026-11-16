import React from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { IntakeWizard } from '@/components/intake/IntakeWizard';
import type { IntakeResult } from '@/types/api';

export interface IntakeViewProps {
  onStartAnalysis?: (result: IntakeResult) => void;
  className?: string;
}

export const IntakeView: React.FC<IntakeViewProps> = ({
  onStartAnalysis,
  className = '',
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Intro Header */}
      <div className="p-6 sm:p-8 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] space-y-2">
        <div className="flex items-center gap-2.5 text-[var(--ds-color-text-accent)]">
          <Sparkles className="w-5 h-5" aria-hidden="true" />
          <span className="ds-text-label-sm font-semibold uppercase tracking-wider">
            Geführte Rechtsberatungsvorbereitung
          </span>
        </div>
        <h1 className="ds-text-headline-sm font-semibold text-[var(--ds-color-text-primary)]">
          Mandatsvorbereitung & Erstberatungs-Assistent
        </h1>
        <p className="ds-text-body-md text-[var(--ds-color-text-secondary)] max-w-3xl">
          Ermitteln Sie systematisch die relevanten Rechtsgebiete (z. B. SGB II Bürgergeld, Mietrecht, Erbrecht) und klären Sie offene Tatsachenfragen, bevor Sie formelle Rechtsbehelfe einreichen.
        </p>

        {/* Legal Disclaimer Boundary reminder */}
        <div className="pt-2 flex items-center gap-2 ds-text-body-sm text-[var(--ds-color-text-tertiary)]">
          <ShieldCheck className="w-4 h-4 text-[var(--ds-color-text-accent)] shrink-0" aria-hidden="true" />
          <span>Rechtsinformation nach § 2 Abs. 1 RDG. Keine anwaltliche Beratung.</span>
        </div>
      </div>

      {/* Main Intake Wizard */}
      <IntakeWizard onStartAnalysis={onStartAnalysis} />
    </div>
  );
};

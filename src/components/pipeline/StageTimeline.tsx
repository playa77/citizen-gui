import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  Loader2,
  Circle,
} from 'lucide-react';
import {
  PIPELINE_STAGES,
  useStreamingStore,
  type StageState,
} from '@/stores/streamingStore';
import type { PipelineStage } from '@/types/events';

interface StageMeta {
  title: string;
  description: string;
}

const STAGE_METADATA: Record<PipelineStage, StageMeta> = {
  corpus_health: {
    title: 'Corpus- & Wissensbasis',
    description: 'Integritätsprüfung der Rechtsdatenbank und Urteilskorpora',
  },
  ocr_quality: {
    title: 'OCR-Qualitätsprüfung',
    description: 'Lesbarkeits- und Artefakt-Bewertung des Bescheidtexts',
  },
  normalization: {
    title: 'Textnormalisierung',
    description: 'Bereinigung von Steuerzeichen, Layout und Absatzstrukturen',
  },
  classification: {
    title: 'Bescheidklassifikation',
    description: 'Erkennung von Rechtskreis, Behördentyp und Aktenzeichen',
  },
  decomposition: {
    title: 'Strukturanalyse & Zerlegung',
    description: 'Identifikation von Berechnungsteilen, Tenor und Begründung',
  },
  retrieval: {
    title: 'Rechtsnormen- & Urteilsabruf',
    description: 'Evidenzbasierte Recherche in SGB II / SGG und BSG-Leitsätzen',
  },
  construction: {
    title: 'Argumentationsaufbau',
    description: 'Gegenüberstellung von behördlicher Berechnung und Rechtslage',
  },
  verification: {
    title: 'Evidenzverifikation',
    description: 'Faktenabgleich und Zitationsprüfung gegen den Bescheidtext',
  },
  generation: {
    title: 'Synthese & Bescheidentwurf',
    description: 'Strukturierung der Rügen und Erstellung des Prüfberichts',
  },
  adversarial_review: {
    title: 'Gegenprüfung (Behörde/Gericht)',
    description: 'Mehrperspektivische Simulation von Gegenargumenten',
  },
  calculation_check: {
    title: 'Berechnungsprüfung § 11b SGB II',
    description: 'Cent-genaue Nachberechnung von Einkommensabsetzbeträgen',
  },
};

export interface StageTimelineProps {
  className?: string;
}

export const StageTimeline: React.FC<StageTimelineProps> = ({ className = '' }) => {
  const stages = useStreamingStore((s) => s.stages);
  const activeStage = useStreamingStore((s) => s.activeStage);
  const pipelineStatus = useStreamingStore((s) => s.status);

  // Timer tick for running stages to update elapsed time live
  const [, setTick] = useState(0);
  useEffect(() => {
    if (pipelineStatus !== 'streaming' && pipelineStatus !== 'connecting') return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 200);
    return () => clearInterval(interval);
  }, [pipelineStatus]);

  const renderStatusIcon = (stageState: StageState, isActive: boolean) => {
    const { status } = stageState;

    if (status === 'running' || isActive) {
      return (
        <div
          className="flex items-center justify-center w-8 h-8 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-accent-subtle)] border border-[var(--ds-color-border-focus)] text-[var(--ds-color-text-accent)]"
          aria-hidden="true"
        >
          <Loader2 className="w-4 h-4 animate-spin text-[var(--ds-color-text-accent)]" />
        </div>
      );
    }

    if (status === 'complete' || status === 'ok') {
      return (
        <div
          className="flex items-center justify-center w-8 h-8 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-success-subtle)] border border-[var(--ds-color-border-success)] text-[var(--ds-color-text-success)]"
          aria-hidden="true"
        >
          <CheckCircle2 className="w-4 h-4" />
        </div>
      );
    }

    if (status === 'warning') {
      return (
        <div
          className="flex items-center justify-center w-8 h-8 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-warning-subtle)] border border-[var(--ds-color-border-warning)] text-[var(--ds-color-text-warning)]"
          aria-hidden="true"
        >
          <AlertTriangle className="w-4 h-4" />
        </div>
      );
    }

    if (status === 'info') {
      return (
        <div
          className="flex items-center justify-center w-8 h-8 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-accent-subtle)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-accent)]"
          aria-hidden="true"
        >
          <Info className="w-4 h-4" />
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div
          className="flex items-center justify-center w-8 h-8 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-danger-subtle)] border border-[var(--ds-color-border-danger)] text-[var(--ds-color-text-danger)]"
          aria-hidden="true"
        >
          <AlertOctagon className="w-4 h-4" />
        </div>
      );
    }

    // Pending
    return (
      <div
        className="flex items-center justify-center w-8 h-8 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-disabled)]"
        aria-hidden="true"
      >
        <Circle className="w-3.5 h-3.5" />
      </div>
    );
  };

  const getDurationString = (stageState: StageState): string | null => {
    if (stageState.durationMs !== undefined) {
      return `${(stageState.durationMs / 1000).toFixed(1)} s`;
    }
    if (stageState.status === 'running' && stageState.startedAt) {
      const elapsed = (Date.now() - stageState.startedAt) / 1000;
      return `${elapsed.toFixed(1)} s`;
    }
    return null;
  };

  const getStatusLabel = (status: StageState['status'], isActive: boolean) => {
    if (status === 'running' || isActive) return 'Wird ausgeführt…';
    if (status === 'complete' || status === 'ok') return 'Abgeschlossen';
    if (status === 'warning') return 'Hinweis';
    if (status === 'info') return 'Info';
    if (status === 'error') return 'Fehlgeschlagen';
    return 'Ausstehend';
  };

  return (
    <div
      className={`p-6 rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)] ${className}`}
      role="region"
      aria-label="Fortschritt der 11-stufigen Analyse"
    >
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--ds-color-border-default)]">
        <div>
          <h2 className="ds-text-title-md font-semibold text-[var(--ds-color-text-primary)]">
            Analyse-Pipeline (11 Stufen)
          </h2>
          <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)] mt-0.5">
            Echtzeit-Verarbeitung mit evidenzbasiertem Zitationsabgleich
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pipelineStatus === 'connecting' && (
            <span className="px-2.5 py-1 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-bg-accent-subtle)] border border-[var(--ds-color-border-focus)] text-[var(--ds-color-text-accent)] ds-text-label-sm font-semibold">
              Verbindung wird hergestellt…
            </span>
          )}
          {pipelineStatus === 'streaming' && (
            <span className="px-2.5 py-1 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-bg-accent-subtle)] border border-[var(--ds-color-border-focus)] text-[var(--ds-color-text-accent)] ds-text-label-sm font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--ds-color-text-accent)] animate-pulse" />
              Stream aktiv
            </span>
          )}
          {pipelineStatus === 'complete' && (
            <span className="px-2.5 py-1 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-bg-success-subtle)] border border-[var(--ds-color-border-success)] text-[var(--ds-color-text-success)] ds-text-label-sm font-semibold">
              Vollständig abgeschlossen
            </span>
          )}
          {pipelineStatus === 'error' && (
            <span className="px-2.5 py-1 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-bg-danger-subtle)] border border-[var(--ds-color-border-danger)] text-[var(--ds-color-text-danger)] ds-text-label-sm font-semibold">
              Fehler aufgetreten
            </span>
          )}
        </div>
      </div>

      <ol className="space-y-3" role="list">
        {PIPELINE_STAGES.map((stageId, index) => {
          const meta = STAGE_METADATA[stageId];
          const stageState = stages[stageId] || { stage: stageId, status: 'pending' };
          const isActive = activeStage === stageId;
          const duration = getDurationString(stageState);
          const statusLabel = getStatusLabel(stageState.status, isActive);

          const containerStyle = isActive
            ? 'bg-[var(--ds-color-bg-accent-subtle)] border-[var(--ds-color-border-focus)]'
            : stageState.status === 'complete' || stageState.status === 'ok'
            ? 'bg-[var(--ds-color-surface-sunken)] border-[var(--ds-color-border-default)]'
            : 'bg-[var(--ds-color-surface-base)] border-[var(--ds-color-border-default)] opacity-75';

          return (
            <li
              key={stageId}
              aria-current={isActive ? 'step' : undefined}
              className={`flex items-start justify-between p-3 rounded-[var(--ds-radius-control)] border transition-colors duration-[var(--ds-motion-duration-medium)] ${containerStyle}`}
            >
              <div className="flex items-start gap-3">
                {renderStatusIcon(stageState, isActive)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="ds-text-numeric-md text-[var(--ds-color-text-tertiary)] ds-text-body-sm font-semibold">
                      {index + 1}.
                    </span>
                    <span className="ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]">
                      {meta.title}
                    </span>
                  </div>
                  <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)] mt-0.5">
                    {meta.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0 pl-3">
                <span className="ds-text-label-sm text-[var(--ds-color-text-secondary)] font-semibold">
                  {statusLabel}
                </span>
                {duration && (
                  <span className="ds-text-numeric-md ds-text-body-sm text-[var(--ds-color-text-tertiary)] mt-0.5">
                    {duration}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

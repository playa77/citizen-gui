import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Activity,
  FileCheck2,
} from 'lucide-react';
import { CompositionRoot } from '@/compositionRoot';
import type {
  CorpusHealthResponse,
  CorpusJobStatusResponse,
} from '@/types/api';

export interface CorpusHealthMonitorProps {
  health: CorpusHealthResponse | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  pollingIntervalMs?: number;
  className?: string;
}

export const CorpusHealthMonitor: React.FC<CorpusHealthMonitorProps> = ({
  health,
  isLoading = false,
  onRefresh,
  pollingIntervalMs = 3000,
  className = '',
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<CorpusJobStatusResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleTriggerUpdate = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsUpdating(true);

    try {
      const res = await CompositionRoot.diagnostics.triggerCorpusUpdate();
      setActiveJobId(res.job_id);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Start polling worker per Doc 2 §9
      const finalStatus = await CompositionRoot.diagnostics.pollCorpusJob(
        res.job_id,
        (currentStatus) => {
          setJobStatus(currentStatus);
        },
        pollingIntervalMs,
        30 * 60 * 1000,
        controller.signal
      );

      setJobStatus(finalStatus);
      if (finalStatus.status === 'completed') {
        setSuccessMessage('Korpus-Aktualisierung erfolgreich abgeschlossen.');
        onRefresh?.();
      } else if (finalStatus.status === 'failed') {
        setErrorMessage('Korpus-Aktualisierung ist fehlgeschlagen.');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Corpus polling aborted') {
        return;
      }
      setErrorMessage(
        err instanceof Error ? err.message : 'Fehler beim Starten der Korpus-Aktualisierung'
      );
    } finally {
      setIsUpdating(false);
      abortControllerRef.current = null;
    }
  };

  if (isLoading && !health) {
    return (
      <div className={`p-8 text-center text-[var(--ds-color-text-tertiary)] ${className}`}>
        <Database className="w-8 h-8 mx-auto mb-2 animate-pulse" aria-hidden="true" />
        <p className="ds-text-body-md">Korpus-Gesundheitsstatus wird geladen…</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Health Overview Card */}
      <div className="p-5 rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-accent)]">
              <Database className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h3 className="ds-text-title-md font-semibold text-[var(--ds-color-text-primary)]">
                Vektorkorpus & Rechtsdatenbank
              </h3>
              <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
                Gesetzestexte, Fachliche Weisungen und Rechtsprechung (OpenSearch / pgvector)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {health && (
              <div className="flex items-center gap-2">
                {health.is_healthy ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ds-radius-control)] ds-text-label-md bg-[var(--ds-color-bg-success-subtle)] border border-[var(--ds-color-border-success)] text-[var(--ds-color-text-success)] font-semibold">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>Korpus bereit</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ds-radius-control)] ds-text-label-md bg-[var(--ds-color-bg-warning-subtle)] border border-[var(--ds-color-border-warning)] text-[var(--ds-color-text-warning)] font-semibold">
                    <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                    <span>Aufmerksamkeit erforderlich</span>
                  </span>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleTriggerUpdate}
              disabled={isUpdating}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-action-primary)] text-[var(--ds-color-text-on-action)] ds-text-label-md font-semibold transition-opacity disabled:opacity-50 ds-focus-ring cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{isUpdating ? 'Aktualisierung läuft…' : 'Korpus aktualisieren'}</span>
            </button>
          </div>
        </div>

        {/* Status notification banners */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-danger)] bg-[var(--ds-color-bg-danger-subtle)] text-[var(--ds-color-text-danger)] flex items-center gap-2 ds-text-body-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-success)] bg-[var(--ds-color-bg-success-subtle)] text-[var(--ds-color-text-success)] flex items-center gap-2 ds-text-body-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Live Job Progress Indicator */}
        {activeJobId && jobStatus && (
          <div
            className="mt-4 p-4 rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-focus)] bg-[var(--ds-color-surface-sunken)]"
            data-testid="corpus-job-progress"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="ds-text-label-md font-semibold text-[var(--ds-color-text-primary)] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--ds-color-text-accent)] animate-pulse" aria-hidden="true" />
                <span>Job-Status: {jobStatus.status}</span>
                {jobStatus.substage && (
                  <span className="ds-text-body-sm text-[var(--ds-color-text-secondary)] font-normal">
                    (Phase: {jobStatus.substage})
                  </span>
                )}
              </span>
              <span className="ds-text-body-sm text-[var(--ds-color-text-tertiary)] font-mono">
                Job ID: {activeJobId.slice(0, 8)}…
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mt-3">
              <div className="p-2 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-subtle)]">
                <p className="ds-text-title-sm font-semibold text-[var(--ds-color-text-primary)]">
                  {jobStatus.chunks_scraped}
                </p>
                <p className="ds-text-label-sm text-[var(--ds-color-text-tertiary)]">Gescraped</p>
              </div>
              <div className="p-2 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-subtle)]">
                <p className="ds-text-title-sm font-semibold text-[var(--ds-color-text-primary)]">
                  {jobStatus.chunks_processed}
                </p>
                <p className="ds-text-label-sm text-[var(--ds-color-text-tertiary)]">Verarbeitet</p>
              </div>
              <div className="p-2 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-subtle)]">
                <p className="ds-text-title-sm font-semibold text-[var(--ds-color-text-primary)]">
                  {jobStatus.chunks_embedded}
                </p>
                <p className="ds-text-label-sm text-[var(--ds-color-text-tertiary)]">Eingebettet</p>
              </div>
              <div className="p-2 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-subtle)]">
                <p className="ds-text-title-sm font-semibold text-[var(--ds-color-text-primary)]">
                  {jobStatus.chunks_upserted}
                </p>
                <p className="ds-text-label-sm text-[var(--ds-color-text-tertiary)]">Gespeichert</p>
              </div>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        {health && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
            <div className="p-4 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-subtle)]">
              <div className="flex items-center gap-2 text-[var(--ds-color-text-secondary)] mb-1">
                <Layers className="w-4 h-4" aria-hidden="true" />
                <span className="ds-text-label-md">Gesamtzahl Chunks</span>
              </div>
              <p className="ds-text-title-lg font-semibold text-[var(--ds-color-text-primary)]" data-testid="total-chunks">
                {health.total_chunks.toLocaleString('de-DE')}
              </p>
            </div>

            <div className="p-4 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-subtle)]">
              <div className="flex items-center gap-2 text-[var(--ds-color-text-secondary)] mb-1">
                <Database className="w-4 h-4" aria-hidden="true" />
                <span className="ds-text-label-md">Aktive Quellen</span>
              </div>
              <p className="ds-text-title-lg font-semibold text-[var(--ds-color-text-primary)]" data-testid="total-sources">
                {health.total_sources}
              </p>
            </div>

            <div className="p-4 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-subtle)]">
              <div className="flex items-center gap-2 text-[var(--ds-color-text-secondary)] mb-1">
                <FileCheck2 className="w-4 h-4" aria-hidden="true" />
                <span className="ds-text-label-md">Integritätsstatus</span>
              </div>
              <p className="ds-text-title-lg font-semibold text-[var(--ds-color-text-primary)]">
                {health.is_healthy ? 'Optimal' : 'Warnungen'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Warnings List (if any) */}
      {health?.warnings && health.warnings.length > 0 && (
        <div className="p-4 rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-warning)] bg-[var(--ds-color-bg-warning-subtle)]">
          <div className="flex items-center gap-2 text-[var(--ds-color-text-warning)] font-semibold mb-2 ds-text-label-md">
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            <span>Korpus-Hinweise ({health.warnings.length})</span>
          </div>
          <ul className="list-disc list-inside space-y-1 ds-text-body-sm text-[var(--ds-color-text-warning)]">
            {health.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Sources Table */}
      {health?.sources && health.sources.length > 0 && (
        <div className="overflow-x-auto rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)]">
          <table className="w-full text-left border-collapse" role="table" aria-label="Korpus-Quellen Übersicht">
            <thead>
              <tr className="border-b border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)]">
                <th scope="col" className="p-3.5 ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]">
                  Quelltyp (Source)
                </th>
                <th scope="col" className="p-3.5 ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]">
                  Chunk-Anzahl
                </th>
                <th scope="col" className="p-3.5 ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]">
                  Letzte Aktualisierung
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ds-color-border-subtle)]">
              {health.sources.map((src) => (
                <tr key={src.type} className="hover:bg-[var(--ds-color-bg-neutral-subtle)] transition-colors">
                  <td className="p-3.5">
                    <span className="font-mono font-semibold ds-text-body-md text-[var(--ds-color-text-primary)]">
                      {src.type}
                    </span>
                  </td>
                  <td className="p-3.5 ds-text-body-md text-[var(--ds-color-text-secondary)] font-mono">
                    {src.chunk_count.toLocaleString('de-DE')}
                  </td>
                  <td className="p-3.5 ds-text-body-sm text-[var(--ds-color-text-tertiary)] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{src.last_updated ? new Date(src.last_updated).toLocaleString('de-DE') : '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

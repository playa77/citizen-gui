import React, { useState } from 'react';
import {
  FileCode,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  BarChart2,
  GitCommit,
  AlertCircle,
} from 'lucide-react';
import type {
  GoldsetResponse,
  EvalReportSummary,
  GoldsetCaseSummary,
} from '@/types/api';

export interface GoldsetReportViewerProps {
  goldset: GoldsetResponse | null;
  evalReports: EvalReportSummary[];
  isLoading?: boolean;
  className?: string;
}

export const GoldsetReportViewer: React.FC<GoldsetReportViewerProps> = ({
  goldset,
  evalReports,
  isLoading = false,
  className = '',
}) => {
  const [selectedCase, setSelectedCase] = useState<GoldsetCaseSummary | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    evalReports.length > 0 ? (evalReports[0]?.report_id ?? null) : null
  );

  const activeReport =
    evalReports.find((r) => r.report_id === selectedReportId) || evalReports[0];

  if (isLoading && !goldset && evalReports.length === 0) {
    return (
      <div className={`p-8 text-center text-[var(--ds-color-text-tertiary)] ${className}`}>
        <BarChart2 className="w-8 h-8 mx-auto mb-2 animate-pulse" aria-hidden="true" />
        <p className="ds-text-body-md">Prüfstand- und Goldset-Daten werden geladen…</p>
      </div>
    );
  }

  const formatPercent = (val: number | undefined) => {
    if (val === undefined || Number.isNaN(val)) return '—';
    return `${(val * 100).toFixed(1)}%`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Latest Evaluation Metrics Summary */}
      {activeReport ? (
        <div className="p-5 rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-[var(--ds-color-border-subtle)]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="ds-text-title-md font-semibold text-[var(--ds-color-text-primary)]">
                  Evaluations-Report: {activeReport.report_id}
                </h3>
                {activeReport.aggregate.zero_regression !== false ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ds-radius-control-sm)] ds-text-label-sm bg-[var(--ds-color-bg-success-subtle)] border border-[var(--ds-color-border-success)] text-[var(--ds-color-text-success)] font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Zero-Regression Gate: Bestanden</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ds-radius-control-sm)] ds-text-label-sm bg-[var(--ds-color-bg-danger-subtle)] border border-[var(--ds-color-border-danger)] text-[var(--ds-color-text-danger)] font-semibold">
                    <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Zero-Regression Gate: Verletzt</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 ds-text-body-sm text-[var(--ds-color-text-secondary)]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[var(--ds-color-text-tertiary)]" aria-hidden="true" />
                  <span>{new Date(activeReport.run_timestamp).toLocaleString('de-DE')}</span>
                </span>
                {activeReport.git_sha && (
                  <span className="flex items-center gap-1 font-mono text-[var(--ds-color-text-tertiary)]">
                    <GitCommit className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>SHA: {activeReport.git_sha.slice(0, 7)}</span>
                  </span>
                )}
                <span>Goldset: v{activeReport.goldset_version}</span>
                <span>Fälle: {activeReport.case_count}</span>
              </div>
            </div>

            {/* Select report dropdown */}
            {evalReports.length > 1 && (
              <select
                value={activeReport.report_id}
                onChange={(e) => setSelectedReportId(e.target.value)}
                className="px-3 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-base)] text-[var(--ds-color-text-primary)] ds-text-body-md ds-focus-ring cursor-pointer"
                aria-label="Evaluationsbericht auswählen"
              >
                {evalReports.map((r) => (
                  <option key={r.report_id} value={r.report_id}>
                    {r.report_id} (v{r.goldset_version})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-subtle)]">
              <span className="ds-text-label-sm text-[var(--ds-color-text-tertiary)]">Issue Recall</span>
              <p className="ds-text-title-lg font-semibold text-[var(--ds-color-text-primary)] mt-1" data-testid="metric-issue-recall">
                {formatPercent(activeReport.aggregate.issue_recall)}
              </p>
              <span className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">Erkannte Rechtsfehler</span>
            </div>

            <div className="p-3.5 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-subtle)]">
              <span className="ds-text-label-sm text-[var(--ds-color-text-tertiary)]">Citation Precision</span>
              <p className="ds-text-title-lg font-semibold text-[var(--ds-color-text-primary)] mt-1" data-testid="metric-citation-precision">
                {formatPercent(activeReport.aggregate.citation_precision)}
              </p>
              <span className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">Präzision der Belege</span>
            </div>

            <div className="p-3.5 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-subtle)]">
              <span className="ds-text-label-sm text-[var(--ds-color-text-tertiary)]">Berechnungs-Match</span>
              <p className="ds-text-title-lg font-semibold text-[var(--ds-color-text-primary)] mt-1">
                {formatPercent(activeReport.aggregate.calculation_exact_match ?? 1.0)}
              </p>
              <span className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">Exakte Beträge</span>
            </div>

            <div className="p-3.5 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-subtle)]">
              <span className="ds-text-label-sm text-[var(--ds-color-text-tertiary)]">Fristen-Match</span>
              <p className="ds-text-title-lg font-semibold text-[var(--ds-color-text-primary)] mt-1">
                {formatPercent(activeReport.aggregate.frist_exact_match ?? 1.0)}
              </p>
              <span className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">Fristberechnung (§ 84 SGG)</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)]">
          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-[var(--ds-color-text-tertiary)]" aria-hidden="true" />
          <p className="ds-text-body-md text-[var(--ds-color-text-secondary)]">
            Keine Evaluations-Reports gefunden.
          </p>
        </div>
      )}

      {/* Goldset Manifest & Test Cases */}
      {goldset && (
        <div className="p-5 rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-accent)]">
                <FileCode className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="ds-text-title-md font-semibold text-[var(--ds-color-text-primary)]">
                    {goldset.goldset.title || 'Synthetisches Prüf-Goldset'}
                  </h3>
                  <span className="px-2 py-0.5 ds-text-label-sm rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-secondary)] font-mono">
                    v{goldset.goldset.version}
                  </span>
                </div>
                <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
                  {goldset.goldset.description || 'Standardisierte Referenzfälle zur regressionsfreien Validierung der Analyse-Engine.'}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ds-radius-control)] ds-text-label-md bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-primary)] font-semibold">
              <Layers className="w-4 h-4 text-[var(--ds-color-text-tertiary)]" aria-hidden="true" />
              <span>{goldset.cases.length} Prüffälle hinterlegt</span>
            </span>
          </div>

          {/* Test cases list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {goldset.cases.map((cs) => {
              const isSelected = selectedCase?.id === cs.id;
              return (
                <div
                  key={cs.id}
                  onClick={() => setSelectedCase(isSelected ? null : cs)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedCase(isSelected ? null : cs);
                    }
                  }}
                  className={`p-3.5 rounded-[var(--ds-radius-control)] border transition-colors cursor-pointer ds-focus-ring ${
                    isSelected
                      ? 'border-[var(--ds-color-border-focus)] bg-[var(--ds-color-surface-sunken)]'
                      : 'border-[var(--ds-color-border-subtle)] bg-[var(--ds-color-surface-base)] hover:bg-[var(--ds-color-bg-neutral-subtle)]'
                  }`}
                  data-testid={`goldset-case-${cs.id}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]">
                      {cs.id}
                    </span>
                    <span className="px-2 py-0.5 ds-text-label-sm rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-secondary)]">
                      {cs.legal_area}
                    </span>
                  </div>
                  <h4 className="ds-text-body-md font-semibold text-[var(--ds-color-text-primary)]">
                    {cs.title}
                  </h4>
                  <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)] mt-1 line-clamp-2">
                    {cs.description}
                  </p>

                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-[var(--ds-color-border-subtle)] ds-text-body-sm text-[var(--ds-color-text-primary)]">
                      <div className="flex items-center gap-1.5 text-[var(--ds-color-text-success)] font-semibold">
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        <span>Erwartete Befunde: {cs.expected_findings_count ?? 'Vollständig spezifiziert'}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

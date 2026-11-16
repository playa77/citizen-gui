import React, { useEffect, useState } from 'react';
import {
  FolderArchive,
  Calendar,
  FileText,
  Trash2,
  Download,
  Eye,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  Scale,
} from 'lucide-react';
import { CompositionRoot } from '@/compositionRoot';
import type { CaseSummary } from '@/types/domain';
import { formatDateGerman } from '@/utils/formatters';

export interface CaseArchiveViewProps {
  onSelectCase?: (caseId: string) => void;
  className?: string;
}

export const CaseArchiveView: React.FC<CaseArchiveViewProps> = ({
  onSelectCase,
  className = '',
}) => {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchCases = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await CompositionRoot.cases.listRecentCases();
      setCases(data);
    } catch (err) {
      console.error('[CaseArchiveView] Failed to load cases:', err);
      setError(
        err instanceof Error ? err.message : 'Fehler beim Laden des Fall-Archivs.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleDelete = async (caseId: string, title: string) => {
    const confirmed = window.confirm(
      `Möchten Sie den Fall „${title || caseId}“ wirklich unwiderruflich löschen?`
    );
    if (!confirmed) return;

    setDeletingId(caseId);
    try {
      await CompositionRoot.cases.deleteCase(caseId);
      setCases((prev) => prev.filter((c) => c.id !== caseId));
      setActionSuccess(`Fall „${title || caseId}“ wurde gelöscht.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.error('[CaseArchiveView] Deletion error:', err);
      alert(
        err instanceof Error
          ? err.message
          : 'Fehler beim Löschen des Falls.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = async (caseId: string, format: 'json' | 'markdown') => {
    try {
      const blob = await CompositionRoot.cases.downloadExport(caseId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `case_${caseId}.${format === 'json' ? 'json' : 'md'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('[CaseArchiveView] Export error:', err);
      alert('Fehler beim Herunterladen des Fall-Exports.');
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Banner */}
      <div className="p-6 sm:p-8 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-accent-subtle)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-accent)] shrink-0">
            <FolderArchive className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="ds-text-headline-sm font-semibold text-[var(--ds-color-text-primary)]">
              Fall-Archiv
            </h1>
            <p className="mt-1 ds-text-body-md text-[var(--ds-color-text-secondary)]">
              Übersicht der analysierten Bescheide und gespeicherten Aktenvorgänge
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchCases}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)] transition-colors ds-text-label-md font-semibold cursor-pointer ds-focus-ring self-start sm:self-auto"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Clock className="w-4 h-4" aria-hidden="true" />
          )}
          <span>Aktualisieren</span>
        </button>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div
          role="status"
          className="p-4 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-bg-success-subtle)] border border-[var(--ds-color-border-success)] text-[var(--ds-color-text-success)] flex items-center gap-2 ds-text-body-sm font-semibold"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-bg-danger-subtle)] border border-[var(--ds-color-border-danger)] text-[var(--ds-color-text-danger)] flex items-center gap-2 ds-text-body-sm font-semibold"
        >
          <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 text-[var(--ds-color-text-secondary)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--ds-color-text-accent)]" aria-hidden="true" />
          <p className="ds-text-body-md">Fälle werden geladen…</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && cases.length === 0 && (
        <div className="p-12 text-center border border-dashed border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-sunken)] space-y-3">
          <FileText className="w-10 h-10 text-[var(--ds-color-text-disabled)] mx-auto" aria-hidden="true" />
          <h2 className="ds-text-title-md font-semibold text-[var(--ds-color-text-primary)]">
            Keine archivierten Fälle vorhanden
          </h2>
          <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)] max-w-md mx-auto">
            Sobald Sie einen Bescheid analysieren und der Vorgang abgeschlossen ist, wird er hier
            dauerhaft zur Einsicht und Bearbeitung aufgeführt.
          </p>
        </div>
      )}

      {/* Case List */}
      {!isLoading && cases.length > 0 && (
        <div className="space-y-4" role="feed" aria-label="Archivierte Fälle">
          {cases.map((c) => (
            <article
              key={c.id}
              className="p-5 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] hover:border-[var(--ds-color-border-focus)] transition-colors space-y-3 shadow-raised"
              aria-label={`Fall: ${c.title || c.id}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="ds-text-title-md font-semibold text-[var(--ds-color-text-primary)]">
                      {c.title || 'Unbenannter Bescheid'}
                    </h2>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-[var(--ds-radius-control-sm)] ds-text-label-sm font-semibold ${
                        c.status === 'completed'
                          ? 'bg-[var(--ds-color-bg-success-subtle)] border border-[var(--ds-color-border-success)] text-[var(--ds-color-text-success)]'
                          : c.status === 'failed'
                          ? 'bg-[var(--ds-color-bg-danger-subtle)] border border-[var(--ds-color-border-danger)] text-[var(--ds-color-text-danger)]'
                          : 'bg-[var(--ds-color-bg-accent-subtle)] border border-[var(--ds-color-border-focus)] text-[var(--ds-color-text-accent)]'
                      }`}
                    >
                      {c.status === 'completed'
                        ? 'Abgeschlossen'
                        : c.status === 'failed'
                        ? 'Fehlgeschlagen'
                        : 'In Bearbeitung'}
                    </span>

                    {/* Legal Areas */}
                    {c.legal_areas?.map((la, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-secondary)] ds-text-label-sm"
                      >
                        <Scale className="w-3 h-3" aria-hidden="true" />
                        <span>{la.legal_area}</span>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-[var(--ds-color-text-tertiary)] ds-text-body-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{formatDateGerman(c.created_at)}</span>
                    </span>
                    <span className="font-mono ds-text-body-sm">ID: {c.id}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  {/* Export Options */}
                  <button
                    type="button"
                    onClick={() => handleExport(c.id, 'json')}
                    title="Als JSON exportieren"
                    aria-label={`Fall ${c.title || c.id} als JSON exportieren`}
                    className="p-2 min-h-[var(--ds-size-target-min)] min-w-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)] text-[var(--ds-color-text-secondary)] hover:text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)] ds-focus-ring cursor-pointer flex items-center justify-center"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                    <span className="ml-1 ds-text-label-sm font-semibold">JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExport(c.id, 'markdown')}
                    title="Als Markdown exportieren"
                    aria-label={`Fall ${c.title || c.id} als Markdown exportieren`}
                    className="p-2 min-h-[var(--ds-size-target-min)] min-w-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)] text-[var(--ds-color-text-secondary)] hover:text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)] ds-focus-ring cursor-pointer flex items-center justify-center"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                    <span className="ml-1 ds-text-label-sm font-semibold">MD</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id, c.title)}
                    disabled={deletingId === c.id}
                    title="Fall löschen"
                    aria-label={`Fall ${c.title || c.id} löschen`}
                    className="p-2 min-h-[var(--ds-size-target-min)] min-w-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)] text-[var(--ds-color-text-secondary)] hover:text-[var(--ds-color-text-danger)] hover:bg-[var(--ds-color-bg-danger-subtle)] ds-focus-ring cursor-pointer flex items-center justify-center"
                  >
                    {deletingId === c.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>

                  {/* Open / Select Button */}
                  {onSelectCase && (
                    <button
                      type="button"
                      onClick={() => onSelectCase(c.id)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-action-primary)] text-[var(--ds-color-text-on-action)] hover:opacity-90 transition-opacity ds-text-label-md font-semibold cursor-pointer ds-focus-ring"
                    >
                      <Eye className="w-4 h-4" aria-hidden="true" />
                      <span>Öffnen</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Text Preview */}
              {c.input_preview && (
                <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)] line-clamp-2 bg-[var(--ds-color-surface-sunken)] p-3 rounded-[var(--ds-radius-container)] font-mono">
                  „{c.input_preview}“
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

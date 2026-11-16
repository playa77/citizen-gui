import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Download,
  AlertCircle,
  Loader2,
  FileText,
  ShieldCheck,
  ListChecks,
} from 'lucide-react';
import { CompositionRoot } from '@/compositionRoot';
import type { CaseDetail, EvidenceBinding, AdjudicationStatus } from '@/types/domain';
import { DeadlineBanner } from '@/components/dossier/DeadlineBanner';
import { CalculationTable } from '@/components/dossier/CalculationTable';
import { AdversarialReviewCard } from '@/components/dossier/AdversarialReviewCard';
import { ClaimCard } from '@/components/dossier/ClaimCard';
import { EvidenceCitationDrawer } from '@/components/dossier/EvidenceCitationDrawer';
import { formatDateGerman } from '@/utils/formatters';

export interface CaseDetailViewProps {
  caseId: string;
  onBack?: () => void;
  className?: string;
}

export const CaseDetailView: React.FC<CaseDetailViewProps> = ({
  caseId,
  onBack,
  className = '',
}) => {
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<EvidenceBinding | null>(null);
  const [showInputText, setShowInputText] = useState(false);

  const fetchCase = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await CompositionRoot.cases.getCase(caseId);
      setCaseData(data);
    } catch (err) {
      console.error('[CaseDetailView] Error loading case:', err);
      const is404 =
        err instanceof Error &&
        (err.message.includes('404') || err.message.includes('not found') || (err as any).status === 404);
      setError(
        is404
          ? 'Der angeforderte Fall existiert nicht oder wurde gelöscht.'
          : err instanceof Error
          ? err.message
          : 'Fehler beim Laden des Falles.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCase();
  }, [caseId]);

  const handleAdjudicate = async (claimId: string, status: AdjudicationStatus) => {
    if (!caseData) return;
    try {
      await CompositionRoot.cases.adjudicate(caseId, {
        target_type: 'claim',
        target_id: claimId,
        status,
      });

      // Update claim locally
      setCaseData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          claims: prev.claims.map((c) =>
            c.id === claimId ? { ...c, user_status: status } : c
          ),
          user_edits: {
            ...prev.user_edits,
            section_adjudications: {
              ...prev.user_edits?.section_adjudications,
              [claimId]: status,
            },
          },
        };
      });
    } catch (err) {
      console.error('[CaseDetailView] Adjudicate error:', err);
      alert('Fehler beim Speichern der menschlichen Prüfung.');
      throw err;
    }
  };

  const handleEditClaim = async (claimId: string, newText: string) => {
    if (!caseData) return;
    try {
      const updated = await CompositionRoot.cases.patchClaim(caseId, claimId, newText);
      setCaseData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          claims: prev.claims.map((c) =>
            c.id === claimId ? { ...c, claim_text: updated.claim_text } : c
          ),
          user_edits: {
            ...prev.user_edits,
            edited_claims: {
              ...prev.user_edits?.edited_claims,
              [claimId]: newText,
            },
          },
        };
      });
    } catch (err) {
      console.error('[CaseDetailView] Edit claim error:', err);
      alert('Fehler beim Aktualisieren der Rüge.');
      throw err;
    }
  };

  const handleExport = async (format: 'json' | 'markdown') => {
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
      console.error('[CaseDetailView] Export error:', err);
      alert('Fehler beim Exportieren des Falles.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3 text-[var(--ds-color-text-secondary)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--ds-color-text-accent)]" aria-hidden="true" />
        <p className="ds-text-body-md">Fallvorgang wird geladen…</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-8 border border-[var(--ds-color-border-danger)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-bg-danger-subtle)] text-[var(--ds-color-text-danger)] space-y-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 shrink-0" aria-hidden="true" />
          <h2 className="ds-text-title-md font-semibold">Fall konnte nicht geladen werden</h2>
        </div>
        <p className="ds-text-body-md">{error || 'Unbekannter Fehler beim Laden des Falles.'}</p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)] ds-text-label-md font-semibold cursor-pointer ds-focus-ring"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Zur Übersicht</span>
          </button>
        )}
      </div>
    );
  }

  const { final_output, claims = [] } = caseData;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-1.5 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)] text-[var(--ds-color-text-secondary)] hover:text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)] ds-text-label-md cursor-pointer ds-focus-ring self-start"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Zurück zum Archiv</span>
          </button>
        )}

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleExport('json')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)] text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)] ds-text-label-sm font-semibold cursor-pointer ds-focus-ring"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>JSON Export</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('markdown')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)] text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)] ds-text-label-sm font-semibold cursor-pointer ds-focus-ring"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Markdown Export</span>
          </button>
        </div>
      </div>

      {/* Case Header Card */}
      <section className="p-6 sm:p-8 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="ds-text-headline-sm font-semibold text-[var(--ds-color-text-primary)]">
              {caseData.title || 'Prüfbericht & Mandatsdossier'}
            </h1>
            <div className="flex items-center gap-3 text-[var(--ds-color-text-secondary)] ds-text-body-sm flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" aria-hidden="true" />
                <span>Erstellt am: {formatDateGerman(caseData.created_at)}</span>
              </span>
              <span>·</span>
              <span className="font-mono ds-text-body-sm">Fall-ID: {caseData.id}</span>
              {caseData.session_id && (
                <>
                  <span>·</span>
                  <span className="font-mono ds-text-body-sm">Sitzung: {caseData.session_id}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-[var(--ds-radius-control-sm)] ds-text-label-sm font-semibold ${
                caseData.status === 'completed'
                  ? 'bg-[var(--ds-color-bg-success-subtle)] border border-[var(--ds-color-border-success)] text-[var(--ds-color-text-success)]'
                  : 'bg-[var(--ds-color-bg-accent-subtle)] border border-[var(--ds-color-border-focus)] text-[var(--ds-color-text-accent)]'
              }`}
            >
              {caseData.status === 'completed' ? 'Abgeschlossen' : caseData.status}
            </span>
          </div>
        </div>

        {/* Provenance Banner (EU AI Act Art. 50 Compliance) */}
        <div
          role="note"
          className="p-3.5 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-default)] flex items-center justify-between flex-wrap gap-2 ds-text-body-sm"
        >
          <div className="flex items-center gap-2 text-[var(--ds-color-text-secondary)]">
            <ShieldCheck className="w-4 h-4 text-[var(--ds-color-text-accent)] shrink-0" aria-hidden="true" />
            <span className="font-semibold">
              Provenienz-Spezifikation: <span className="font-mono">citizen-provenance-v1.1</span>
            </span>
          </div>
          <span className="text-[var(--ds-color-text-tertiary)]">
            Rechtsinformation, keine Rechtsberatung gem. § 2 RDG
          </span>
        </div>
      </section>

      {/* 1. Statutory Deadline Banner */}
      {final_output?.fristen && (
        <DeadlineBanner fristen={final_output.fristen} />
      )}

      {/* 2. SGB II Calculation Cascade Table */}
      {final_output?.berechnung && (
        <CalculationTable berechnung={final_output.berechnung} />
      )}

      {/* 3. Adversarial Review */}
      {final_output?.adversarial_verhaeltnis && (
        <AdversarialReviewCard adversarial={final_output.adversarial_verhaeltnis} />
      )}

      {/* 4. Atomic Claims & Human Adjudication */}
      <section className="space-y-4" role="region" aria-label="Feststellungen und Rügen">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--ds-color-border-default)]">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-[var(--ds-color-text-accent)]" aria-hidden="true" />
            <h2 className="ds-text-title-md font-semibold text-[var(--ds-color-text-primary)]">
              Ermittelte Feststellungen & Rügen ({claims.length})
            </h2>
          </div>
          <span className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
            Evidenzprüfung & Benutzerentscheidung
          </span>
        </div>

        {claims.length === 0 ? (
          <div className="p-6 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] text-[var(--ds-color-text-secondary)]">
            <p className="ds-text-body-md">Keine spezifischen Einzelrügen im Dossier erfasst.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {claims.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                caseId={caseId}
                onAdjudicate={handleAdjudicate}
                onEditClaim={handleEditClaim}
                onSelectCitation={(binding) => setSelectedCitation(binding)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 5. Input Text Accordion */}
      {caseData.input_text && (
        <section className="border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[var(--ds-color-text-secondary)]" aria-hidden="true" />
              <h3 className="ds-text-title-sm font-semibold text-[var(--ds-color-text-primary)]">
                Ursprünglicher Bescheidtext (OCR-Extrakt)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowInputText((prev) => !prev)}
              className="text-[var(--ds-color-text-accent)] hover:underline ds-text-label-sm font-semibold cursor-pointer ds-focus-ring"
            >
              {showInputText ? 'Einklappen' : 'Volltext anzeigen'}
            </button>
          </div>

          {showInputText && (
            <pre className="p-4 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-primary)] ds-text-body-sm font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
              {caseData.input_text}
            </pre>
          )}
        </section>
      )}

      {/* Citation Slide-Over Drawer */}
      <EvidenceCitationDrawer
        isOpen={Boolean(selectedCitation)}
        binding={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
};

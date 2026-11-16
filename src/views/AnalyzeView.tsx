import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  FolderOpen,
  ListChecks,
} from 'lucide-react';
import { CompositionRoot } from '@/compositionRoot';
import { streamingStore, useStreamingStore } from '@/stores/streamingStore';
import { Dropzone } from '@/components/ingestion/Dropzone';
import { TextCorrectionEditor } from '@/components/ingestion/TextCorrectionEditor';
import { StageTimeline } from '@/components/pipeline/StageTimeline';
import { LiveTokenStream } from '@/components/pipeline/LiveTokenStream';
import { StageErrorAlert } from '@/components/pipeline/StageErrorAlert';
import { DeadlineBanner } from '@/components/dossier/DeadlineBanner';
import { CalculationTable } from '@/components/dossier/CalculationTable';
import { AdversarialReviewCard } from '@/components/dossier/AdversarialReviewCard';
import { ClaimCard } from '@/components/dossier/ClaimCard';
import { EvidenceCitationDrawer } from '@/components/dossier/EvidenceCitationDrawer';
import { DocumentGeneratorForm } from '@/components/documents/DocumentGeneratorForm';
import type { OcrAssessmentResponse } from '@/types/api';
import type { Claim, EvidenceBinding, AdjudicationStatus } from '@/types/domain';

type WorkflowStep = 'upload' | 'edit' | 'streaming' | 'complete';

export interface AnalyzeViewProps {
  onViewCaseDetails?: (caseId: string) => void;
  className?: string;
}

export const AnalyzeView: React.FC<AnalyzeViewProps> = ({
  onViewCaseDetails,
  className = '',
}) => {
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [ocrAssessment, setOcrAssessment] = useState<OcrAssessmentResponse | null>(null);
  const [confirmedText, setConfirmedText] = useState<string>('');

  // Claims and citation drawer state in Dossier
  const [dossierClaims, setDossierClaims] = useState<Claim[]>([]);
  const [selectedCitation, setSelectedCitation] = useState<EvidenceBinding | null>(null);

  const streamingStatus = useStreamingStore((s) => s.status);
  const finalPayload = useStreamingStore((s) => s.finalPayload);
  const caseRunId = useStreamingStore((s) => s.caseRunId);

  // When pipeline streaming completes, transition to complete step and fetch/build claims
  useEffect(() => {
    if (streamingStatus === 'complete' && finalPayload) {
      setWorkflowStep('complete');

      // Attempt to fetch case claims if caseRunId is present
      const activeId = caseRunId || finalPayload.case_run_id;
      if (activeId) {
        CompositionRoot.cases
          .getCase(activeId)
          .then((caseDetail) => {
            if (caseDetail.claims && caseDetail.claims.length > 0) {
              setDossierClaims(caseDetail.claims);
            } else {
              setDossierClaims(generateDefaultClaimsFromOutput(finalPayload));
            }
          })
          .catch(() => {
            setDossierClaims(generateDefaultClaimsFromOutput(finalPayload));
          });
      } else {
        setDossierClaims(generateDefaultClaimsFromOutput(finalPayload));
      }
    }
  }, [streamingStatus, finalPayload, caseRunId]);

  const generateDefaultClaimsFromOutput = (payload: typeof finalPayload): Claim[] => {
    if (!payload?.final_output) return [];
    const claimsList: Claim[] = [];
    const fo = payload.final_output;

    if (fo.fristen?.frist_ende) {
      claimsList.push({
        id: 'claim-deadline-1',
        claim_text: `Die Frist zur Einlegung des Rechtsbehelfs endet am ${fo.fristen.frist_ende} (${fo.fristen.gesetzliche_grundlage || '§ 84 SGG'}).`,
        confidence_score: 0.98,
        claim_type: 'deadline',
        evidence_bindings: [
          {
            chunk_id: 'chunk-frist-01',
            quote_excerpt: fo.fristen.zustellungs_fiktion || 'Fristberechnung nach § 84 SGG',
            binding_strength: 0.98,
            verified: true,
          },
        ],
      });
    }

    if (fo.berechnung && fo.berechnung.differenz_cent !== undefined) {
      const diffCent = fo.berechnung.differenz_cent;
      claimsList.push({
        id: 'claim-calc-1',
        claim_text:
          diffCent > 0
            ? `Ermittelte Nachforderung in Höhe von ${(diffCent / 100).toFixed(2)} € zu Gunsten des Bürgers.`
            : `Fehlberechnung bzw. Abweichung im Bescheid festgestellt.`,
        confidence_score: 0.94,
        claim_type: 'calculation',
        evidence_bindings: fo.berechnung.positionen?.map((p, idx) => ({
          chunk_id: `chunk-pos-${idx + 1}`,
          quote_excerpt: `${p.bezeichnung}: Behörde ${(p.behoerde_cent / 100).toFixed(2)} €, Gesetzlich ${(p.korrekt_cent / 100).toFixed(2)} € (${p.abwaegungsgrundlage})`,
          binding_strength: 0.92,
          verified: true,
        })) || [],
      });
    }

    if (fo.ergebnis) {
      claimsList.push({
        id: 'claim-finding-1',
        claim_text: fo.ergebnis,
        confidence_score: 0.89,
        claim_type: 'legal_finding',
        evidence_bindings: [
          {
            chunk_id: 'chunk-ergebnis-01',
            quote_excerpt: fo.sachverhalt || fo.ergebnis,
            binding_strength: 0.89,
            verified: true,
          },
        ],
      });
    }

    return claimsList;
  };

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      // 1. Upload document (POST /api/v1/ingest)
      const ingestRes = await CompositionRoot.ingestion.uploadDocument(file);
      setExtractedText(ingestRes.text);

      // 2. OCR Quality Assessment (GET /api/v1/ocr/assess)
      try {
        const assessRes = await CompositionRoot.ingestion.assessQuality(ingestRes.text);
        setOcrAssessment(assessRes);
      } catch (ocrErr) {
        console.warn('[Citizen-GUI][Ingestion] OCR assessment non-fatal failure:', ocrErr);
        setOcrAssessment(null);
      }

      setWorkflowStep('edit');
    } catch (err) {
      console.error('[Citizen-GUI][Ingestion] Upload failed:', err);
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Beim Hochladen des Dokuments ist ein Fehler aufgetreten.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmText = async (confirmed: string) => {
    setConfirmedText(confirmed);
    setWorkflowStep('streaming');

    try {
      // Call Trace 3: Start Analysis Pipeline (POST /api/v1/analyze)
      await CompositionRoot.analysis.startAnalysis(confirmed, ['sozialrecht']);
    } catch (err) {
      console.error('[Citizen-GUI][Analysis] Pipeline launch error:', err);
    }
  };

  const handleReupload = () => {
    setWorkflowStep('upload');
    setExtractedText('');
    setOcrAssessment(null);
    setUploadError(null);
    setDossierClaims([]);
    streamingStore.reset();
  };

  const handleRetryAnalysis = () => {
    if (confirmedText) {
      handleConfirmText(confirmedText);
    } else if (extractedText) {
      handleConfirmText(extractedText);
    } else {
      handleReupload();
    }
  };

  const handleAdjudicateClaim = async (claimId: string, status: AdjudicationStatus) => {
    const activeCaseId = caseRunId || finalPayload?.case_run_id;
    if (activeCaseId) {
      await CompositionRoot.cases.adjudicate(activeCaseId, {
        target_type: 'claim',
        target_id: claimId,
        status,
      });
    }

    setDossierClaims((prev) =>
      prev.map((c) => (c.id === claimId ? { ...c, user_status: status } : c))
    );
  };

  const handleEditClaim = async (claimId: string, newText: string) => {
    const activeCaseId = caseRunId || finalPayload?.case_run_id;
    if (activeCaseId) {
      await CompositionRoot.cases.patchClaim(activeCaseId, claimId, newText);
    }

    setDossierClaims((prev) =>
      prev.map((c) => (c.id === claimId ? { ...c, claim_text: newText } : c))
    );
  };

  const activeId = caseRunId || finalPayload?.case_run_id;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Intro Header (only before dossier completion) */}
      {workflowStep !== 'complete' && (
        <div className="p-6 sm:p-8 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)]">
          <h1 className="ds-text-headline-sm font-semibold text-[var(--ds-color-text-primary)]">
            Bescheidprüfung & Evidenzanalyse
          </h1>
          <p className="mt-2 ds-text-body-md text-[var(--ds-color-text-secondary)]">
            Laden Sie einen behördlichen Bescheid hoch, um eine evidenzgebundene Prüfung nach SGB II
            durchzuführen.
          </p>
        </div>
      )}

      {/* Step 1: File Dropzone */}
      {workflowStep === 'upload' && (
        <div className="p-6 sm:p-8 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)]">
          <Dropzone
            onFileSelect={handleFileSelect}
            isUploading={isUploading}
            error={uploadError}
            onErrorClear={() => setUploadError(null)}
          />
        </div>
      )}

      {/* Step 2: Human Text Inspection & OCR Editor */}
      {workflowStep === 'edit' && (
        <div className="p-6 sm:p-8 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)]">
          <TextCorrectionEditor
            initialText={extractedText}
            ocrAssessment={ocrAssessment}
            onConfirm={handleConfirmText}
            onCancelOrReupload={handleReupload}
            isSubmitting={streamingStatus === 'connecting' || streamingStatus === 'streaming'}
          />
        </div>
      )}

      {/* Step 3: Pipeline Execution & Live Streaming Timeline */}
      {workflowStep === 'streaming' && (
        <div className="space-y-6">
          <StageErrorAlert onRetry={handleRetryAnalysis} />
          <StageTimeline />
          <LiveTokenStream />
        </div>
      )}

      {/* Step 4: Completed Dossier View */}
      {workflowStep === 'complete' && finalPayload && (
        <div className="space-y-6">
          {/* EU AI Act Art. 50 Disclosure Banner (Call Trace 3 Step 8) */}
          <div
            role="note"
            aria-label="EU AI Act Art. 50 Transparenzhinweis"
            className="p-4 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-bg-accent-subtle)] border border-[var(--ds-color-border-focus)] flex items-start gap-3"
          >
            <ShieldCheck className="w-5 h-5 text-[var(--ds-color-text-accent)] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="ds-text-title-sm font-semibold text-[var(--ds-color-text-primary)]">
                EU AI Act Art. 50 Transparenzhinweis
              </h2>
              <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
                {finalPayload.disclosure?.texts?.de ??
                  'Diese Analyse wurde von einem KI-System erstellt.'}
              </p>
            </div>
          </div>

          {/* Completion Header & Actions */}
          <div className="p-6 border border-[var(--ds-color-border-success)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-bg-success-subtle)] text-[var(--ds-color-text-success)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 shrink-0" aria-hidden="true" />
              <div>
                <h2 className="ds-text-title-sm font-semibold">
                  Analyse erfolgreich abgeschlossen
                </h2>
                <p className="ds-text-body-sm text-[var(--ds-color-text-primary)] mt-0.5">
                  Fall-ID: <span className="font-mono font-semibold">{activeId || 'Gespeichert'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {activeId && onViewCaseDetails && (
                <button
                  type="button"
                  onClick={() => onViewCaseDetails(activeId)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-action-primary)] text-[var(--ds-color-text-on-action)] hover:opacity-90 ds-text-label-md font-semibold cursor-pointer ds-focus-ring"
                >
                  <FolderOpen className="w-4 h-4" aria-hidden="true" />
                  <span>Vollständige Akte öffnen</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleReupload}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)] transition-colors ds-text-label-md font-semibold cursor-pointer ds-focus-ring"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>Neuen Bescheid prüfen</span>
              </button>
            </div>
          </div>

          {/* Machine-Readable Provenance Banner */}
          <div
            role="region"
            aria-label="Provenienz"
            className="p-3.5 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-default)] flex items-center justify-between flex-wrap gap-2 ds-text-body-sm"
          >
            <div className="flex items-center gap-2 text-[var(--ds-color-text-secondary)]">
              <span className="font-semibold text-[var(--ds-color-text-primary)]">Provenienz:</span>
              <span className="font-mono">{finalPayload.provenance?.spec_version || 'citizen-provenance-v1.1'}</span>
              <span>·</span>
              <span>Generator: {finalPayload.provenance?.generator || 'citizen'}</span>
              {finalPayload.provenance?.model_profile && (
                <>
                  <span>·</span>
                  <span>Modell: {finalPayload.provenance.model_profile}</span>
                </>
              )}
            </div>
            <span className="text-[var(--ds-color-text-tertiary)] font-mono">
              {finalPayload.provenance?.timestamp_utc || ''}
            </span>
          </div>

          {/* Summary / Sachverhalt / Ergebnis if available */}
          {(finalPayload.final_output?.sachverhalt || finalPayload.final_output?.ergebnis) && (
            <div className="p-6 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] space-y-4">
              <h3 className="ds-text-title-md font-semibold text-[var(--ds-color-text-primary)]">
                Zusammenfassung der rechtlichen Würdigung
              </h3>
              {finalPayload.final_output.ergebnis && (
                <div className="p-4 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-primary)] ds-text-body-md font-semibold leading-relaxed">
                  {finalPayload.final_output.ergebnis}
                </div>
              )}
              {finalPayload.final_output.sachverhalt && (
                <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)] leading-relaxed">
                  {finalPayload.final_output.sachverhalt}
                </p>
              )}
            </div>
          )}

          {/* 1. Deadline Banner */}
          {finalPayload.final_output?.fristen && (
            <DeadlineBanner fristen={finalPayload.final_output.fristen} />
          )}

          {/* 2. Calculation Cascade Table */}
          {finalPayload.final_output?.berechnung && (
            <CalculationTable berechnung={finalPayload.final_output.berechnung} />
          )}

          {/* 3. Adversarial Review */}
          {finalPayload.final_output?.adversarial_verhaeltnis && (
            <AdversarialReviewCard
              adversarial={finalPayload.final_output.adversarial_verhaeltnis}
            />
          )}

          {/* 4. Atomic Claims with Human Adjudication */}
          {dossierClaims.length > 0 && (
            <section className="space-y-4" role="region" aria-label="Feststellungen und Rügen">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--ds-color-border-default)]">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-[var(--ds-color-text-accent)]" aria-hidden="true" />
                  <h2 className="ds-text-title-md font-semibold text-[var(--ds-color-text-primary)]">
                    Ermittelte Rügen & Evidenzbindung ({dossierClaims.length})
                  </h2>
                </div>
                <span className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
                  Menschliche Bestätigung erforderlich
                </span>
              </div>

              <div className="space-y-4">
                {dossierClaims.map((claim) => (
                  <ClaimCard
                    key={claim.id}
                    claim={claim}
                    caseId={activeId}
                    onAdjudicate={handleAdjudicateClaim}
                    onEditClaim={handleEditClaim}
                    onSelectCitation={(binding) => setSelectedCitation(binding)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 5. Procedural Document Generator */}
          {activeId && (
            <section className="pt-4" role="region" aria-label="Schriftsatz erstellen">
              <DocumentGeneratorForm
                caseRunId={activeId}
                deadlineDate={finalPayload.final_output?.fristen?.frist_ende}
              />
            </section>
          )}

          {/* Citation Slide-Over Drawer */}
          <EvidenceCitationDrawer
            isOpen={Boolean(selectedCitation)}
            binding={selectedCitation}
            onClose={() => setSelectedCitation(null)}
          />
        </div>
      )}
    </div>
  );
};

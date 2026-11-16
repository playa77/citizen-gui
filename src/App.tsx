import React, { useEffect, useState } from 'react';
import { CompositionRoot } from '@/compositionRoot';
import { complianceStore } from '@/stores/complianceStore';
import { streamingStore, useStreamingStore } from '@/stores/streamingStore';
import { Navbar } from '@/components/layout/Navbar';
import { SystemStatusBanner } from '@/components/layout/SystemStatusBanner';
import { DisclaimerModal } from '@/components/layout/DisclaimerModal';
import { Dropzone } from '@/components/ingestion/Dropzone';
import { TextCorrectionEditor } from '@/components/ingestion/TextCorrectionEditor';
import { StageTimeline } from '@/components/pipeline/StageTimeline';
import { LiveTokenStream } from '@/components/pipeline/LiveTokenStream';
import { StageErrorAlert } from '@/components/pipeline/StageErrorAlert';
import type { OcrAssessmentResponse } from '@/types/api';
import { CheckCircle2, RotateCcw, ShieldCheck } from 'lucide-react';

type WorkflowStep = 'upload' | 'edit' | 'streaming' | 'complete';

export const App: React.FC = () => {
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  // Ingestion state
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [ocrAssessment, setOcrAssessment] = useState<OcrAssessmentResponse | null>(null);
  const [confirmedText, setConfirmedText] = useState<string>('');

  const streamingStatus = useStreamingStore((s) => s.status);
  const finalPayload = useStreamingStore((s) => s.finalPayload);
  const caseRunId = useStreamingStore((s) => s.caseRunId);

  useEffect(() => {
    let isCancelled = false;

    async function executeBootstrapCallTrace1() {
      try {
        const { isCurrent, currentVersion } = await CompositionRoot.disclaimer.checkVersion();

        if (isCancelled) return;

        if (!isCurrent) {
          complianceStore.handleVersionMismatch(currentVersion);
          try {
            const textRes = await CompositionRoot.disclaimer.fetchDisclaimerText();
            if (!isCancelled) {
              complianceStore.setDisclaimerText(textRes.text, textRes.version);
            }
          } catch (fetchErr) {
            if (!isCancelled) {
              complianceStore.setError(
                fetchErr instanceof Error ? fetchErr.message : 'Fehler beim Laden des Hinweistextes'
              );
            }
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('[Citizen-GUI][Bootstrap] Disclaimer check failed:', err);
          complianceStore.setDisclaimerModalOpen(true);
        }
      } finally {
        if (!isCancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    executeBootstrapCallTrace1();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Update workflow step if streaming store completes
  useEffect(() => {
    if (streamingStatus === 'complete') {
      setWorkflowStep('complete');
    }
  }, [streamingStatus]);

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
        console.warn('[Citizen-GUI][Ingestion] OCR quality assessment non-fatal failure:', ocrErr);
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

  return (
    <div className="min-h-svh flex flex-col bg-[var(--ds-color-surface-base)] text-[var(--ds-color-text-primary)]">
      <SystemStatusBanner />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {isBootstrapping ? (
          <div className="flex items-center justify-center py-24 text-[var(--ds-color-text-tertiary)]">
            <span className="ds-text-body-md">Citizen-GUI wird initialisiert…</span>
          </div>
        ) : (
          <section className="space-y-6">
            {/* Header Description */}
            <div className="p-6 sm:p-8 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)]">
              <h1 className="ds-text-headline-sm font-semibold text-[var(--ds-color-text-primary)]">
                Bescheidprüfung & Evidenzanalyse
              </h1>
              <p className="mt-2 ds-text-body-md text-[var(--ds-color-text-secondary)]">
                Willkommen bei Citizen-GUI. Laden Sie einen behördlichen Bescheid hoch, um eine
                evidenzgebundene Prüfung nach SGB II durchzuführen.
              </p>
            </div>

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

            {/* Step 3 & 4: Pipeline Execution, Stage Timeline, and Live Token Stream */}
            {(workflowStep === 'streaming' || workflowStep === 'complete') && (
              <div className="space-y-6">
                <StageErrorAlert onRetry={handleRetryAnalysis} />

                {/* EU AI Act Art. 50 Disclosure Banner (Call Trace 3 Step 8) */}
                {workflowStep === 'complete' && finalPayload && (
                  <div
                    role="note"
                    className="p-4 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-bg-accent-subtle)] border border-[var(--ds-color-border-focus)] flex items-start gap-3"
                  >
                    <ShieldCheck className="w-5 h-5 text-[var(--ds-color-text-accent)] shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="space-y-1">
                      <h3 className="ds-text-title-sm font-semibold text-[var(--ds-color-text-primary)]">
                        EU AI Act Art. 50 Transparenzhinweis
                      </h3>
                      <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
                        {finalPayload.disclosure?.texts?.de ??
                          'Diese Analyse wurde von einem KI-System erstellt.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Completion Banner */}
                {workflowStep === 'complete' && (
                  <div className="p-6 border border-[var(--ds-color-border-success)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-bg-success-subtle)] text-[var(--ds-color-text-success)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 shrink-0" aria-hidden="true" />
                      <div>
                        <h3 className="ds-text-title-sm font-semibold">
                          Analyse erfolgreich abgeschlossen
                        </h3>
                        <p className="ds-text-body-sm text-[var(--ds-color-text-primary)] mt-0.5">
                          Fall-ID: <span className="font-mono">{caseRunId ?? 'Gespeichert'}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleReupload}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle-hover)] transition-colors ds-text-label-md font-semibold"
                    >
                      <RotateCcw className="w-4 h-4" aria-hidden="true" />
                      <span>Neuen Bescheid prüfen</span>
                    </button>
                  </div>
                )}

                <StageTimeline />

                <LiveTokenStream />
              </div>
            )}
          </section>
        )}
      </main>

      <DisclaimerModal />
    </div>
  );
};

export default App;

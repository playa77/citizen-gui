import React, { useState } from 'react';
import {
  HelpCircle,
  Send,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSearch,
  Sparkles,
} from 'lucide-react';
import { CompositionRoot } from '@/compositionRoot';
import type { IntakeSession, IntakeResult } from '@/types/api';
import { TurnCounter } from './TurnCounter';

export interface IntakeWizardProps {
  onComplete?: (result: IntakeResult) => void;
  onStartAnalysis?: (result: IntakeResult) => void;
  className?: string;
}

export const IntakeWizard: React.FC<IntakeWizardProps> = ({
  onComplete,
  onStartAnalysis,
  className = '',
}) => {
  const [step, setStep] = useState<'initial' | 'interview' | 'done'>('initial');
  const [initialText, setInitialText] = useState('');
  const [maxTurns, setMaxTurns] = useState<number>(8);
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<IntakeResult | null>(null);

  // 1. Start Interview
  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialText.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const newSession = await CompositionRoot.intake.start({
        initial_text: initialText.trim(),
        max_turns: Math.min(12, Math.max(2, maxTurns)),
      });

      setSession(newSession);

      if (newSession.state === 'done' && newSession.intake_result) {
        setFinalResult(newSession.intake_result);
        setStep('done');
        onComplete?.(newSession.intake_result);
      } else {
        setStep('interview');
      }
    } catch (err) {
      console.error('[IntakeWizard] Start error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Fehler beim Starten des Erstberatungsinterviews.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Submit Turn Answer
  const handleSendAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !userAnswer.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await CompositionRoot.intake.sendMessage(
        session.id,
        userAnswer.trim()
      );
      setSession(updated);
      setUserAnswer('');

      if (updated.state === 'done' && updated.intake_result) {
        setFinalResult(updated.intake_result);
        setStep('done');
        onComplete?.(updated.intake_result);
      }
    } catch (err) {
      console.error('[IntakeWizard] Send message error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Fehler beim Senden der Antwort.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Early Force Confirm
  const handleForceConfirm = async () => {
    if (!session || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await CompositionRoot.intake.confirm(session.id);
      setFinalResult(result);
      setStep('done');
      onComplete?.(result);
    } catch (err) {
      console.error('[IntakeWizard] Confirm error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Fehler beim Abschließen des Interviews.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Restart Interview
  const handleRestart = async () => {
    if (session) {
      try {
        await CompositionRoot.intake.restart(session.id);
      } catch {
        // Non-fatal
      }
    }
    setStep('initial');
    setSession(null);
    setFinalResult(null);
    setInitialText('');
    setUserAnswer('');
    setError(null);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Step 1: Initial Text Entry */}
      {step === 'initial' && (
        <form
          onSubmit={handleStartInterview}
          className="p-6 sm:p-8 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] space-y-6"
        >
          <div className="flex items-center gap-3 pb-4 border-b border-[var(--ds-color-border-default)]">
            <div className="p-2.5 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-accent-subtle)] text-[var(--ds-color-text-accent)]">
              <Sparkles className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="ds-text-title-lg font-semibold text-[var(--ds-color-text-primary)]">
                Geführte Erstberatung & Sachverhaltserfassung
              </h2>
              <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
                Beschreiben Sie Ihr Problem in eigenen Worten. Der Assistent stellt gezielte Rückfragen (2–12 Fragen), um relevante Tatsachen und Rechtsgebiete zu strukturieren.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="intake-initial-text"
              className="block ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]"
            >
              Ihr Anliegen oder Ausgangssachverhalt <span className="text-[var(--ds-color-text-danger)]">*</span>
            </label>
            <textarea
              id="intake-initial-text"
              rows={5}
              value={initialText}
              onChange={(e) => setInitialText(e.target.value)}
              placeholder="z. B. Ich habe einen Aufhebungs- und Erstattungsbescheid vom Jobcenter erhalten. Sie fordern 450 Euro zurück wegen angeblich nicht gemeldetem Nebeneinkommen…"
              required
              className="w-full px-3.5 py-2.5 rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-primary)] placeholder-[var(--ds-color-text-tertiary)] ds-text-body-md ds-focus-ring"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <label htmlFor="intake-max-turns" className="ds-text-label-sm font-semibold text-[var(--ds-color-text-secondary)]">
                Maximale Rückfragen (2–12):
              </label>
              <input
                id="intake-max-turns"
                type="number"
                min={2}
                max={12}
                value={maxTurns}
                onChange={(e) => setMaxTurns(parseInt(e.target.value, 10) || 8)}
                className="w-16 px-2.5 py-1.5 rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-primary)] ds-text-body-sm text-center ds-focus-ring"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !initialText.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-action-primary)] text-[var(--ds-color-text-on-action)] hover:opacity-90 disabled:opacity-50 ds-text-label-md font-semibold cursor-pointer ds-focus-ring transition-opacity"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Interview wird initialisiert…</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" aria-hidden="true" />
                  <span>Interview starten</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-bg-danger-subtle)] border border-[var(--ds-color-border-danger)] text-[var(--ds-color-text-danger)] ds-text-body-sm flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </form>
      )}

      {/* Step 2: Multi-Turn Interviewing */}
      {step === 'interview' && session && (
        <div className="space-y-6">
          <TurnCounter
            turnCount={session.turn_count}
            maxTurns={session.max_turns}
          />

          <div className="p-6 sm:p-8 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] space-y-6">
            {/* Assistant Current Question */}
            {session.question && (
              <div
                role="region"
                aria-label="Frage des Rechtsassistenten"
                className="p-5 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-focus)] space-y-2"
              >
                <div className="flex items-center gap-2 ds-text-label-sm font-semibold text-[var(--ds-color-text-accent)]">
                  <HelpCircle className="w-4 h-4" aria-hidden="true" />
                  <span>Rückfrage {session.turn_count + 1}</span>
                </div>
                <p className="ds-text-body-lg text-[var(--ds-color-text-primary)] font-semibold leading-relaxed">
                  {session.question}
                </p>
              </div>
            )}

            {/* User Answer Form */}
            <form onSubmit={handleSendAnswer} className="space-y-4">
              <label
                htmlFor="intake-answer-input"
                className="block ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]"
              >
                Ihre Antwort
              </label>
              <textarea
                id="intake-answer-input"
                rows={3}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Beantworten Sie die Frage so genau wie möglich…"
                disabled={isSubmitting}
                required
                className="w-full px-3.5 py-2.5 rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-primary)] placeholder-[var(--ds-color-text-tertiary)] ds-text-body-md ds-focus-ring disabled:opacity-50"
              />

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRestart}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)] ds-text-label-sm font-semibold cursor-pointer ds-focus-ring disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Neu beginnen</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleForceConfirm}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)] ds-text-label-sm font-semibold cursor-pointer ds-focus-ring disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Vorzeitig abschließen</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !userAnswer.trim()}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-action-primary)] text-[var(--ds-color-text-on-action)] hover:opacity-90 disabled:opacity-50 ds-text-label-md font-semibold cursor-pointer ds-focus-ring transition-opacity"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Wird verarbeitet…</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" aria-hidden="true" />
                      <span>Antwort senden</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-bg-danger-subtle)] border border-[var(--ds-color-border-danger)] text-[var(--ds-color-text-danger)] ds-text-body-sm flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Completion & Structured Intake Result */}
      {step === 'done' && finalResult && (
        <div className="p-6 sm:p-8 border border-[var(--ds-color-border-success)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[var(--ds-color-border-default)]">
            <div className="p-2.5 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-success-subtle)] text-[var(--ds-color-text-success)]">
              <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="ds-text-title-lg font-semibold text-[var(--ds-color-text-primary)]">
                Erstberatung abgeschlossen
              </h2>
              <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
                Der Sachverhalt wurde erfolgreich strukturiert und die relevanten Rechtsgebiete identifiziert.
              </p>
            </div>
          </div>

          {/* Legal Areas Identified */}
          <div className="space-y-2">
            <h3 className="ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]">
              Ermittelte Rechtsgebiete
            </h3>
            <div className="flex flex-wrap gap-2">
              {finalResult.legal_areas.map((area) => (
                <span
                  key={area}
                  className="px-3 py-1 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-bg-accent-subtle)] border border-[var(--ds-color-border-focus)] text-[var(--ds-color-text-accent)] ds-text-label-sm font-semibold font-mono"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <h3 className="ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]">
              Strukturierte Sachverhaltszusammenfassung
            </h3>
            <div className="p-4 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-primary)] ds-text-body-md leading-relaxed whitespace-pre-wrap">
              {finalResult.summary}
            </div>
          </div>

          {/* Key Facts */}
          {finalResult.key_facts && Object.keys(finalResult.key_facts).length > 0 && (
            <div className="space-y-2">
              <h3 className="ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]">
                Wesentliche Eckdaten
              </h3>
              <div className="p-4 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-default)] grid grid-cols-1 sm:grid-cols-2 gap-3 ds-text-body-sm">
                {Object.entries(finalResult.key_facts).map(([k, v]) => (
                  <div key={k} className="flex flex-col">
                    <span className="font-semibold text-[var(--ds-color-text-secondary)]">{k}:</span>
                    <span className="font-mono text-[var(--ds-color-text-primary)]">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[var(--ds-color-border-default)]">
            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)] ds-text-label-md font-semibold cursor-pointer ds-focus-ring"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Neues Interview</span>
            </button>

            {onStartAnalysis && (
              <button
                type="button"
                onClick={() => onStartAnalysis(finalResult)}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-action-primary)] text-[var(--ds-color-text-on-action)] hover:opacity-90 ds-text-label-md font-semibold cursor-pointer ds-focus-ring"
              >
                <FileSearch className="w-4 h-4" aria-hidden="true" />
                <span>Zur Bescheidprüfung übernehmen</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

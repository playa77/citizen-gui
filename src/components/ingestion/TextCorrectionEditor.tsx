import React, { useState, useId } from 'react';
import {
  Check,
  RotateCcw,
  Upload,
  Info,
  FileCheck2,
} from 'lucide-react';
import type { OcrAssessmentResponse } from '@/types/api';
import { OcrQualityBadge } from './OcrQualityBadge';

export interface TextCorrectionEditorProps {
  initialText: string;
  ocrAssessment?: OcrAssessmentResponse | null;
  onConfirm: (confirmedText: string) => void;
  onCancelOrReupload?: () => void;
  isSubmitting?: boolean;
}

export const TextCorrectionEditor: React.FC<TextCorrectionEditorProps> = ({
  initialText,
  ocrAssessment,
  onConfirm,
  onCancelOrReupload,
  isSubmitting = false,
}) => {
  const [editedText, setEditedText] = useState(initialText);
  const textareaId = useId();

  const isDirty = editedText !== initialText;
  const characterCount = editedText.length;
  const lineCount = editedText ? editedText.split('\n').length : 0;
  const isEmpty = editedText.trim().length === 0;

  const handleResetToInitial = () => {
    setEditedText(initialText);
  };

  const handleConfirm = () => {
    if (isEmpty || isSubmitting) return;
    onConfirm(editedText);
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. OCR Quality Assessment Display */}
      {ocrAssessment && (
        <section aria-label="OCR-Qualität und Lesbarkeit">
          <OcrQualityBadge assessment={ocrAssessment} />
        </section>
      )}

      {/* 2. Guidance Notice */}
      <div
        className="flex items-start gap-3 p-4 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-default)]"
        role="note"
      >
        <Info className="w-5 h-5 text-[var(--ds-color-text-accent)] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <h3 className="ds-text-title-sm font-semibold text-[var(--ds-color-text-primary)]">
            Menschliche Textprüfung vor der KI-Analyse
          </h3>
          <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
            Prüfen Sie bitte den extrahierten Text auf Richtigkeit — insbesondere Euro-Beträge,
            Bescheiddaten und Paragraphen. Sie können Schreibfehler direkt im Textfeld korrigieren.
            Erst mit Ihrer Bestätigung wird die evidenzgebundene Prüfung gestartet.
          </p>
        </div>
      </div>

      {/* 3. Text Editor Card */}
      <div className="flex flex-col border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] overflow-hidden">
        {/* Editor Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)]">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[var(--ds-color-text-accent)]" aria-hidden="true" />
            <label
              htmlFor={textareaId}
              className="ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]"
            >
              Extrahierter Bescheidtext
            </label>
            {isDirty && (
              <span className="px-2 py-0.5 ds-text-label-sm font-semibold rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-bg-warning-subtle)] border border-[var(--ds-color-border-warning)] text-[var(--ds-color-text-warning)]">
                Geändert
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 ds-text-numeric-md text-[var(--ds-color-text-secondary)] ds-text-body-sm">
            <span>{characterCount.toLocaleString('de-DE')} Zeichen</span>
            <span>•</span>
            <span>{lineCount.toLocaleString('de-DE')} Zeilen</span>
            {isDirty && (
              <button
                type="button"
                onClick={handleResetToInitial}
                className="inline-flex items-center gap-1 text-[var(--ds-color-text-accent)] hover:underline ml-2"
                title="Auf ursprünglichen OCR-Text zurücksetzen"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Zurücksetzen</span>
              </button>
            )}
          </div>
        </div>

        {/* Full-Height Textarea */}
        <div className="p-4">
          <textarea
            id={textareaId}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            disabled={isSubmitting}
            rows={16}
            aria-label="Extrahierter Bescheidtext zur Bearbeitung und Bestätigung"
            aria-invalid={isEmpty}
            className="w-full p-4 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-field)] text-[var(--ds-color-text-primary)] ds-text-body-md focus:border-[var(--ds-color-border-focus)] focus:outline-none transition-colors duration-[var(--ds-motion-duration-medium)] resize-y font-mono leading-relaxed min-h-[300px]"
            placeholder="Hier erscheint der aus dem Bescheid extrahierte Text…"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)]">
          {onCancelOrReupload ? (
            <button
              type="button"
              onClick={onCancelOrReupload}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)] text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle-hover)] transition-colors ds-text-label-md font-semibold"
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>Anderes Dokument wählen</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isEmpty || isSubmitting}
            className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-action-primary)] text-[var(--ds-color-text-on-action)] hover:bg-[var(--ds-color-bg-action-primary-hover)] transition-colors ds-text-label-md font-semibold ${
              isEmpty || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>Text bestätigen & Fortfahren</span>
          </button>
        </div>
      </div>
    </div>
  );
};

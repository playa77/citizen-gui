import React, { useEffect, useState } from 'react';
import {
  FileText,
  Loader2,
  AlertCircle,
  Calendar,
  Send,
  HelpCircle,
} from 'lucide-react';
import { CompositionRoot } from '@/compositionRoot';
import type {
  DocType,
  GeneratorOptionsResponse,
  GeneratedDocumentResponse,
} from '@/types/api';
import { DocumentPreview } from './DocumentPreview';

export interface DocumentGeneratorFormProps {
  caseRunId: string;
  deadlineDate?: string;
  initialDocType?: DocType;
  onDocumentGenerated?: (doc: GeneratedDocumentResponse) => void;
  className?: string;
}

export const DocumentGeneratorForm: React.FC<DocumentGeneratorFormProps> = ({
  caseRunId,
  deadlineDate,
  initialDocType,
  onDocumentGenerated,
  className = '',
}) => {
  const [options, setOptions] = useState<GeneratorOptionsResponse | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [selectedDocType, setSelectedDocType] = useState<DocType>(
    initialDocType || 'widerspruch'
  );
  const [name, setName] = useState('');
  const [adresse, setAdresse] = useState('');
  const [aktenzeichen, setAktenzeichen] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocumentResponse | null>(null);

  // Fetch generator options on mount
  useEffect(() => {
    let isCancelled = false;

    const loadOptions = async () => {
      setIsLoadingOptions(true);
      setOptionsError(null);
      try {
        const res = await CompositionRoot.documents.getOptions(caseRunId);
        if (!isCancelled) {
          setOptions(res);
          if (res.available_doc_types && res.available_doc_types.length > 0) {
            // Select initial doc type if valid, otherwise first available
            const exists = res.available_doc_types.some((d) => d.doc_type === selectedDocType);
            if (!exists) {
              const first = res.available_doc_types[0];
              if (first) {
                setSelectedDocType(first.doc_type);
              }
            }
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('[DocumentGeneratorForm] Failed to load generator options:', err);
          setOptionsError(
            err instanceof Error
              ? err.message
              : 'Schriftsatzoptionen konnten nicht geladen werden.'
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingOptions(false);
        }
      }
    };

    if (caseRunId) {
      loadOptions();
    }

    return () => {
      isCancelled = true;
    };
  }, [caseRunId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !adresse.trim()) {
      setGenerationError('Bitte geben Sie mindestens Name und Anschrift an.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      // Call Trace 5 Step 4 & 5
      const doc = await CompositionRoot.documents.generate({
        case_run_id: caseRunId,
        doc_type: selectedDocType,
        user_data: {
          name: name.trim(),
          adresse: adresse.trim(),
          aktenzeichen: aktenzeichen.trim() || undefined,
        },
      });

      setGeneratedDoc(doc);
      onDocumentGenerated?.(doc);
    } catch (err) {
      console.error('[DocumentGeneratorForm] Document generation error:', err);
      setGenerationError(
        err instanceof Error
          ? err.message
          : 'Beim Erstellen des Schriftsatzes ist ein Fehler aufgetreten.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // If a document was successfully generated, show preview with option to edit details
  if (generatedDoc) {
    return (
      <DocumentPreview
        document={generatedDoc}
        onEditUserData={() => setGeneratedDoc(null)}
        className={className}
      />
    );
  }

  // Fallback list of document types if options fetch fails or is pending
  const defaultDocTypes: Array<{ doc_type: DocType; title: string; description: string }> = [
    {
      doc_type: 'widerspruch',
      title: 'Widerspruch (§ 84 SGG / § 70 VwGO)',
      description: 'Förmlicher Rechtsbehelf gegen einen fehlerhaften Bescheid innerhalb der Monatsfrist.',
    },
    {
      doc_type: 'widerspruch_jahresfrist',
      title: 'Widerspruch bei Jahresfrist (§ 66 Abs. 2 SGG)',
      description: 'Bei fehlender oder unrichtiger Rechtsbehelfsbelehrung verlängert sich die Frist auf ein ganzes Jahr.',
    },
    {
      doc_type: 'ueberpruefungsantrag_44',
      title: 'Überprüfungsantrag (§ 44 SGB X)',
      description: 'Rückwirkende Korrektur bestandskräftiger Bescheide bis zu einem Jahr in die Vergangenheit.',
    },
    {
      doc_type: 'akteneinsichtsantrag_25',
      title: 'Akteneinsichtsantrag (§ 25 SGB X)',
      description: 'Anforderung der vollständigen Verwaltungsakte zur Prüfung behördlicher Berechnungsgrundlagen.',
    },
  ];

  const availableTypes = options?.available_doc_types?.length
    ? options.available_doc_types
    : defaultDocTypes;

  const effectiveDeadline = options?.frist_info?.datum || deadlineDate;

  return (
    <div className={`p-6 sm:p-8 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--ds-color-border-default)]">
        <div className="p-2.5 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-accent-subtle)] text-[var(--ds-color-text-accent)]">
          <FileText className="w-6 h-6" aria-hidden="true" />
        </div>
        <div>
          <h2 className="ds-text-title-lg font-semibold text-[var(--ds-color-text-primary)]">
            Schriftsatzentwurf generieren
          </h2>
          <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
            Erstellen Sie einen juristisch formulierten Entwurf auf Basis der bestätigten Prüfergebnisse.
          </p>
        </div>
      </div>

      {isLoadingOptions && (
        <div className="flex items-center gap-2 text-[var(--ds-color-text-secondary)] ds-text-body-sm">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--ds-color-text-accent)]" aria-hidden="true" />
          <span>Verfügbare Schriftsatzoptionen werden ermittelt…</span>
        </div>
      )}

      {optionsError && (
        <div className="p-3 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-bg-warning-subtle)] border border-[var(--ds-color-border-warning)] text-[var(--ds-color-text-warning)] ds-text-body-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{optionsError} (Standardoptionen werden verwendet)</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Document Type Selection */}
        <fieldset className="space-y-3">
          <legend className="ds-text-title-sm font-semibold text-[var(--ds-color-text-primary)]">
            1. Schriftsatzart wählen
          </legend>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableTypes.map((t) => {
              const isSelected = selectedDocType === t.doc_type;
              return (
                <label
                  key={t.doc_type}
                  className={`flex flex-col justify-between p-4 rounded-[var(--ds-radius-container)] border cursor-pointer transition-colors ds-focus-ring ${
                    isSelected
                      ? 'border-[var(--ds-color-border-focus)] bg-[var(--ds-color-surface-sunken)]'
                      : 'border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)] hover:bg-[var(--ds-color-bg-neutral-subtle)]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="doc_type"
                          value={t.doc_type}
                          checked={isSelected}
                          onChange={() => setSelectedDocType(t.doc_type)}
                          className="w-4 h-4 text-[var(--ds-color-border-focus)] border-[var(--ds-color-border-default)] cursor-pointer"
                        />
                        <span className="ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]">
                          {t.title}
                        </span>
                      </div>
                    </div>
                    <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)] pl-6">
                      {t.description}
                    </p>
                  </div>

                  {t.doc_type === 'widerspruch' && effectiveDeadline && (
                    <div className="mt-3 pl-6 flex items-center gap-1.5 ds-text-label-sm text-[var(--ds-color-text-accent)] font-semibold">
                      <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Fristende: {effectiveDeadline}</span>
                    </div>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* 2. Personal Information Fields (Local browser injection) */}
        <fieldset className="space-y-4 pt-2 border-t border-[var(--ds-color-border-default)]">
          <div>
            <legend className="ds-text-title-sm font-semibold text-[var(--ds-color-text-primary)]">
              2. Persönliche Absenderangaben
            </legend>
            <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)] mt-0.5">
              Diese Daten werden ausschließlich lokal in den Schriftsatz eingefügt und dienen der formellen Vollständigkeit.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="slot-name" className="block ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]">
                Vollständiger Name <span className="text-[var(--ds-color-text-danger)]">*</span>
              </label>
              <input
                id="slot-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Erika Mustermann"
                required
                className="w-full px-3.5 py-2.5 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-primary)] placeholder-[var(--ds-color-text-tertiary)] ds-text-body-md ds-focus-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="slot-aktenzeichen" className="block ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]">
                Aktenzeichen / Kundennummer
              </label>
              <input
                id="slot-aktenzeichen"
                type="text"
                value={aktenzeichen}
                onChange={(e) => setAktenzeichen(e.target.value)}
                placeholder="z. B. 12345 // BG-6789"
                className="w-full px-3.5 py-2.5 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-primary)] placeholder-[var(--ds-color-text-tertiary)] ds-text-body-md ds-focus-ring"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="slot-adresse" className="block ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]">
                Anschrift (Straße, Hausnummer, PLZ, Ort) <span className="text-[var(--ds-color-text-danger)]">*</span>
              </label>
              <input
                id="slot-adresse"
                type="text"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="z. B. Musterstraße 12, 10115 Berlin"
                required
                className="w-full px-3.5 py-2.5 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-primary)] placeholder-[var(--ds-color-text-tertiary)] ds-text-body-md ds-focus-ring"
              />
            </div>
          </div>
        </fieldset>

        {/* Generation Error Banner */}
        {generationError && (
          <div
            role="alert"
            className="p-4 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-bg-danger-subtle)] border border-[var(--ds-color-border-danger)] text-[var(--ds-color-text-danger)] ds-text-body-sm flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold">Fehler beim Erstellen</p>
              <p>{generationError}</p>
            </div>
          </div>
        )}

        {/* Notice & Submit Action */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 ds-text-body-sm text-[var(--ds-color-text-secondary)]">
            <HelpCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Unbestätigte Rügen werden automatisch als [BITTE PRÜFEN] markiert.</span>
          </div>

          <button
            type="submit"
            disabled={isGenerating || !name.trim() || !adresse.trim()}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-action-primary)] text-[var(--ds-color-text-on-action)] hover:opacity-90 disabled:opacity-50 ds-text-label-md font-semibold cursor-pointer ds-focus-ring transition-opacity"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Schriftsatz wird formuliert…</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>Entwurf erstellen</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

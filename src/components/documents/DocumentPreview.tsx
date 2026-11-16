import React, { useState } from 'react';
import { Copy, Check, Printer, Download, ShieldCheck, FileCheck } from 'lucide-react';
import type { GeneratedDocumentResponse } from '@/types/api';
import { UnverifiedSlotAlert } from './UnverifiedSlotAlert';
import { SanitizedHtml } from '@/components/common/SanitizedHtml';

export interface DocumentPreviewProps {
  document: GeneratedDocumentResponse;
  onEditUserData?: () => void;
  className?: string;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  document: doc,
  onEditUserData,
  className = '',
}) => {
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopyClipboard = async () => {
    try {
      await navigator.clipboard.writeText(doc.rendered_text);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2500);
    } catch (err) {
      console.error('[DocumentPreview] Clipboard copy failed:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([doc.rendered_text], { type: 'text/markdown;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${doc.doc_type}_${Date.now()}.md`;
    window.document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    window.document.body.removeChild(link);
  };

  // Convert rendered markdown text into safe HTML with highlighted unverified slots
  const formatDocumentText = (raw: string): string => {
    if (!raw) return '';

    // Replace [BITTE PRÜFEN...] with an accessible styled span
    const highlighted = raw.replace(
      /\[BITTE PRÜFEN:?\s*([^\]]*)\]/g,
      '<mark class="px-1.5 py-0.5 rounded-[var(--ds-radius-control-sm)] font-mono font-semibold bg-[var(--ds-color-bg-warning-subtle)] text-[var(--ds-color-text-warning)] border border-[var(--ds-color-border-warning)]">[BITTE PRÜFEN: $1]</mark>'
    );

    // Escape basic angle brackets (except the mark tag we just introduced)
    // Then convert markdown headings and paragraphs
    const lines = highlighted.split('\n');
    const htmlLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '<br />';
      if (trimmed.startsWith('# ')) {
        return `<h1 class="ds-text-headline-md font-semibold text-[var(--ds-color-text-primary)] my-4">${trimmed.substring(2)}</h1>`;
      }
      if (trimmed.startsWith('## ')) {
        return `<h2 class="ds-text-title-lg font-semibold text-[var(--ds-color-text-primary)] my-3">${trimmed.substring(3)}</h2>`;
      }
      if (trimmed.startsWith('### ')) {
        return `<h3 class="ds-text-title-md font-semibold text-[var(--ds-color-text-primary)] my-2">${trimmed.substring(4)}</h3>`;
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return `<li class="ds-text-body-md text-[var(--ds-color-text-primary)] ml-4 list-disc">${trimmed.substring(2)}</li>`;
      }
      return `<p class="ds-text-body-md text-[var(--ds-color-text-primary)] my-2 leading-relaxed">${line}</p>`;
    });

    return htmlLines.join('\n');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-accent-subtle)] text-[var(--ds-color-text-accent)]">
            <FileCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="ds-text-title-md font-semibold text-[var(--ds-color-text-primary)]">
              {doc.title || 'Generierter Schriftsatzentwurf'}
            </h3>
            <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
              Dokumenttyp: <span className="font-mono font-semibold">{doc.doc_type}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onEditUserData && (
            <button
              type="button"
              onClick={onEditUserData}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)] ds-text-label-md font-semibold cursor-pointer ds-focus-ring"
            >
              <span>Angaben bearbeiten</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyClipboard}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)] ds-text-label-md font-semibold cursor-pointer ds-focus-ring"
            aria-label="Schriftsatz in die Zwischenablage kopieren"
          >
            {hasCopied ? (
              <>
                <Check className="w-4 h-4 text-[var(--ds-color-text-success)]" aria-hidden="true" />
                <span className="text-[var(--ds-color-text-success)]">Kopiert!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden="true" />
                <span>Kopieren</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)] ds-text-label-md font-semibold cursor-pointer ds-focus-ring"
            aria-label="Als Markdown herunterladen"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Markdown</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-action-primary)] text-[var(--ds-color-text-on-action)] hover:opacity-90 ds-text-label-md font-semibold cursor-pointer ds-focus-ring"
            aria-label="Schriftsatz drucken oder als PDF speichern"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            <span>PDF drucken</span>
          </button>
        </div>
      </div>

      {/* Unverified Slots Alert */}
      <UnverifiedSlotAlert
        slots={doc.slots}
        renderedText={doc.rendered_text}
      />

      {/* Rendered Letter View (Print-optimized paper card) */}
      <div className="p-8 sm:p-12 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] shadow-[var(--ds-elevation-raised)] print:shadow-none print:border-none print:p-0">
        <SanitizedHtml
          html={formatDocumentText(doc.rendered_text)}
          className="prose dark:prose-invert max-w-none font-serif text-[var(--ds-color-text-primary)]"
        />
      </div>

      {/* Machine-Readable Provenance Metadata Footer (Doc 1 §2.1 FR-02, Art. 50(2)) */}
      {doc.provenance && (
        <footer
          role="region"
          aria-label="EU AI Act Art. 50(2) Provenienzangaben"
          className="p-4 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-default)] ds-text-body-sm text-[var(--ds-color-text-secondary)] space-y-1 print:hidden"
        >
          <div className="flex items-center gap-2 font-semibold text-[var(--ds-color-text-primary)]">
            <ShieldCheck className="w-4 h-4 text-[var(--ds-color-text-accent)]" aria-hidden="true" />
            <span>Dokumenten-Provenienz (EU AI Act Art. 50 Abs. 2)</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[var(--ds-color-text-tertiary)] pt-1">
            <span>Spezifikation: {doc.provenance.spec_version}</span>
            <span>·</span>
            <span>Generator: {doc.provenance.generator}</span>
            <span>·</span>
            <span>Version: {doc.provenance.app_version}</span>
            {doc.provenance.model_profile && (
              <>
                <span>·</span>
                <span>Modellprofil: {doc.provenance.model_profile}</span>
              </>
            )}
            {doc.provenance.timestamp_utc && (
              <>
                <span>·</span>
                <span>Erstellt (UTC): {doc.provenance.timestamp_utc}</span>
              </>
            )}
          </div>
          {doc.provenance.modules && doc.provenance.modules.length > 0 && (
            <div className="pt-1 text-[var(--ds-color-text-tertiary)]">
              Verwendetes Rechtsmodul:{' '}
              {doc.provenance.modules.map((m) => `${m.id} (${m.version})`).join(', ')}
            </div>
          )}
        </footer>
      )}
    </div>
  );
};

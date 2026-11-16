import React, { useRef } from 'react';
import { Paperclip, Trash2, FileText, Upload, Loader2 } from 'lucide-react';
import type { AttachedDocument } from '@/types/api';

export interface DocumentAttachmentListProps {
  documents: AttachedDocument[];
  onAttachDocument: (file: File) => Promise<void>;
  onDeleteDocument: (docId: string) => Promise<void>;
  isUploading?: boolean;
  className?: string;
}

export const DocumentAttachmentList: React.FC<DocumentAttachmentListProps> = ({
  documents,
  onAttachDocument,
  onDeleteDocument,
  isUploading = false,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onAttachDocument(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div
      role="region"
      aria-label="Angehängte Dokumente"
      className={`p-4 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-[var(--ds-color-text-accent)]" aria-hidden="true" />
          <h3 className="ds-text-title-sm font-semibold text-[var(--ds-color-text-primary)]">
            Angehängte Dokumente ({documents.length})
          </h3>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png,.txt,.html,.eml"
            className="hidden"
            id="chat-document-attachment-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)] ds-text-label-sm font-semibold cursor-pointer ds-focus-ring disabled:opacity-50"
            aria-label="Neues Dokument anhängen"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                <span>Wird angehängt…</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Dokument anhängen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {documents.length === 0 ? (
        <p className="ds-text-body-sm text-[var(--ds-color-text-tertiary)] italic">
          Keine Dokumente angehängt. Fügen Sie einen Bescheid an, um eine tiefgehende Pipeline-Prüfung auszulösen.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-default)] ds-text-body-sm text-[var(--ds-color-text-primary)]"
            >
              <FileText className="w-3.5 h-3.5 text-[var(--ds-color-text-accent)] shrink-0" aria-hidden="true" />
              <span className="font-mono text-[var(--ds-color-text-primary)] truncate max-w-xs" title={doc.original_filename}>
                {doc.original_filename}
              </span>
              <button
                type="button"
                onClick={() => onDeleteDocument(doc.id)}
                className="p-1 min-h-[var(--ds-size-target-min)] min-w-[var(--ds-size-target-min)] flex items-center justify-center text-[var(--ds-color-text-tertiary)] hover:text-[var(--ds-color-text-danger)] cursor-pointer ds-focus-ring"
                aria-label={`Dokument ${doc.original_filename} entfernen`}
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

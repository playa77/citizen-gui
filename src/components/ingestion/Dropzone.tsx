import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileText, AlertCircle, Loader2 } from 'lucide-react';
import {
  MAX_INGESTION_FILE_SIZE_BYTES,
  SUPPORTED_INGESTION_EXTENSIONS,
} from '@/services/ingestion';

export interface DropzoneProps {
  onFileSelect: (file: File) => void | Promise<void>;
  isUploading?: boolean;
  disabled?: boolean;
  error?: string | null;
  onErrorClear?: () => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFileSelect,
  isUploading = false,
  disabled = false,
  error: externalError = null,
  onErrorClear,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeError = externalError ?? internalError;

  const validateAndHandleFile = useCallback(
    (file: File) => {
      setInternalError(null);
      onErrorClear?.();

      // 1. Client-side 25 MB ceiling check
      if (file.size > MAX_INGESTION_FILE_SIZE_BYTES) {
        setInternalError(
          'Die Datei überschreitet die Höchstgröße von 25 MB oder hat ein nicht unterstütztes Format.'
        );
        return;
      }

      // 2. Client-side extension validation
      const fileName = file.name.toLowerCase();
      const isExtensionValid = SUPPORTED_INGESTION_EXTENSIONS.some((ext) =>
        fileName.endsWith(ext)
      );

      if (!isExtensionValid) {
        setInternalError(
          'Die Datei überschreitet die Höchstgröße von 25 MB oder hat ein nicht unterstütztes Format.'
        );
        return;
      }

      // Validated cleanly
      onFileSelect(file);
    },
    [onFileSelect, onErrorClear]
  );

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || isUploading) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        validateAndHandleFile(droppedFile);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile) {
        validateAndHandleFile(selectedFile);
      }
      // Reset input value so same file can be selected again
      e.target.value = '';
    }
  };

  const handleContainerClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || isUploading) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const borderClass = activeError
    ? 'border-[var(--ds-color-border-danger)]'
    : isDragOver
    ? 'border-[var(--ds-color-border-focus)] bg-[var(--ds-color-bg-accent-subtle)]'
    : 'border-[var(--ds-color-border-default)] hover:border-[var(--ds-color-border-focus)] bg-[var(--ds-color-surface-sunken)]';

  return (
    <div className="w-full space-y-3">
      <div
        role="button"
        tabIndex={disabled || isUploading ? -1 : 0}
        aria-label="Dokument hochladen: PDF, JPG, PNG, TXT, HTML oder EML bis maximal 25 MB"
        aria-disabled={disabled || isUploading}
        aria-describedby={activeError ? 'dropzone-error-msg' : undefined}
        onClick={handleContainerClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed rounded-[var(--ds-radius-container)] cursor-pointer transition-colors duration-[var(--ds-motion-duration-medium)] outline-none ${borderClass} ${
          disabled || isUploading ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.txt,.html,.htm,.eml,application/pdf,image/jpeg,image/png,text/plain,text/html,message/rfc822"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isUploading}
          data-testid="file-upload-input"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[var(--ds-color-text-accent)]" />
            <div className="space-y-1">
              <p className="ds-text-title-sm font-semibold text-[var(--ds-color-text-primary)]">
                Dokument wird eingelesen & OCR analysiert…
              </p>
              <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
                Bitte haben Sie einen Moment Geduld.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="p-3 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-accent)]">
              <UploadCloud className="w-8 h-8" aria-hidden="true" />
            </div>

            <div className="space-y-1">
              <p className="ds-text-title-sm font-semibold text-[var(--ds-color-text-primary)]">
                {isDragOver
                  ? 'Bescheid hier ablegen…'
                  : 'Bescheid per Drag & Drop hier ablegen oder durchsuchen'}
              </p>
              <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
                Unterstützte Formate: PDF, JPG, PNG, TXT, HTML, EML (maximal 25 MB)
              </p>
            </div>

            <button
              type="button"
              tabIndex={-1}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-action-primary)] text-[var(--ds-color-text-on-action)] hover:bg-[var(--ds-color-bg-action-primary-hover)] transition-colors ds-text-label-md font-semibold pointer-events-none"
            >
              <FileText className="w-4 h-4" aria-hidden="true" />
              <span>Datei auswählen</span>
            </button>
          </div>
        )}
      </div>

      {activeError && (
        <div
          id="dropzone-error-msg"
          role="alert"
          className="flex items-center gap-2 p-3 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-danger-subtle)] border border-[var(--ds-color-border-danger)] text-[var(--ds-color-text-danger)] ds-text-body-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{activeError}</span>
        </div>
      )}
    </div>
  );
};

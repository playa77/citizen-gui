import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompositionRoot } from '@/compositionRoot';
import {
  IngestionService,
  MAX_INGESTION_FILE_SIZE_BYTES,
} from '@/services/ingestion';
import { Dropzone } from '@/components/ingestion/Dropzone';
import { OcrQualityBadge } from '@/components/ingestion/OcrQualityBadge';
import { TextCorrectionEditor } from '@/components/ingestion/TextCorrectionEditor';
import type { OcrAssessmentResponse } from '@/types/api';

describe('WP-05: Document Ingestion, File Dropzone & OCR Text Editor [Doc 1 §2.1 FR-03, Doc 2 §8.4]', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('IngestionService', () => {
    it('should immediately reject files exceeding 25 MB without making network calls', async () => {
      const fetchSpy = vi.spyOn(window, 'fetch');
      const oversizedFile = new File(
        [new Uint8Array(MAX_INGESTION_FILE_SIZE_BYTES + 1024)],
        'giant-notice.pdf',
        { type: 'application/pdf' }
      );

      await expect(
        CompositionRoot.ingestion.uploadDocument(oversizedFile)
      ).rejects.toThrow(
        'Die Datei überschreitet die Höchstgröße von 25 MB oder hat ein nicht unterstütztes Format.'
      );

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should reject unsupported file types (e.g. .exe, .zip)', async () => {
      const fetchSpy = vi.spyOn(window, 'fetch');
      const unsupportedFile = new File(['test binary'], 'malicious.exe', {
        type: 'application/x-msdownload',
      });

      await expect(
        CompositionRoot.ingestion.uploadDocument(unsupportedFile)
      ).rejects.toThrow(
        'Die Datei überschreitet die Höchstgröße von 25 MB oder hat ein nicht unterstütztes Format.'
      );

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should upload valid PDF and append X-Document-Tag: synthetic in dev mode', async () => {
      // Enable dev mode
      CompositionRoot.prefs.setDevMode(true);
      CompositionRoot.prefs.setDisclaimerAckVersion('v3.0.0');

      let capturedUrl = '';
      let capturedHeaders: Record<string, string> = {};

      const fetchMock = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
        capturedUrl = url;
        capturedHeaders = init.headers as Record<string, string>;
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ text: 'Extrahierter SGB II Bescheidtext' }),
        };
      });
      vi.stubGlobal('fetch', fetchMock);

      const validPdf = new File(['%PDF-1.4 dummy content'], 'bescheid.pdf', {
        type: 'application/pdf',
      });

      const response = await CompositionRoot.ingestion.uploadDocument(validPdf);

      expect(response.text).toBe('Extrahierter SGB II Bescheidtext');
      expect(capturedUrl).toContain('/api/v1/ingest');
      expect(capturedHeaders['X-Document-Tag']).toBe('synthetic');
      expect(capturedHeaders['X-Disclaimer-Ack']).toBe('v3.0.0');
    });

    it('should assess OCR text quality via GET /api/v1/ocr/assess', async () => {
      const mockOcr: OcrAssessmentResponse = {
        score: 0.88,
        level: 'good',
        issues: [],
        warnings: ['Leichte Unschärfe auf Seite 2'],
        ocr_artifacts_detected: false,
        readable_words_pct: 95.5,
        language_detected: 'de',
        recommendations: ['Beträge im Texteditor überprüfen'],
      };

      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/api/v1/ocr/assess')) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => mockOcr,
          };
        }
        return { ok: false, status: 404 };
      });
      vi.stubGlobal('fetch', fetchMock);

      const sampleText = 'Jobcenter Bescheid über Leistungen zur Sicherung des Lebensunterhalts';
      const ocrResult = await CompositionRoot.ingestion.assessQuality(sampleText);

      expect(ocrResult.score).toBe(0.88);
      expect(ocrResult.level).toBe('good');
      expect(ocrResult.readable_words_pct).toBe(95.5);
      expect(ocrResult.warnings[0]).toBe('Leichte Unschärfe auf Seite 2');
    });
  });

  describe('Dropzone Component', () => {
    it('should render dropzone and display error when file > 25 MB is selected', async () => {
      const onFileSelectMock = vi.fn();
      render(React.createElement(Dropzone, { onFileSelect: onFileSelectMock }));

      const fileInput = screen.getByTestId('file-upload-input');
      const oversizedFile = new File(
        [new Uint8Array(MAX_INGESTION_FILE_SIZE_BYTES + 500)],
        'large.pdf',
        { type: 'application/pdf' }
      );

      fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

      expect(onFileSelectMock).not.toHaveBeenCalled();
      expect(
        screen.getByRole('alert')
      ).toHaveTextContent(
        'Die Datei überschreitet die Höchstgröße von 25 MB oder hat ein nicht unterstütztes Format.'
      );
    });

    it('should call onFileSelect when a valid file is dropped', async () => {
      const onFileSelectMock = vi.fn();
      render(React.createElement(Dropzone, { onFileSelect: onFileSelectMock }));

      const dropzoneArea = screen.getByRole('button', {
        name: /Dokument hochladen/i,
      });

      const validFile = new File(['bescheid text'], 'bescheid.png', {
        type: 'image/png',
      });

      fireEvent.drop(dropzoneArea, {
        dataTransfer: {
          files: [validFile],
        },
      });

      expect(onFileSelectMock).toHaveBeenCalledWith(validFile);
    });

    it('should render uploading spinner state when isUploading is true', () => {
      render(React.createElement(Dropzone, { onFileSelect: vi.fn(), isUploading: true }));

      expect(
        screen.getByText(/Dokument wird eingelesen & OCR analysiert…/i)
      ).toBeInTheDocument();
    });
  });

  describe('OcrQualityBadge Component', () => {
    it('should render score and level with appropriate semantic colors and labels', () => {
      const assessment: OcrAssessmentResponse = {
        score: 0.92,
        level: 'good',
        issues: [],
        warnings: ['Schnittkante leicht abgeschnitten'],
        ocr_artifacts_detected: true,
        readable_words_pct: 97.4,
        language_detected: 'de',
        recommendations: ['Kontrollieren Sie Datumsangaben'],
      };

      render(React.createElement(OcrQualityBadge, { assessment }));

      expect(screen.getByText('Gute Lesbarkeit')).toBeInTheDocument();
      expect(screen.getByText('92 %')).toBeInTheDocument();
      expect(screen.getByText('97.4% Wörter erkennbar')).toBeInTheDocument();
      expect(screen.getByText('Sprache: DE')).toBeInTheDocument();

      // Toggle details
      const detailsBtn = screen.getByRole('button', { name: /Details & Hinweise/i });
      fireEvent.click(detailsBtn);

      expect(screen.getByText(/OCR-Artefakte erkannt/i)).toBeInTheDocument();
      expect(screen.getByText('Schnittkante leicht abgeschnitten')).toBeInTheDocument();
      expect(screen.getByText('Kontrollieren Sie Datumsangaben')).toBeInTheDocument();
    });

    it('should render compact mode correctly', () => {
      const assessment: OcrAssessmentResponse = {
        score: 0.45,
        level: 'poor',
        issues: ['Schrift unleserlich'],
        warnings: [],
        ocr_artifacts_detected: true,
        readable_words_pct: 42.1,
        language_detected: 'de',
        recommendations: [],
      };

      render(React.createElement(OcrQualityBadge, { assessment, compact: true }));

      expect(screen.getByRole('status')).toHaveTextContent('45% OCR-Score');
      expect(screen.getByText('(Schlechte Lesbarkeit)')).toBeInTheDocument();
    });
  });

  describe('TextCorrectionEditor Component', () => {
    it('should render initial text, permit inline editing, and emit confirmed string upon click', async () => {
      const initial = 'Jobcenter Bescheid: Regelsatz 502,00 EUR';
      const onConfirmMock = vi.fn();

      const assessment: OcrAssessmentResponse = {
        score: 0.85,
        level: 'medium',
        issues: [],
        warnings: [],
        ocr_artifacts_detected: false,
        readable_words_pct: 90,
        language_detected: 'de',
        recommendations: [],
      };

      render(
        React.createElement(TextCorrectionEditor, {
          initialText: initial,
          ocrAssessment: assessment,
          onConfirm: onConfirmMock,
        })
      );

      const textarea = screen.getByLabelText(/Extrahierter Bescheidtext/i);
      expect(textarea).toHaveValue(initial);

      // Edit text inline: change 502 to 563
      const corrected = 'Jobcenter Bescheid: Regelsatz 563,00 EUR';
      fireEvent.change(textarea, { target: { value: corrected } });

      expect(textarea).toHaveValue(corrected);
      expect(screen.getByText('Geändert')).toBeInTheDocument();

      // Click "Text bestätigen & Fortfahren"
      const confirmButton = screen.getByRole('button', {
        name: /Text bestätigen & Fortfahren/i,
      });
      fireEvent.click(confirmButton);

      expect(onConfirmMock).toHaveBeenCalledWith(corrected);
    });

    it('should reset modified text back to initial text when reset button is clicked', () => {
      const initial = 'Ursprünglicher Bescheidtext';
      render(
        React.createElement(TextCorrectionEditor, {
          initialText: initial,
          onConfirm: vi.fn(),
        })
      );

      const textarea = screen.getByLabelText(/Extrahierter Bescheidtext/i);
      fireEvent.change(textarea, { target: { value: 'Veränderter Text' } });
      expect(textarea).toHaveValue('Veränderter Text');

      const resetBtn = screen.getByRole('button', { name: /Zurücksetzen/i });
      fireEvent.click(resetBtn);

      expect(textarea).toHaveValue(initial);
      expect(screen.queryByText('Geändert')).not.toBeInTheDocument();
    });
  });
});

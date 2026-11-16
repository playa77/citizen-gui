import type { HttpClient } from './http';
import type { LocalPreferencesStore } from '@/stores/localPreferences';
import type { IngestResponse, OcrAssessmentResponse } from '@/types/api';

export const MAX_INGESTION_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const SUPPORTED_INGESTION_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.txt',
  '.html',
  '.htm',
  '.eml',
] as const;

export const SUPPORTED_INGESTION_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/plain',
  'text/html',
  'message/rfc822',
] as const;

export class IngestionService {
  constructor(
    private readonly http: HttpClient,
    public readonly prefs: LocalPreferencesStore
  ) {}

  /**
   * Validates file size and format client-side, then uploads document
   * to POST /api/v1/ingest via multipart/form-data.
   */
  public async uploadDocument(file: File): Promise<IngestResponse> {
    if (file.size > MAX_INGESTION_FILE_SIZE_BYTES) {
      throw new Error(
        'Die Datei überschreitet die Höchstgröße von 25 MB oder hat ein nicht unterstütztes Format.'
      );
    }

    if (!this.isSupportedFileType(file)) {
      throw new Error(
        'Die Datei überschreitet die Höchstgröße von 25 MB oder hat ein nicht unterstütztes Format.'
      );
    }

    return this.http.upload<IngestResponse>('/api/v1/ingest', file);
  }

  /**
   * Assesses quality of extracted OCR text via GET /api/v1/ocr/assess?text=...
   */
  public async assessQuality(text: string): Promise<OcrAssessmentResponse> {
    if (!text || text.trim().length === 0) {
      throw new Error('Der zu bewertende Text darf nicht leer sein.');
    }

    if (text.length > 100000) {
      throw new Error('Der Text überschreitet die Höchstgrenze von 100.000 Zeichen.');
    }

    return this.http.request<OcrAssessmentResponse>({
      url: '/api/v1/ocr/assess',
      method: 'GET',
      params: { text },
    });
  }

  /**
   * Client-side validation of file extension and MIME type.
   */
  public isSupportedFileType(file: File): boolean {
    const fileName = file.name.toLowerCase();
    const hasValidExtension = SUPPORTED_INGESTION_EXTENSIONS.some((ext) =>
      fileName.endsWith(ext)
    );

    if (hasValidExtension) {
      return true;
    }

    if (file.type) {
      const mime = file.type.toLowerCase();
      const hasValidMime = SUPPORTED_INGESTION_MIME_TYPES.some((validMime) =>
        mime.startsWith(validMime)
      );
      if (hasValidMime) {
        return true;
      }
    }

    return false;
  }
}

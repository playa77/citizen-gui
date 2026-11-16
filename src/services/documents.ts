import type { HttpClient } from './http';
import type {
  GeneratorOptionsResponse,
  GenerateDocumentRequest,
  GeneratedDocumentResponse,
} from '@/types/api';

/**
 * Service for fetching procedural document generator options
 * and generating legally grounded drafts (Widerspruch, Überprüfungsantrag § 44, Akteneinsicht § 25).
 * [Doc 1 §2.1 FR-07, Doc 2 §8.7, §15.3 Call Trace 5]
 */
export class DocumentService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Fetches valid document generation options, deadline metadata,
   * and required user data slots for a completed case run.
   */
  public async getOptions(caseRunId: string): Promise<GeneratorOptionsResponse> {
    return this.http.request<GeneratorOptionsResponse>({
      url: `/api/v1/documents/generator-options/${encodeURIComponent(caseRunId)}`,
      method: 'GET',
    });
  }

  /**
   * Generates a ready-to-sign procedural letter draft based on the case findings
   * and citizen's user data (name, address, Aktenzeichen).
   */
  public async generate(req: GenerateDocumentRequest): Promise<GeneratedDocumentResponse> {
    return this.http.request<GeneratedDocumentResponse>({
      url: '/api/v1/documents/generate',
      method: 'POST',
      body: req,
    });
  }
}

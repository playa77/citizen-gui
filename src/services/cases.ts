import type { HttpClient } from './http';
import type {
  CaseSummary,
  CaseDetail,
  Claim,
  AdjudicatePayload,
} from '@/types';

export class CasesService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieves the 100 most recent completed case runs.
   * GET /api/v1/cases
   */
  public async listRecentCases(): Promise<CaseSummary[]> {
    return this.http.request<CaseSummary[]>({
      url: '/api/v1/cases',
      method: 'GET',
    });
  }

  /**
   * Retrieves the full details of a specific case run.
   * GET /api/v1/cases/{case_id}
   */
  public async getCase(caseId: string): Promise<CaseDetail> {
    return this.http.request<CaseDetail>({
      url: `/api/v1/cases/${encodeURIComponent(caseId)}`,
      method: 'GET',
    });
  }

  /**
   * Deletes a case run from the persistent store.
   * DELETE /api/v1/cases/{case_id}
   */
  public async deleteCase(caseId: string): Promise<void> {
    await this.http.request<{ status: string; id: string }>({
      url: `/api/v1/cases/${encodeURIComponent(caseId)}`,
      method: 'DELETE',
    });
  }

  /**
   * Records human adjudication (agree/dispute) on a claim or section.
   * POST /api/v1/cases/{case_id}/adjudicate
   */
  public async adjudicate(caseId: string, payload: AdjudicatePayload): Promise<void> {
    await this.http.request<void>({
      url: `/api/v1/cases/${encodeURIComponent(caseId)}/adjudicate`,
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Updates the text of an individual claim.
   * PATCH /api/v1/cases/{case_id}/claims/{claim_id}
   */
  public async patchClaim(
    caseId: string,
    claimId: string,
    text: string
  ): Promise<Claim> {
    return this.http.request<Claim>({
      url: `/api/v1/cases/${encodeURIComponent(caseId)}/claims/${encodeURIComponent(claimId)}`,
      method: 'PATCH',
      body: { claim_text: text },
    });
  }

  /**
   * Downloads case export in JSON or Markdown format.
   * GET /api/v1/cases/{case_id}/export?format=json|markdown
   */
  public async downloadExport(
    caseId: string,
    format: 'json' | 'markdown' = 'json'
  ): Promise<Blob> {
    return this.http.requestBlob({
      url: `/api/v1/cases/${encodeURIComponent(caseId)}/export`,
      method: 'GET',
      params: { format },
    });
  }
}

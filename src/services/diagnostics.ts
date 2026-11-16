import type { HttpClient } from './http';
import type {
  ModulesCatalogResponse,
  CorpusHealthResponse,
  CorpusUpdateResponse,
  CorpusJobStatusResponse,
  GoldsetResponse,
  GoldsetCaseDetail,
  EvalReportsResponse,
  EvalReportDetail,
} from '@/types/api';

/**
 * Diagnostics & Prüfstand Service.
 * Exposes legal module catalog, corpus health monitoring,
 * asynchronous corpus re-indexing background jobs, and goldset eval reports.
 * [Doc 1 §2.1 FR-10, Doc 2 §8.8, §9, §15.1, §15.2 S-07]
 */
export class DiagnosticsService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Fetches installed legal modules catalog.
   */
  public async getModules(): Promise<ModulesCatalogResponse> {
    return this.http.request<ModulesCatalogResponse>({
      url: '/api/v1/modules',
      method: 'GET',
    });
  }

  /**
   * Fetches corpus health status, chunk counts, source breakdown, and warnings.
   */
  public async getCorpusHealth(): Promise<CorpusHealthResponse> {
    return this.http.request<CorpusHealthResponse>({
      url: '/api/v1/corpus/health',
      method: 'GET',
    });
  }

  /**
   * Triggers a corpus re-indexing/update job.
   * [Seam S-07]
   */
  public async triggerCorpusUpdate(sources?: string[]): Promise<CorpusUpdateResponse> {
    return this.http.request<CorpusUpdateResponse>({
      url: '/api/v1/corpus/update',
      method: 'POST',
      body: sources && sources.length > 0 ? { sources } : undefined,
    });
  }

  /**
   * Fetches the current status of a corpus update job.
   */
  public async getCorpusJobStatus(jobId: string): Promise<CorpusJobStatusResponse> {
    return this.http.request<CorpusJobStatusResponse>({
      url: `/api/v1/corpus/status/${encodeURIComponent(jobId)}`,
      method: 'GET',
    });
  }

  /**
   * Polls a corpus update job every intervalMs (default: 3000ms) until completion, failure, or timeout (default: 30min).
   * Emits onUpdate callback on each poll.
   * [Doc 2 §9 Background Jobs]
   */
  public async pollCorpusJob(
    jobId: string,
    onUpdate?: (status: CorpusJobStatusResponse) => void,
    intervalMs = 3000,
    timeoutMs = 30 * 60 * 1000,
    signal?: AbortSignal
  ): Promise<CorpusJobStatusResponse> {
    const startTime = Date.now();

    while (true) {
      if (signal?.aborted) {
        throw new Error('Corpus polling aborted');
      }

      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Corpus update job ${jobId} timed out after ${timeoutMs}ms`);
      }

      const status = await this.getCorpusJobStatus(jobId);
      onUpdate?.(status);

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, intervalMs);
        if (signal) {
          signal.addEventListener(
            'abort',
            () => {
              clearTimeout(timer);
              reject(new Error('Corpus polling aborted'));
            },
            { once: true }
          );
        }
      });
    }
  }

  /**
   * Fetches synthetic verification goldset manifest and case summaries.
   */
  public async getGoldsets(): Promise<GoldsetResponse> {
    return this.http.request<GoldsetResponse>({
      url: '/api/v1/goldset',
      method: 'GET',
    });
  }

  /**
   * Fetches full goldset case detail.
   */
  public async getGoldsetCase(caseId: string): Promise<GoldsetCaseDetail> {
    return this.http.request<GoldsetCaseDetail>({
      url: `/api/v1/goldset/${encodeURIComponent(caseId)}`,
      method: 'GET',
    });
  }

  /**
   * Fetches evaluation reports list.
   */
  public async getEvalReports(): Promise<EvalReportsResponse> {
    return this.http.request<EvalReportsResponse>({
      url: '/api/v1/eval/reports',
      method: 'GET',
    });
  }

  /**
   * Fetches single evaluation report detail.
   */
  public async getEvalReport(reportId: string): Promise<EvalReportDetail> {
    return this.http.request<EvalReportDetail>({
      url: `/api/v1/eval/reports/${encodeURIComponent(reportId)}`,
      method: 'GET',
    });
  }
}

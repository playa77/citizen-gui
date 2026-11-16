import type { SseClient, SseCallbacks } from './sse';
import { streamingStore, type StreamingStore } from '@/stores/streamingStore';
import type { PipelineStage } from '@/types/events';

export class AnalysisService {
  constructor(
    private readonly sse: SseClient,
    private readonly store: StreamingStore = streamingStore
  ) {}

  /**
   * Dispatches document analysis pipeline via SSE stream to POST /api/v1/analyze.
   * Updates streamingStore in real time across all 11 stages.
   */
  public async startAnalysis(
    text: string,
    legalAreas: string[] = ['sozialrecht']
  ): Promise<void> {
    this.store.startConnecting();

    const callbacks: SseCallbacks = {
      onStageEvent: (event) => {
        this.store.updateStage(event.stage, event.status, event.payload);
      },
      onToken: (token) => {
        this.store.appendToken(token);
      },
      onFinal: (payload) => {
        this.store.setFinal(payload);
      },
      onError: (error) => {
        this.store.setError(error);
      },
    };

    await this.sse.streamPipeline(
      '/api/v1/analyze',
      {
        text,
        legal_areas: legalAreas,
      },
      callbacks
    );
  }

  /**
   * Re-evaluates a single pipeline stage for an existing case via
   * POST /api/v1/cases/{caseId}/reevaluate.
   */
  public async reevaluateStage(
    caseId: string,
    stage: PipelineStage,
    context: string
  ): Promise<void> {
    this.store.updateStage(stage, 'running', { context });

    const callbacks: SseCallbacks = {
      onStageEvent: (event) => {
        this.store.updateStage(event.stage, event.status, event.payload);
      },
      onToken: (token) => {
        this.store.appendToken(token);
      },
      onFinal: (payload) => {
        this.store.setFinal(payload);
      },
      onError: (error) => {
        this.store.setError(error);
      },
    };

    await this.sse.streamPipeline(
      `/api/v1/cases/${encodeURIComponent(caseId)}/reevaluate`,
      {
        stage,
        context,
      },
      callbacks
    );
  }
}

import { useSyncExternalStore } from 'react';
import type {
  PipelineStage,
  StageStatus,
  AnalysisFinalEventPayload,
  AnalysisErrorEventPayload,
} from '@/types/events';

export const PIPELINE_STAGES: PipelineStage[] = [
  'corpus_health',
  'ocr_quality',
  'normalization',
  'classification',
  'decomposition',
  'retrieval',
  'construction',
  'verification',
  'generation',
  'adversarial_review',
  'calculation_check',
];

export type StreamingStatus = 'idle' | 'connecting' | 'streaming' | 'complete' | 'error';

export interface StageState {
  stage: PipelineStage;
  status: StageStatus | 'pending' | 'error';
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  payload?: Record<string, unknown>;
}

export interface StreamingState {
  status: StreamingStatus;
  activeStage: PipelineStage | null;
  stages: Record<PipelineStage, StageState>;
  tokens: string;
  finalPayload: AnalysisFinalEventPayload | null;
  caseRunId: string | null;
  error: AnalysisErrorEventPayload | null;
  startedAt?: number;
  completedAt?: number;
}

const createInitialStages = (): Record<PipelineStage, StageState> => {
  const record: Partial<Record<PipelineStage, StageState>> = {};
  for (const stage of PIPELINE_STAGES) {
    record[stage] = {
      stage,
      status: 'pending',
    };
  }
  return record as Record<PipelineStage, StageState>;
};

const initialState: StreamingState = {
  status: 'idle',
  activeStage: null,
  stages: createInitialStages(),
  tokens: '',
  finalPayload: null,
  caseRunId: null,
  error: null,
};

export class StreamingStore {
  private state: StreamingState = { ...initialState, stages: createInitialStages() };
  private listeners: Set<() => void> = new Set();

  public getState = (): StreamingState => {
    return this.state;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private setState(partial: Partial<StreamingState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  public startConnecting(): void {
    this.setState({
      status: 'connecting',
      activeStage: null,
      stages: createInitialStages(),
      tokens: '',
      finalPayload: null,
      caseRunId: null,
      error: null,
      startedAt: Date.now(),
      completedAt: undefined,
    });
  }

  public startStreaming(): void {
    this.setState({ status: 'streaming' });
  }

  public updateStage(
    stage: PipelineStage,
    status: StageStatus,
    payload?: Record<string, unknown>
  ): void {
    const now = Date.now();
    const currentStageState = this.state.stages[stage] || { stage, status: 'pending' };

    let startedAt = currentStageState.startedAt;
    let completedAt = currentStageState.completedAt;
    let durationMs = currentStageState.durationMs;

    if (status === 'running') {
      if (!startedAt) {
        startedAt = now;
      }
    } else if (status === 'complete' || status === 'ok' || status === 'warning' || status === 'info') {
      if (!completedAt) {
        completedAt = now;
      }
      if (startedAt && !durationMs) {
        durationMs = now - startedAt;
      }
    }

    const updatedStage: StageState = {
      ...currentStageState,
      status,
      startedAt,
      completedAt,
      durationMs,
      payload: payload ?? currentStageState.payload,
    };

    const nextStages = {
      ...this.state.stages,
      [stage]: updatedStage,
    };

    this.setState({
      status: 'streaming',
      activeStage: status === 'running' ? stage : this.state.activeStage === stage ? null : this.state.activeStage,
      stages: nextStages,
    });
  }

  public appendToken(token: string): void {
    this.setState({
      tokens: this.state.tokens + token,
    });
  }

  public setFinal(payload: AnalysisFinalEventPayload): void {
    const now = Date.now();
    // Complete any stage that was still marked as running
    const nextStages = { ...this.state.stages };
    for (const stage of PIPELINE_STAGES) {
      const s = nextStages[stage];
      if (s && s.status === 'running') {
        nextStages[stage] = {
          ...s,
          status: 'complete',
          completedAt: now,
          durationMs: s.startedAt ? now - s.startedAt : undefined,
        };
      }
    }

    // Persist caseRunId in URL query params if window is present
    if (typeof window !== 'undefined' && payload.case_run_id) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('caseRunId', payload.case_run_id);
        window.history.replaceState({}, '', url.toString());
      } catch {
        // Ignore in non-browser environment
      }
    }

    this.setState({
      status: 'complete',
      activeStage: null,
      stages: nextStages,
      finalPayload: payload,
      caseRunId: payload.case_run_id,
      completedAt: now,
    });
  }

  public setError(error: AnalysisErrorEventPayload): void {
    const nextStages = { ...this.state.stages };
    if (this.state.activeStage) {
      const active = nextStages[this.state.activeStage];
      if (active) {
        nextStages[this.state.activeStage] = {
          ...active,
          status: 'error',
          completedAt: Date.now(),
        };
      }
    }

    this.setState({
      status: 'error',
      activeStage: null,
      stages: nextStages,
      error,
      completedAt: Date.now(),
    });
  }

  public reset(): void {
    this.state = {
      ...initialState,
      stages: createInitialStages(),
    };
    this.notify();
  }
}

export const streamingStore = new StreamingStore();

export function useStreamingStore<T = StreamingState>(
  selector: (state: StreamingState) => T = (s) => s as unknown as T
): T {
  return useSyncExternalStore(
    streamingStore.subscribe,
    () => selector(streamingStore.getState()),
    () => selector(streamingStore.getState())
  );
}

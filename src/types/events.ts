import type {
  Art50Disclosure,
  FinalOutputStructure,
  ProvenancePayload,
  ResolvedModule,
} from './api';

// ==========================================
// 1. Pipeline Stages & Statuses
// ==========================================
export type PipelineStage =
  | "corpus_health"
  | "ocr_quality"
  | "normalization"
  | "classification"
  | "decomposition"
  | "retrieval"
  | "construction"
  | "verification"
  | "generation"
  | "adversarial_review"
  | "calculation_check";

export type StageStatus = "running" | "complete" | "ok" | "warning" | "info";

// ==========================================
// 2. SSE Event Payloads
// ==========================================
export interface SseStageEventPayload {
  stage: PipelineStage;
  status: StageStatus;
  payload: Record<string, unknown>;
}

export interface AnalysisFinalEventPayload {
  session_id: string;
  case_run_id: string;
  sections: string[];
  final_output: FinalOutputStructure;
  disclosure: Art50Disclosure;
  provenance: ProvenancePayload;
  resolved_modules?: ResolvedModule[];
}

export interface AnalysisErrorEventPayload {
  error: string;
  detail?: string;
  session_id?: string;
}

// Aliases for compatibility
export type SseStageEvent = SseStageEventPayload;
export type AnalysisFinalPayload = AnalysisFinalEventPayload;

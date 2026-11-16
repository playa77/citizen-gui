import type { PipelineStage } from './events';
import type {
  DocType,
  FinalOutputStructure,
  OcrAssessmentResponse,
  ProvenancePayload,
} from './api';

// ==========================================
// 1. Evidence Bindings & Claims
// ==========================================
export interface EvidenceBinding {
  chunk_id: string;
  quote_excerpt: string;
  binding_strength: number;
  verified: boolean;
}

export type ClaimType = "fact" | "legal_finding" | "deadline" | "calculation";
export type AdjudicationStatus = "agreed" | "disputed";

export interface Claim {
  id: string;
  claim_text: string;
  confidence_score: number;
  claim_type: ClaimType;
  evidence_bindings: EvidenceBinding[];
  user_status?: AdjudicationStatus;
  user_note?: string;
}

// ==========================================
// 2. Case Management Models
// ==========================================
export interface CaseSummary {
  id: string;
  session_id: string;
  title: string;
  status: "completed" | "failed" | "processing";
  created_at: string;
  updated_at: string;
  input_preview: string;
  legal_areas: Array<{ legal_area: string; is_primary: boolean }>;
}

export interface CaseStage {
  stage: PipelineStage;
  duration_ms: number;
  status: string;
}

export interface CaseChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface CaseDetail extends CaseSummary {
  input_text: string;
  final_output: FinalOutputStructure;
  stages: CaseStage[];
  claims: Claim[];
  chat_history: CaseChatMessage[];
  user_edits: {
    edited_claims: Record<string, string>;
    section_adjudications: Record<string, AdjudicationStatus>;
  };
}

// ==========================================
// 3. Document Generation Models & Slots
// ==========================================
export interface DocumentSlot {
  key: string;
  value: string;
  verified: boolean;
  needs_review: boolean;
}

export interface DocumentGeneratorOption {
  doc_type: DocType;
  title: string;
  description: string;
  deadline_date?: string;
}

export interface GeneratedDocument {
  doc_type: string;
  title: string;
  rendered_text: string;
  slots: DocumentSlot[];
  generation_metadata: Record<string, unknown>;
  provenance: ProvenancePayload;
}

// Aliases
export type OcrAssessment = OcrAssessmentResponse;

// ==========================================
// 4. Conversations & Intake Domain Types
// ==========================================
export type {
  ConversationSummary,
  ConversationDetail,
  ConversationMessage,
  AttachedDocument,
  SendMessageRequest,
  ConversationStreamDoneEvent,
  IntakeStartRequest,
  IntakeMessage,
  IntakeResult,
  IntakeSession,
  IntakeSendMessageRequest,
} from './api';

// ==========================================
// 5. Client Storage Preferences Types
// ==========================================
export type UiTheme = "light" | "dark" | "system";
export type DevDocumentTag = "synthetic" | "goldset";

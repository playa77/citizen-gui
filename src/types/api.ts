import type { DocumentSlot } from './domain';

// ==========================================
// 1. Legal Compliance, Meta & Provenance
// ==========================================
export interface DisclaimerVersionResponse {
  version: string;
}

export interface DisclaimerTextResponse {
  text: string;
  version: string;
}

export interface Art50Disclosure {
  version: string;
  must_display_before: "results";
  texts: {
    de: string;
    en: string;
  };
}

export interface ProvenanceModule {
  id: string;
  version: string;
  parameter_set: string | null;
}

export type DeploymentMode = "dev" | "self" | "provider";

export interface ProvenancePayload {
  spec_version: "citizen-provenance-v1.1";
  generator: "citizen";
  app_version: string;
  model_profile: string;
  timestamp_utc: string;
  deployment_mode: DeploymentMode;
  modules: ProvenanceModule[];
}

export interface DeploymentModeResponse {
  mode: DeploymentMode;
  synthetic_data_only: boolean;
  dev: boolean;
  dev_banner: string | null;
}

export interface LegalTimestampResponse {
  parameter_freshness: string | null;
  corpus_freshness: string | null;
}

export interface HealthResponse {
  status: "ok";
  version: string;
}

// ==========================================
// 2. Ingestion & OCR Quality
// ==========================================
export interface IngestResponse {
  text: string;
}

export type OcrQualityLevel = "good" | "medium" | "poor";

export interface OcrAssessmentResponse {
  score: number;
  level: OcrQualityLevel;
  issues: string[];
  warnings: string[];
  ocr_artifacts_detected: boolean;
  readable_words_pct: number;
  language_detected: string;
  recommendations: string[];
}

// ==========================================
// 3. Pipeline Structures
// ==========================================
export interface ResolvedModule {
  legal_area: string;
  module_id: string | null;
  module_version: string | null;
  legacy_alias: boolean;
  enabled: boolean;
}

export interface CalculationPosition {
  bezeichnung: string;
  behoerde_cent: number;
  korrekt_cent: number;
  abwaegungsgrundlage: string;
}

export interface FinalOutputStructure {
  sachverhalt?: string;
  ergebnis?: string;
  fristen?: {
    bescheid_datum?: string;
    zustellungs_fiktion?: string;
    frist_ende?: string;
    feiertags_rollover?: boolean;
    rechtsbehelfsbelehrung_korrekt?: boolean;
    gesetzliche_grundlage?: string;
  };
  berechnung?: {
    anspruch_ermittelt_cent: number;
    anspruch_bescheid_cent: number;
    differenz_cent: number;
    positionen: CalculationPosition[];
  };
  adversarial_verhaeltnis?: {
    behoerden_sicht: string;
    buerger_sicht: string;
    risiko_einschaetzung: string;
  };
  [key: string]: unknown;
}

// ==========================================
// 4. Case Management & Adjudication API
// ==========================================
export interface AdjudicatePayload {
  target_type: "claim" | "section";
  target_id: string;
  status: "agreed" | "disputed";
  note?: string;
}

// ==========================================
// 5. Document Generation API
// ==========================================
export type DocType =
  | "widerspruch"
  | "widerspruch_jahresfrist"
  | "ueberpruefungsantrag_44"
  | "akteneinsichtsantrag_25";

export interface GeneratorOptionsResponse {
  case_run_id: string;
  available_doc_types: Array<{
    doc_type: DocType;
    title: string;
    description: string;
  }>;
  frist_info?: {
    datum: string;
    ist_jahresfrist: boolean;
  };
  user_slots_required: string[];
}

export interface GenerateDocumentRequest {
  case_run_id: string;
  doc_type?: DocType;
  user_data: {
    name: string;
    adresse: string;
    aktenzeichen?: string;
    [key: string]: string | undefined;
  };
}

export interface GeneratedDocumentResponse {
  doc_type: string;
  title: string;
  rendered_text: string;
  slots: DocumentSlot[];
  generation_metadata: {
    selected_by: string;
    frist_am?: string;
    [key: string]: unknown;
  };
  provenance: ProvenancePayload;
}

// ==========================================
// 6. Legal Modules & Diagnostics
// ==========================================
export interface ModuleSummary {
  id: string;
  version: string;
  tier: "verified" | "experimental";
  enabled: boolean;
  is_default: boolean;
  title: {
    de: string;
    en: string;
  };
  area_keys: string[];
  corpus: {
    chunk_count: number;
    source_types: string[];
    present_source_types: string[];
    missing_source_types: string[];
    is_ready: boolean;
  } | null;
  installed_at: string | null;
}

export interface ModulesCatalogResponse {
  default_module: string;
  modules: ModuleSummary[];
}

export interface CorpusHealthSource {
  type: string;
  chunk_count: number;
  last_updated: string;
}

export interface CorpusHealthResponse {
  total_chunks: number;
  total_sources: number;
  is_healthy: boolean;
  sources: CorpusHealthSource[];
  warnings: string[];
}

export interface CorpusUpdateResponse {
  job_id: string;
  status: "queued";
}

export type CorpusJobStatus = "queued" | "running" | "completed" | "failed";
export type CorpusJobSubstage = "scraping" | "embedding" | null;

export interface CorpusJobStatusResponse {
  job_id: string;
  status: CorpusJobStatus;
  substage: CorpusJobSubstage;
  chunks_scraped: number;
  chunks_processed: number;
  chunks_embedded: number;
  chunks_upserted: number;
}

export interface GoldsetCaseSummary {
  id: string;
  title: string;
  description: string;
  legal_area: string;
  expected_findings_count?: number;
}

export interface GoldsetManifest {
  id: string;
  version: string;
  legal_area?: string;
  title?: string;
  description?: string;
}

export interface GoldsetResponse {
  goldset: GoldsetManifest;
  cases: GoldsetCaseSummary[];
}

export interface GoldsetCaseDetail extends GoldsetCaseSummary {
  input_document_text?: string;
  expected_findings?: string[];
  citations?: string[];
  calculation?: Record<string, unknown>;
  traps?: string[];
}

export interface EvalReportSummary {
  report_id: string;
  goldset_version: string;
  git_sha?: string;
  run_timestamp: string;
  case_count: number;
  aggregate: {
    issue_recall: number;
    citation_precision: number;
    calculation_exact_match?: number;
    frist_exact_match?: number;
    assessment_match?: number;
    quote_verification_rate?: number;
    zero_regression?: boolean;
    [key: string]: unknown;
  };
}

export interface EvalReportsResponse {
  reports: EvalReportSummary[];
}

export interface EvalReportDetail extends EvalReportSummary {
  cases?: Array<{
    case_id: string;
    issue_recall: number;
    citation_precision: number;
    calculation_exact_match?: boolean;
    frist_exact_match?: boolean;
    latency_ms?: number;
    errors?: string[];
  }>;
}

// ==========================================
// 7. Conversations (Chat-First API)
// ==========================================
export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  document_count: number;
}

export interface AttachedDocument {
  id: string;
  original_filename: string;
  created_at: string;
  mime_type?: string;
  file_size_bytes?: number;
}

export interface ConversationMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
  disclosure?: Art50Disclosure;
  provenance?: ProvenancePayload;
  sections?: string[];
  final_output?: Record<string, unknown>;
}

export interface ConversationDetail {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ConversationMessage[];
  documents: AttachedDocument[];
}

export interface SendMessageRequest {
  content: string;
}

export interface ConversationStreamDoneEvent {
  type: "done";
  full_response: string;
  disclosure: Art50Disclosure;
  provenance: ProvenancePayload;
}

// ==========================================
// 8. Intake Interviews API
// ==========================================
export interface IntakeStartRequest {
  session_id?: string;
  initial_text: string;
  max_turns?: number; // 2..12, default 8
}

export interface IntakeMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

export interface IntakeResult {
  legal_areas: string[];
  summary: string;
  key_facts: Record<string, unknown>;
  open_questions: string[];
}

export interface IntakeSession {
  id: string;
  session_id: string;
  state: "active" | "done";
  turn_count: number;
  max_turns: number;
  messages: IntakeMessage[];
  question?: string;
  intake_result?: IntakeResult;
  resolved_modules?: ResolvedModule[];
  primary_area?: string;
  secondary_areas?: string[];
}

export interface IntakeSendMessageRequest {
  message: string;
}


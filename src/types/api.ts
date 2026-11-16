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

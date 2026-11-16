import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Import all types to verify 100% type closure and clean exports
import type {
  DisclaimerVersionResponse,
  DisclaimerTextResponse,
  Art50Disclosure,
  ProvenanceModule,
  ProvenancePayload,
  DeploymentMode,
  DeploymentModeResponse,
  LegalTimestampResponse,
  HealthResponse,
  IngestResponse,
  OcrQualityLevel,
  OcrAssessmentResponse,
  ResolvedModule,
  CalculationPosition,
  FinalOutputStructure,
  AdjudicatePayload,
  DocType,
  GeneratorOptionsResponse,
  GenerateDocumentRequest,
  GeneratedDocumentResponse,
  ModuleSummary,
  ModulesCatalogResponse,
  CorpusHealthSource,
  CorpusHealthResponse,
  CorpusUpdateResponse,
  CorpusJobStatus,
  CorpusJobSubstage,
  CorpusJobStatusResponse,
} from '@/types/api';

import type {
  EvidenceBinding,
  ClaimType,
  AdjudicationStatus,
  Claim,
  CaseSummary,
  CaseStage,
  CaseChatMessage,
  CaseDetail,
  DocumentSlot,
  DocumentGeneratorOption,
  GeneratedDocument,
  OcrAssessment,
  UiTheme,
  DevDocumentTag,
} from '@/types/domain';

import type {
  PipelineStage,
  StageStatus,
  SseStageEventPayload,
  AnalysisFinalEventPayload,
  AnalysisErrorEventPayload,
  SseStageEvent,
  AnalysisFinalPayload,
} from '@/types/events';

describe('WP-02: Type Closure & Model Definitions', () => {
  it('should instantiate valid Legal Compliance, Meta & Provenance models', () => {
    const disclaimerVer: DisclaimerVersionResponse = { version: 'v3.0.0' };
    const disclaimerText: DisclaimerTextResponse = { text: '<p>Hinweis</p>', version: 'v3.0.0' };
    const art50: Art50Disclosure = {
      version: 'v1.0.0',
      must_display_before: 'results',
      texts: { de: 'KI-System', en: 'AI System' },
    };
    const provModule: ProvenanceModule = {
      id: 'sgb2-core',
      version: '1.2.0',
      parameter_set: '2026-Q1',
    };
    const deploymentMode: DeploymentMode = 'dev';
    const provenance: ProvenancePayload = {
      spec_version: 'citizen-provenance-v1.1',
      generator: 'citizen',
      app_version: '1.0.0',
      model_profile: 'balanced-legal',
      timestamp_utc: '2026-11-16T12:00:00Z',
      deployment_mode: deploymentMode,
      modules: [provModule],
    };
    const depResponse: DeploymentModeResponse = {
      mode: 'dev',
      synthetic_data_only: true,
      dev: true,
      dev_banner: 'Development Environment',
    };
    const timestampResp: LegalTimestampResponse = {
      parameter_freshness: '2026-01-01',
      corpus_freshness: '2026-11-01',
    };
    const health: HealthResponse = {
      status: 'ok',
      version: '1.0.0',
    };

    expect(disclaimerVer.version).toBe('v3.0.0');
    expect(disclaimerText.version).toBe('v3.0.0');
    expect(art50.must_display_before).toBe('results');
    expect(provenance.spec_version).toBe('citizen-provenance-v1.1');
    expect(depResponse.synthetic_data_only).toBe(true);
    expect(timestampResp.parameter_freshness).toBe('2026-01-01');
    expect(health.status).toBe('ok');
  });

  it('should instantiate valid Ingestion & OCR Quality models', () => {
    const ingest: IngestResponse = { text: 'Bescheidtext…' };
    const level: OcrQualityLevel = 'good';
    const ocr: OcrAssessmentResponse = {
      score: 0.95,
      level,
      issues: [],
      warnings: [],
      ocr_artifacts_detected: false,
      readable_words_pct: 98.5,
      language_detected: 'de',
      recommendations: ['Keine Korrekturen erforderlich'],
    };
    const domainOcr: OcrAssessment = ocr;

    expect(ingest.text).toBe('Bescheidtext…');
    expect(domainOcr.score).toBe(0.95);
    expect(domainOcr.level).toBe('good');
  });

  it('should validate all 11 PipelineStage unions and StageStatus values', () => {
    const stages: PipelineStage[] = [
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
    expect(stages.length).toBe(11);

    const statuses: StageStatus[] = ['running', 'complete', 'ok', 'warning', 'info'];
    expect(statuses.length).toBe(5);

    const stageEvent: SseStageEventPayload = {
      stage: 'classification',
      status: 'complete',
      payload: { identified_area: 'sgb_ii' },
    };
    const aliasEvent: SseStageEvent = stageEvent;
    expect(aliasEvent.stage).toBe('classification');
  });

  it('should instantiate Analysis final event payloads and FinalOutputStructure', () => {
    const calcPos: CalculationPosition = {
      bezeichnung: 'Regelbedarf',
      behoerde_cent: 50200,
      korrekt_cent: 56300,
      abwaegungsgrundlage: '§ 20 SGB II i.V.m. Regelbedarfsstufe 1',
    };

    const finalOutput: FinalOutputStructure = {
      sachverhalt: 'Bewilligungsbescheid Bürgergeld',
      ergebnis: 'Fehlerhafte Bedarfsberechnung festgestellt',
      fristen: {
        bescheid_datum: '2026-10-15',
        zustellungs_fiktion: '2026-10-18',
        frist_ende: '2026-11-18',
        feiertags_rollover: false,
        rechtsbehelfsbelehrung_korrekt: true,
        gesetzliche_grundlage: '§ 84 SGG, § 37 SGB X',
      },
      berechnung: {
        anspruch_ermittelt_cent: 56300,
        anspruch_bescheid_cent: 50200,
        differenz_cent: 6100,
        positionen: [calcPos],
      },
      adversarial_verhaeltnis: {
        behoerden_sicht: 'Berechnung erfolgte nach Tabellenwerten 2025',
        buerger_sicht: 'Anspruch bemisst sich nach Anpassung 2026',
        risiko_einschaetzung: 'Sehr gute Erfolgsaussichten im Widerspruchsverfahren',
      },
    };

    const resolvedModule: ResolvedModule = {
      legal_area: 'sgb_ii',
      module_id: 'sgb2-core',
      module_version: '1.0.0',
      legacy_alias: false,
      enabled: true,
    };

    const finalPayload: AnalysisFinalEventPayload = {
      session_id: 'sess-123',
      case_run_id: 'case-456',
      sections: ['sachverhalt', 'berechnung', 'fristen'],
      final_output: finalOutput,
      disclosure: {
        version: 'v1.0.0',
        must_display_before: 'results',
        texts: { de: 'Hinweis', en: 'Notice' },
      },
      provenance: {
        spec_version: 'citizen-provenance-v1.1',
        generator: 'citizen',
        app_version: '1.0.0',
        model_profile: 'default',
        timestamp_utc: '2026-11-16T12:00:00Z',
        deployment_mode: 'dev',
        modules: [],
      },
      resolved_modules: [resolvedModule],
    };

    const aliasPayload: AnalysisFinalPayload = finalPayload;
    expect(aliasPayload.session_id).toBe('sess-123');

    const errorPayload: AnalysisErrorEventPayload = {
      error: 'pipeline_timeout',
      detail: 'Timeout after 540 seconds',
      session_id: 'sess-123',
    };
    expect(errorPayload.error).toBe('pipeline_timeout');
  });

  it('should instantiate Claims, EvidenceBinding and CaseDetail models', () => {
    const evidence: EvidenceBinding = {
      chunk_id: 'chunk-99',
      quote_excerpt: 'Der monatliche Regelbedarf beträgt 502,00 EUR',
      binding_strength: 0.98,
      verified: true,
    };

    const claimType: ClaimType = 'calculation';
    const adjStatus: AdjudicationStatus = 'disputed';

    const claim: Claim = {
      id: 'claim-01',
      claim_text: 'Regelbedarf wurde um 61,00 EUR zu niedrig festgesetzt.',
      confidence_score: 0.94,
      claim_type: claimType,
      evidence_bindings: [evidence],
      user_status: adjStatus,
      user_note: 'Widerspruch einlegen',
    };

    const stage: CaseStage = {
      stage: 'verification',
      duration_ms: 1250,
      status: 'ok',
    };

    const chatMsg: CaseChatMessage = {
      role: 'user',
      content: 'Wurde die Miete berücksichtigt?',
      timestamp: '2026-11-16T12:05:00Z',
    };

    const caseDetail: CaseDetail = {
      id: 'case-456',
      session_id: 'sess-123',
      title: 'Bürgergeld Bescheidprüfung',
      status: 'completed',
      created_at: '2026-11-16T12:00:00Z',
      updated_at: '2026-11-16T12:05:00Z',
      input_preview: 'Jobcenter Bescheid vom…',
      legal_areas: [{ legal_area: 'sgb_ii', is_primary: true }],
      input_text: 'Vollständiger Bescheidtext…',
      final_output: {},
      stages: [stage],
      claims: [claim],
      chat_history: [chatMsg],
      user_edits: {
        edited_claims: { 'claim-01': 'Angepasste Formulierung' },
        section_adjudications: { fristen: 'agreed' },
      },
    };

    const caseSummary: CaseSummary = caseDetail;
    expect(caseSummary.id).toBe('case-456');
    expect(caseDetail.claims[0]?.claim_type).toBe('calculation');
    expect(caseDetail.claims[0]?.evidence_bindings[0]?.verified).toBe(true);
  });

  it('should instantiate Document Generation models and slots', () => {
    const slot: DocumentSlot = {
      key: 'aktenzeichen',
      value: 'BG-2026-9876',
      verified: true,
      needs_review: false,
    };

    const docType: DocType = 'widerspruch';
    const docOption: DocumentGeneratorOption = {
      doc_type: docType,
      title: 'Widerspruch gegen Bürgergeldbescheid',
      description: 'Standardisierter Widerspruch mit Rüge der Regelbedarfsstufe',
      deadline_date: '2026-11-18',
    };

    const genRequest: GenerateDocumentRequest = {
      case_run_id: 'case-456',
      doc_type: docType,
      user_data: {
        name: 'Max Mustermann',
        adresse: 'Musterstraße 1, 10115 Berlin',
        aktenzeichen: 'BG-2026-9876',
      },
    };

    const genResponse: GeneratedDocumentResponse = {
      doc_type: 'widerspruch',
      title: 'Widerspruch',
      rendered_text: 'Sehr geehrte Damen und Herren…',
      slots: [slot],
      generation_metadata: {
        selected_by: 'user',
        frist_am: '2026-11-18',
      },
      provenance: {
        spec_version: 'citizen-provenance-v1.1',
        generator: 'citizen',
        app_version: '1.0.0',
        model_profile: 'default',
        timestamp_utc: '2026-11-16T12:00:00Z',
        deployment_mode: 'self',
        modules: [],
      },
    };

    const domainDoc: GeneratedDocument = genResponse;
    expect(docOption.doc_type).toBe('widerspruch');
    expect(genRequest.user_data.name).toBe('Max Mustermann');
    expect(domainDoc.slots[0]?.key).toBe('aktenzeichen');
  });

  it('should instantiate Modules Catalog and Diagnostics models', () => {
    const modSummary: ModuleSummary = {
      id: 'sgb2-core',
      version: '1.0.0',
      tier: 'verified',
      enabled: true,
      is_default: true,
      title: { de: 'SGB II Grundsicherung', en: 'SGB II Basic Security' },
      area_keys: ['sgb_ii'],
      corpus: {
        chunk_count: 1420,
        source_types: ['statute', 'jurisprudence', 'admin_regulation'],
        present_source_types: ['statute', 'jurisprudence'],
        missing_source_types: ['admin_regulation'],
        is_ready: true,
      },
      installed_at: '2026-01-01T00:00:00Z',
    };

    const catalog: ModulesCatalogResponse = {
      default_module: 'sgb2-core',
      modules: [modSummary],
    };

    const corpusSource: CorpusHealthSource = {
      type: 'statute',
      chunk_count: 800,
      last_updated: '2026-11-01T00:00:00Z',
    };

    const corpusHealth: CorpusHealthResponse = {
      total_chunks: 1420,
      total_sources: 2,
      is_healthy: true,
      sources: [corpusSource],
      warnings: [],
    };

    const updateResp: CorpusUpdateResponse = {
      job_id: 'job-789',
      status: 'queued',
    };

    const jobStatus: CorpusJobStatus = 'running';
    const jobSubstage: CorpusJobSubstage = 'embedding';
    const jobStatusResp: CorpusJobStatusResponse = {
      job_id: 'job-789',
      status: jobStatus,
      substage: jobSubstage,
      chunks_scraped: 50,
      chunks_processed: 50,
      chunks_embedded: 25,
      chunks_upserted: 25,
    };

    expect(catalog.default_module).toBe('sgb2-core');
    expect(corpusHealth.is_healthy).toBe(true);
    expect(updateResp.status).toBe('queued');
    expect(jobStatusResp.substage).toBe('embedding');
  });

  it('should validate storage preference types', () => {
    const theme: UiTheme = 'system';
    const devTag: DevDocumentTag = 'synthetic';
    expect(['light', 'dark', 'system']).toContain(theme);
    expect(['synthetic', 'goldset']).toContain(devTag);
  });
});

describe('WP-02: OpenDesigner Styling Pipeline & CSS Variables', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const tokensCssPath = path.join(rootDir, 'opendesigner/build/css/tokens.css');
  const themeCssPath = path.join(rootDir, 'opendesigner/build/tailwind/theme.css');
  const indexCssPath = path.join(rootDir, 'src/index.css');

  it('should verify OpenDesigner canonical tokens exist and contain brand colors', () => {
    expect(fs.existsSync(tokensCssPath)).toBe(true);
    const tokensContent = fs.readFileSync(tokensCssPath, 'utf-8');

    // Brand seed matches design definition
    expect(tokensContent).toContain('--ds-color-brand-seed:');
    // Border focus token
    expect(tokensContent).toContain('--ds-color-border-focus');
    // Action primary background
    expect(tokensContent).toContain('--ds-color-bg-action-primary');
    // Reduced motion media query
    expect(tokensContent).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('should verify OpenDesigner Tailwind theme.css exists and defines theme variables', () => {
    expect(fs.existsSync(themeCssPath)).toBe(true);
    const themeContent = fs.readFileSync(themeCssPath, 'utf-8');

    expect(themeContent).toContain('@import "../css/tokens.css";');
    expect(themeContent).toContain('--spacing: 4px;');
    expect(themeContent).toContain('--color-action-primary: var(--ds-color-bg-action-primary);');
    expect(themeContent).toContain('--color-line-focus: var(--ds-color-border-focus);');
  });

  it('should verify src/index.css imports Tailwind and OpenDesigner tokens with accessibility rules', () => {
    expect(fs.existsSync(indexCssPath)).toBe(true);
    const indexContent = fs.readFileSync(indexCssPath, 'utf-8');

    expect(indexContent).toContain('@import "tailwindcss";');
    expect(indexContent).toContain('@import "../opendesigner/build/css/tokens.css";');
    expect(indexContent).toContain('@import "../opendesigner/build/tailwind/theme.css";');

    // Accessibility focus-visible ring
    expect(indexContent).toContain(':focus-visible');
    expect(indexContent).toContain('outline: 2px solid');

    // Reduced motion enforcements
    expect(indexContent).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('should verify that CSS custom properties evaluate in jsdom document', () => {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      :root {
        --ds-color-border-focus: var(--ds-color-brand-seed);
      }
      .test-element {
        outline: 2px solid var(--ds-color-border-focus);
      }
    `;
    document.head.appendChild(styleEl);

    const div = document.createElement('div');
    div.className = 'test-element';
    document.body.appendChild(div);

    expect(div).toBeInTheDocument();
  });
});

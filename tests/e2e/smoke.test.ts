import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CompositionRoot } from '@/compositionRoot';
import { complianceStore } from '@/stores/complianceStore';
import { streamingStore } from '@/stores/streamingStore';
import type {
  DisclaimerVersionResponse,
  DisclaimerTextResponse,
  Art50Disclosure,
  DeploymentModeResponse,
  IngestResponse,
  OcrAssessmentResponse,
  AnalysisFinalEventPayload,
  AdjudicatePayload,
  GeneratorOptionsResponse,
  GenerateDocumentRequest,
  GeneratedDocumentResponse,
  ModulesCatalogResponse,
  CorpusHealthResponse,
  GoldsetResponse,
  EvalReportsResponse,
} from '@/types/api';

describe('WP-12: End-to-End System Smoke Verification [Doc 1 §2.1, §8, Doc 2 §14 AC-01..08, §15.3 Call Traces 1–5]', () => {
  beforeEach(() => {
    window.localStorage.clear();
    complianceStore.setDisclaimerModalOpen(false);
    streamingStore.reset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('executes full sovereign lifecycle: Call Traces 1 through 5 and System Diagnostics', async () => {
    // =========================================================================
    // Call Trace 1: Application Bootstrap & Disclaimer Handshake (AC-01)
    // =========================================================================
    const backendDisclaimerVersion: DisclaimerVersionResponse = {
      version: 'v3.0.0',
    };
    const disclaimerTextRes: DisclaimerTextResponse = {
      version: 'v3.0.0',
      text: '<p>Rechtlicher Hinweis: Citizen ist ein experimentelles Assistenzsystem.</p>',
    };
    const deploymentModeRes: DeploymentModeResponse = {
      mode: 'dev',
      synthetic_data_only: true,
      dev: true,
      dev_banner: 'Entwicklungsumgebung: Nur synthetische Testdaten.',
    };

    // Configure HTTP mock responses for Bootstrap
    const httpSpy = vi.spyOn(CompositionRoot.http, 'request').mockImplementation(async (config) => {
      if (config.url === '/api/v1/meta/disclaimer/version') {
        return backendDisclaimerVersion as never;
      }
      if (config.url === '/api/v1/meta/disclaimer/text') {
        return disclaimerTextRes as never;
      }
      if (config.url === '/api/v1/meta/deployment-mode') {
        return deploymentModeRes as never;
      }
      throw new Error(`Unhandled mock request to ${config.url}`);
    });

    // 1. Initial check with empty localStorage
    expect(CompositionRoot.prefs.getDisclaimerAckVersion()).toBeNull();
    const versionCheck = await CompositionRoot.disclaimer.checkVersion();
    expect(versionCheck.isCurrent).toBe(false);
    expect(versionCheck.currentVersion).toBe('v3.0.0');

    // 2. Fetch disclaimer text for presentation in modal
    const disclaimerContent = await CompositionRoot.disclaimer.fetchDisclaimerText();
    expect(disclaimerContent.version).toBe('v3.0.0');
    expect(disclaimerContent.text).toContain('Citizen ist ein experimentelles Assistenzsystem');

    // 3. User acknowledges disclaimer
    CompositionRoot.disclaimer.acknowledge('v3.0.0');
    expect(CompositionRoot.prefs.getDisclaimerAckVersion()).toBe('v3.0.0');

    // 4. Verify version is now recognized as current and unlocks system
    const postAckCheck = await CompositionRoot.disclaimer.checkVersion();
    expect(postAckCheck.isCurrent).toBe(true);

    // 5. Configure deployment mode in preferences
    CompositionRoot.prefs.setDevMode(true);
    expect(CompositionRoot.prefs.isDevMode()).toBe(true);

    // =========================================================================
    // Call Trace 2: Document Ingestion & OCR Verification (AC-03)
    // =========================================================================
    const rawBescheidText =
      'Jobcenter Berlin Mitte\nBescheid über Leistungen zur Sicherung des Lebensunterhalts nach dem SGB II\n' +
      'Herr Max Mustermann, 10115 Berlin\nDatum: 10.08.2026\n' +
      'Leistungen für September 2026: 450,00 Euro (Kürzung um 113,00 Euro wegen Pflichtverletzung nach § 31 SGB II).\n' +
      'Kosten der Unterkunft: 0,00 Euro anerkannt.';

    const mockIngestRes: IngestResponse = {
      text: rawBescheidText,
    };
    const mockOcrAssessment: OcrAssessmentResponse = {
      score: 0.92,
      level: 'good',
      issues: [],
      warnings: [],
      ocr_artifacts_detected: false,
      readable_words_pct: 98.4,
      language_detected: 'de',
      recommendations: [],
    };

    const uploadSpy = vi
      .spyOn(CompositionRoot.http, 'upload')
      .mockResolvedValue(mockIngestRes);

    const testFile = new File([rawBescheidText], 'bescheid.pdf', {
      type: 'application/pdf',
    });

    // Execute upload through production IngestionService
    const ingestOutcome = await CompositionRoot.ingestion.uploadDocument(testFile);
    expect(uploadSpy).toHaveBeenCalledWith('/api/v1/ingest', testFile);
    expect(ingestOutcome.text).toContain('Jobcenter Berlin Mitte');

    // Assess OCR quality through production service
    httpSpy.mockImplementation(async (config) => {
      if (config.url === '/api/v1/ocr/assess') {
        return mockOcrAssessment as never;
      }
      throw new Error(`Unhandled mock request to ${config.url}`);
    });

    const ocrResult = await CompositionRoot.ingestion.assessQuality(ingestOutcome.text);
    expect(ocrResult.level).toBe('good');
    expect(ocrResult.score).toBeGreaterThan(0.85);
    expect(ocrResult.readable_words_pct).toBeGreaterThan(95);

    // Human verifies and potentially edits text (established through production flow)
    const confirmedText = ingestOutcome.text.trim();
    expect(confirmedText.length).toBeGreaterThan(50);

    // =========================================================================
    // Call Trace 3: Analysis Pipeline Execution & SSE Stream (AC-04)
    // =========================================================================
    const mockCaseRunId = 'case-smoke-2026-xyz';
    const mockSessionId = 'sess-smoke-888';

    const mockDisclosure: Art50Disclosure = {
      version: '1.0',
      must_display_before: 'results',
      texts: {
        de: 'Diese Analyse wurde von einem KI-System erstellt (EU AI Act Art. 50).',
        en: 'This analysis was produced by an AI system (EU AI Act Art. 50).',
      },
    };

    const mockTerminalPayload: AnalysisFinalEventPayload = {
      session_id: mockSessionId,
      case_run_id: mockCaseRunId,
      sections: ['sachverhalt', 'ergebnis', 'fristen', 'berechnung', 'adversarial_verhaeltnis'],
      final_output: {
        sachverhalt: 'Der Bürger erhielt einen Kürzungsbescheid um 113,00 Euro.',
        ergebnis: 'Die Absenkung um 113,00 € ist formell und materiell rechtswidrig (BVerfG 1 BvL 7/16).',
        fristen: {
          bescheid_datum: '2026-08-10',
          zustellungs_fiktion: '2026-08-13',
          frist_ende: '2026-09-14',
          feiertags_rollover: true,
          rechtsbehelfsbelehrung_korrekt: false,
          gesetzliche_grundlage: '§ 84 Abs. 1 SGG i.V.m. § 37 Abs. 2 SGB X',
        },
        berechnung: {
          anspruch_ermittelt_cent: 56300,
          anspruch_bescheid_cent: 45000,
          differenz_cent: 11300,
          positionen: [
            {
              bezeichnung: 'Regelbedarf Stufe 1',
              behoerde_cent: 45000,
              korrekt_cent: 56300,
              abwaegungsgrundlage: '§ 20 SGB II',
            },
          ],
        },
        adversarial_verhaeltnis: {
          behoerden_sicht: 'Pflichtverletzung begründet Sanktion von 20%.',
          buerger_sicht: 'Kürzung unzulässig; keine vorherige Anhörung nach § 24 SGB X.',
          risiko_einschaetzung: 'Sehr hohe Erfolgsaussichten im Widerspruchsverfahren.',
        },
      },
      disclosure: mockDisclosure,
      provenance: {
        spec_version: 'citizen-provenance-v1.1',
        generator: 'citizen',
        app_version: '2.0.0',
        model_profile: 'eu-avv',
        timestamp_utc: '2026-11-16T15:00:00Z',
        deployment_mode: 'dev',
        modules: [
          {
            id: 'sozialrecht',
            version: '1.0.0',
            parameter_set: '1.0.0+2026-01-01',
          },
        ],
      },
    };

    // Mock SseClient.streamPipeline to simulate pipeline execution
    const sseSpy = vi
      .spyOn(CompositionRoot.sse, 'streamPipeline')
      .mockImplementation(async (_endpoint, _body, callbacks) => {
        // Emit initial stages
        callbacks.onStageEvent({
          stage: 'corpus_health',
          status: 'ok',
          payload: { ready: true },
        });
        callbacks.onStageEvent({
          stage: 'ocr_quality',
          status: 'ok',
          payload: { score: 0.92 },
        });
        callbacks.onStageEvent({
          stage: 'construction',
          status: 'running',
          payload: {},
        });

        // Emit incremental tokens
        callbacks.onToken?.('Die Kürzung des Regelbedarfs…');

        callbacks.onStageEvent({
          stage: 'calculation_check',
          status: 'complete',
          payload: {},
        });

        // Emit terminal event
        callbacks.onFinal(mockTerminalPayload);
      });

    // Execute analysis through production AnalysisService
    await CompositionRoot.analysis.startAnalysis(confirmedText, ['sozialrecht']);

    expect(sseSpy).toHaveBeenCalledWith(
      '/api/v1/analyze',
      {
        text: confirmedText,
        legal_areas: ['sozialrecht'],
      },
      expect.any(Object)
    );

    // Verify streamingStore reached completed state with payload
    expect(streamingStore.getState().status).toBe('complete');
    expect(streamingStore.getState().caseRunId).toBe(mockCaseRunId);
    expect(streamingStore.getState().finalPayload?.final_output?.berechnung?.differenz_cent).toBe(11300);

    // =========================================================================
    // Call Trace 4: Dossier Review & Human Adjudication (AC-06)
    // =========================================================================
    const claimIdToAdjudicate = 'claim-sgb2-001';
    const adjudicatePayload: AdjudicatePayload = {
      target_type: 'claim',
      target_id: claimIdToAdjudicate,
      status: 'agreed',
      note: 'Der Abzug von 113 Euro wurde tatsächlich ohne Anhörung vorgenommen.',
    };

    httpSpy.mockImplementation(async (config) => {
      if (
        config.url === `/api/v1/cases/${mockCaseRunId}/adjudicate` &&
        config.method === 'POST'
      ) {
        return { status: 'ok' } as never;
      }
      throw new Error(`Unhandled mock request to ${config.url}`);
    });

    // Execute adjudication through production CasesService
    await CompositionRoot.cases.adjudicate(mockCaseRunId, adjudicatePayload);

    expect(httpSpy).toHaveBeenCalledWith({
      url: `/api/v1/cases/${mockCaseRunId}/adjudicate`,
      method: 'POST',
      body: adjudicatePayload,
    });

    // =========================================================================
    // Call Trace 5: Procedural Document Generation (*Widerspruch*) (AC-07)
    // =========================================================================
    const mockGenOptions: GeneratorOptionsResponse = {
      case_run_id: mockCaseRunId,
      available_doc_types: [
        {
          doc_type: 'widerspruch',
          title: 'Widerspruch gegen den Bescheid',
          description: 'Förmlicher Rechtsbehelf nach § 84 SGG.',
        },
      ],
      frist_info: {
        datum: '2026-09-14',
        ist_jahresfrist: false,
      },
      user_slots_required: ['name', 'adresse', 'aktenzeichen'],
    };

    const generateReq: GenerateDocumentRequest = {
      case_run_id: mockCaseRunId,
      doc_type: 'widerspruch',
      user_data: {
        name: 'Max Mustermann',
        adresse: 'Musterstraße 12, 10115 Berlin',
        aktenzeichen: 'JC-10115-998877',
      },
    };

    const mockGeneratedDoc: GeneratedDocumentResponse = {
      doc_type: 'widerspruch',
      title: 'Widerspruch gegen den Kürzungsbescheid vom 10.08.2026',
      rendered_text:
        '# Widerspruch\n\n' +
        'Absender:\nMax Mustermann\nMusterstraße 12, 10115 Berlin\n\n' +
        'An das Jobcenter Berlin Mitte\n\n' +
        'Aktenzeichen: JC-10115-998877\n\n' +
        'Hiermit lege ich fristgerecht Widerspruch gegen den Bescheid vom 10.08.2026 ein.\n\n' +
        'Begründung:\nDie Kürzung um 113,00 Euro ist rechtswidrig.\n' +
        '[BITTE PRÜFEN: Genaue Höhe der Aufwendungen für Heizung und Warmwasser nachreichen].\n\n' +
        'Mit freundlichen Grüßen,\nMax Mustermann',
      slots: [
        {
          key: 'anspruch_abzug',
          value: '113,00 Euro',
          verified: true,
          needs_review: false,
        },
        {
          key: 'heizkosten_beleg',
          value: '[BITTE PRÜFEN: Genaue Höhe der Aufwendungen für Heizung und Warmwasser nachreichen]',
          verified: false,
          needs_review: true,
        },
      ],
      generation_metadata: {
        selected_by: 'auto',
        frist_am: '2026-09-14',
      },
      provenance: {
        spec_version: 'citizen-provenance-v1.1',
        generator: 'citizen',
        app_version: '2.0.0',
        model_profile: 'eu-avv',
        timestamp_utc: '2026-11-16T15:05:00Z',
        deployment_mode: 'dev',
        modules: [
          {
            id: 'sozialrecht',
            version: '1.0.0',
            parameter_set: '1.0.0+2026-01-01',
          },
        ],
      },
    };

    httpSpy.mockImplementation(async (config) => {
      if (config.url === `/api/v1/documents/generator-options/${mockCaseRunId}`) {
        return mockGenOptions as never;
      }
      if (config.url === '/api/v1/documents/generate') {
        return mockGeneratedDoc as never;
      }
      throw new Error(`Unhandled mock request to ${config.url}`);
    });

    // 1. Fetch generator options
    const options = await CompositionRoot.documents.getOptions(mockCaseRunId);
    expect(options.available_doc_types.length).toBeGreaterThan(0);
    expect(options.frist_info?.datum).toBe('2026-09-14');

    // 2. Generate document draft
    const generated = await CompositionRoot.documents.generate(generateReq);
    expect(generated.doc_type).toBe('widerspruch');
    expect(generated.rendered_text).toContain('Max Mustermann');
    expect(generated.rendered_text).toContain('JC-10115-998877');

    // 3. Verify unverified slot alerting
    const unverifiedSlots = generated.slots.filter((s) => s.needs_review || !s.verified);
    expect(unverifiedSlots.length).toBe(1);
    expect(unverifiedSlots[0]?.value).toContain('[BITTE PRÜFEN');

    // 4. Verify Art. 50(2) machine-readable provenance
    expect(generated.provenance.spec_version).toBe('citizen-provenance-v1.1');
    expect(generated.provenance.generator).toBe('citizen');
    expect(generated.provenance.modules[0]?.id).toBe('sozialrecht');

    // =========================================================================
    // Diagnostics & Prüfstand Verification (FR-10, WP-11)
    // =========================================================================
    const mockModulesRes: ModulesCatalogResponse = {
      default_module: 'sozialrecht',
      modules: [
        {
          id: 'sozialrecht',
          version: '1.0.0',
          tier: 'verified',
          enabled: true,
          is_default: true,
          title: { de: 'Sozialrecht', en: 'Social-benefits law' },
          area_keys: ['sozialrecht'],
          corpus: {
            chunk_count: 8631,
            source_types: ['sgb2', 'sgbx'],
            present_source_types: ['sgb2', 'sgbx'],
            missing_source_types: [],
            is_ready: true,
          },
          installed_at: '2026-11-16T10:00:00Z',
        },
      ],
    };

    const mockCorpusRes: CorpusHealthResponse = {
      total_chunks: 8631,
      total_sources: 2,
      is_healthy: true,
      sources: [
        { type: 'sgb2', chunk_count: 5000, last_updated: '2026-11-16T10:00:00Z' },
        { type: 'sgbx', chunk_count: 3631, last_updated: '2026-11-16T10:00:00Z' },
      ],
      warnings: [],
    };

    const mockGoldsetRes: GoldsetResponse = {
      goldset: {
        id: 'sozialrecht-v0.2.0',
        version: '0.2.0',
        title: 'Sozialrecht Goldset',
      },
      cases: [
        {
          id: 'GS-001',
          title: 'Regelbedarf-Kürzung',
          description: 'Fallbeschreibung',
          legal_area: 'sozialrecht',
        },
      ],
    };

    const mockEvalReportsRes: EvalReportsResponse = {
      reports: [
        {
          report_id: 'run-smoke-01',
          goldset_version: '0.2.0',
          run_timestamp: '2026-11-16T12:00:00Z',
          case_count: 1,
          aggregate: {
            issue_recall: 0.95,
            citation_precision: 0.98,
            zero_regression: true,
          },
        },
      ],
    };

    httpSpy.mockImplementation(async (config) => {
      if (config.url === '/api/v1/modules') return mockModulesRes as never;
      if (config.url === '/api/v1/corpus/health') return mockCorpusRes as never;
      if (config.url === '/api/v1/goldset') return mockGoldsetRes as never;
      if (config.url === '/api/v1/eval/reports') return mockEvalReportsRes as never;
      throw new Error(`Unhandled mock request to ${config.url}`);
    });

    const modules = await CompositionRoot.diagnostics.getModules();
    expect(modules.modules[0]?.id).toBe('sozialrecht');
    expect(modules.modules[0]?.corpus?.is_ready).toBe(true);

    const corpus = await CompositionRoot.diagnostics.getCorpusHealth();
    expect(corpus.is_healthy).toBe(true);
    expect(corpus.total_chunks).toBe(8631);

    const goldsets = await CompositionRoot.diagnostics.getGoldsets();
    expect(goldsets.cases.length).toBe(1);

    const evalReports = await CompositionRoot.diagnostics.getEvalReports();
    expect(evalReports.reports[0]?.aggregate.zero_regression).toBe(true);
  });
});

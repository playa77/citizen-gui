import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CompositionRoot } from '@/compositionRoot';
import { DiagnosticsService } from '@/services/diagnostics';
import { ModuleCatalogTable } from '@/components/diagnostics/ModuleCatalogTable';
import { CorpusHealthMonitor } from '@/components/diagnostics/CorpusHealthMonitor';
import { GoldsetReportViewer } from '@/components/diagnostics/GoldsetReportViewer';
import { DiagnosticsView } from '@/views/DiagnosticsView';
import type {
  ModulesCatalogResponse,
  CorpusHealthResponse,
  CorpusUpdateResponse,
  CorpusJobStatusResponse,
  GoldsetResponse,
  EvalReportsResponse,
} from '@/types/api';

describe('WP-11: Legal Module Catalog, Corpus Health & Goldset Viewer [Doc 1 §2.1 FR-10, Doc 2 §8.8, §9]', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockModules: ModulesCatalogResponse = {
    default_module: 'sozialrecht',
    modules: [
      {
        id: 'sozialrecht',
        version: '1.0.0',
        tier: 'verified',
        enabled: true,
        is_default: true,
        title: {
          de: 'Sozialrecht',
          en: 'Social-benefits law',
        },
        area_keys: ['sozialrecht'],
        corpus: {
          chunk_count: 8631,
          source_types: ['sgb2', 'sgbx', 'weisung', 'bsg'],
          present_source_types: ['sgb2', 'sgbx', 'weisung', 'bsg'],
          missing_source_types: [],
          is_ready: true,
        },
        installed_at: '2026-11-16T10:00:00Z',
      },
      {
        id: 'asylrecht',
        version: '0.3.0',
        tier: 'experimental',
        enabled: false,
        is_default: false,
        title: {
          de: 'Asyl- und Aufenthaltsrecht',
          en: 'Asylum law',
        },
        area_keys: ['asylrecht', 'aufenthaltsrecht'],
        corpus: {
          chunk_count: 120,
          source_types: ['asylg', 'aufenthg'],
          present_source_types: ['asylg'],
          missing_source_types: ['aufenthg'],
          is_ready: false,
        },
        installed_at: '2026-11-16T11:00:00Z',
      },
    ],
  };

  const mockCorpusHealth: CorpusHealthResponse = {
    total_chunks: 8631,
    total_sources: 4,
    is_healthy: true,
    sources: [
      {
        type: 'sgb2',
        chunk_count: 5120,
        last_updated: '2026-11-16T08:00:00Z',
      },
      {
        type: 'sgbx',
        chunk_count: 1420,
        last_updated: '2026-11-16T08:00:00Z',
      },
      {
        type: 'weisung',
        chunk_count: 1500,
        last_updated: '2026-11-16T08:00:00Z',
      },
      {
        type: 'bsg',
        chunk_count: 591,
        last_updated: '2026-11-16T08:00:00Z',
      },
    ],
    warnings: ['Konfigurierte Quellen nicht vollständig: bgb.'],
  };

  const mockGoldset: GoldsetResponse = {
    goldset: {
      id: 'sozialrecht-v0.2.0',
      version: '0.2.0',
      legal_area: 'sozialrecht',
      title: 'Sozialrecht Referenz-Goldset',
      description: 'Synthetische Bescheide zur Verifikation der SGB II Prüflogik.',
    },
    cases: [
      {
        id: 'GS-001',
        title: 'Kürzung der Regelleistung um 30%',
        description: 'Minderungsbescheid ohne hinreichende Rechtsbehelfsbelehrung.',
        legal_area: 'sozialrecht',
        expected_findings_count: 4,
      },
      {
        id: 'GS-002',
        title: 'Nichtberücksichtigung der Heizkosten',
        description: 'Kosten der Unterkunft nach § 22 SGB II fehlerhaft gekürzt.',
        legal_area: 'sozialrecht',
        expected_findings_count: 3,
      },
    ],
  };

  const mockEvalReports: EvalReportsResponse = {
    reports: [
      {
        report_id: 'run-2026-11-16',
        goldset_version: '0.2.0',
        git_sha: 'ae96bda123456789',
        run_timestamp: '2026-11-16T12:00:00Z',
        case_count: 2,
        aggregate: {
          issue_recall: 0.94,
          citation_precision: 0.97,
          calculation_exact_match: 1.0,
          frist_exact_match: 1.0,
          zero_regression: true,
        },
      },
    ],
  };

  describe('DiagnosticsService', () => {
    it('should call GET /api/v1/modules on getModules()', async () => {
      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue(mockModules);

      const res = await CompositionRoot.diagnostics.getModules();
      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/modules',
        method: 'GET',
      });
      expect(res).toEqual(mockModules);
    });

    it('should call GET /api/v1/corpus/health on getCorpusHealth()', async () => {
      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue(mockCorpusHealth);

      const res = await CompositionRoot.diagnostics.getCorpusHealth();
      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/corpus/health',
        method: 'GET',
      });
      expect(res).toEqual(mockCorpusHealth);
    });

    it('should call POST /api/v1/corpus/update on triggerCorpusUpdate()', async () => {
      const updateRes: CorpusUpdateResponse = { job_id: 'job-999', status: 'queued' };
      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue(updateRes);

      const res = await CompositionRoot.diagnostics.triggerCorpusUpdate(['sgb2']);
      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/corpus/update',
        method: 'POST',
        body: { sources: ['sgb2'] },
      });
      expect(res).toEqual(updateRes);
    });

    it('should poll corpus status and complete via pollCorpusJob()', async () => {
      const runningStatus: CorpusJobStatusResponse = {
        job_id: 'job-999',
        status: 'running',
        substage: 'scraping',
        chunks_scraped: 50,
        chunks_processed: 25,
        chunks_embedded: 10,
        chunks_upserted: 5,
      };

      const completedStatus: CorpusJobStatusResponse = {
        job_id: 'job-999',
        status: 'completed',
        substage: null,
        chunks_scraped: 100,
        chunks_processed: 100,
        chunks_embedded: 100,
        chunks_upserted: 100,
      };

      let callCount = 0;
      vi.spyOn(CompositionRoot.diagnostics, 'getCorpusJobStatus').mockImplementation(async () => {
        callCount++;
        return callCount === 1 ? runningStatus : completedStatus;
      });

      const updates: CorpusJobStatusResponse[] = [];
      const result = await CompositionRoot.diagnostics.pollCorpusJob(
        'job-999',
        (s) => updates.push(s),
        50 // short interval for test
      );

      expect(result.status).toBe('completed');
      expect(updates.length).toBe(2);
      expect(updates[0]?.status).toBe('running');
      expect(updates[1]?.status).toBe('completed');
    });

    it('should abort pollCorpusJob when AbortSignal is triggered', async () => {
      vi.spyOn(CompositionRoot.diagnostics, 'getCorpusJobStatus').mockResolvedValue({
        job_id: 'job-999',
        status: 'running',
        substage: 'scraping',
        chunks_scraped: 10,
        chunks_processed: 0,
        chunks_embedded: 0,
        chunks_upserted: 0,
      });

      const controller = new AbortController();
      const pollPromise = CompositionRoot.diagnostics.pollCorpusJob(
        'job-999',
        undefined,
        500,
        10000,
        controller.signal
      );

      // Abort after small tick
      setTimeout(() => controller.abort(), 10);

      await expect(pollPromise).rejects.toThrow('Corpus polling aborted');
    });

    it('should fetch goldset and eval reports cleanly', async () => {
      const goldsetSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValueOnce(mockGoldset)
        .mockResolvedValueOnce(mockEvalReports);

      const goldsetRes = await CompositionRoot.diagnostics.getGoldsets();
      expect(goldsetRes).toEqual(mockGoldset);

      const reportsRes = await CompositionRoot.diagnostics.getEvalReports();
      expect(reportsRes).toEqual(mockEvalReports);
    });
  });

  describe('ModuleCatalogTable', () => {
    it('should render modules with tiers, enablement, and corpus readiness badges', () => {
      render(
        React.createElement(ModuleCatalogTable, {
          modules: mockModules.modules,
          defaultModuleId: mockModules.default_module,
        })
      );

      // Verify Sozialrecht module
      expect(screen.getByText('Sozialrecht')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
      expect(screen.getByText('Verifiziert (Tier 1)')).toBeInTheDocument();
      expect(screen.getByText('Aktiviert')).toBeInTheDocument();
      expect(screen.getByText('Bereit')).toBeInTheDocument();
      expect(screen.getByText('(8.631 Chunks)')).toBeInTheDocument();

      // Verify Asylrecht module
      expect(screen.getByText('Asyl- und Aufenthaltsrecht')).toBeInTheDocument();
      expect(screen.getByText('v0.3.0')).toBeInTheDocument();
      expect(screen.getByText('Experimentell (Tier 2)')).toBeInTheDocument();
      expect(screen.getByText('Deaktiviert')).toBeInTheDocument();
      expect(screen.getByText('Nicht bereit')).toBeInTheDocument();
      expect(screen.getByText('Fehlend: aufenthg')).toBeInTheDocument();
    });

    it('should render loading and empty states cleanly', () => {
      const { rerender } = render(
        React.createElement(ModuleCatalogTable, {
          modules: [],
          isLoading: true,
        })
      );
      expect(screen.getByText(/Rechtsgebiets-Module werden geladen/)).toBeInTheDocument();

      rerender(
        React.createElement(ModuleCatalogTable, {
          modules: [],
          isLoading: false,
        })
      );
      expect(screen.getByText('Keine Rechtsgebiets-Module gefunden.')).toBeInTheDocument();
    });
  });

  describe('CorpusHealthMonitor', () => {
    it('should render corpus health metrics, sources, and warnings', () => {
      render(
        React.createElement(CorpusHealthMonitor, {
          health: mockCorpusHealth,
        })
      );

      expect(screen.getByText('Vektorkorpus & Rechtsdatenbank')).toBeInTheDocument();
      expect(screen.getByText('Korpus bereit')).toBeInTheDocument();
      expect(screen.getByTestId('total-chunks')).toHaveTextContent('8.631');
      expect(screen.getByTestId('total-sources')).toHaveTextContent('4');

      // Sources
      expect(screen.getByText('sgb2')).toBeInTheDocument();
      expect(screen.getByText('5.120')).toBeInTheDocument();
      expect(screen.getByText('sgbx')).toBeInTheDocument();
      expect(screen.getByText('1.420')).toBeInTheDocument();

      // Warnings
      expect(screen.getByText(/Konfigurierte Quellen nicht vollständig: bgb/)).toBeInTheDocument();
    });

    it('should trigger corpus update and update UI counters during polling', async () => {
      const updateRes: CorpusUpdateResponse = { job_id: 'job-1234', status: 'queued' };
      vi.spyOn(CompositionRoot.diagnostics, 'triggerCorpusUpdate').mockResolvedValue(updateRes);

      let step = 0;
      vi.spyOn(CompositionRoot.diagnostics, 'getCorpusJobStatus').mockImplementation(async () => {
        step++;
        if (step === 1) {
          return {
            job_id: 'job-1234',
            status: 'running',
            substage: 'scraping',
            chunks_scraped: 45,
            chunks_processed: 20,
            chunks_embedded: 15,
            chunks_upserted: 10,
          };
        }
        return {
          job_id: 'job-1234',
          status: 'completed',
          substage: null,
          chunks_scraped: 120,
          chunks_processed: 120,
          chunks_embedded: 120,
          chunks_upserted: 120,
        };
      });

      const onRefreshSpy = vi.fn();
      render(
        React.createElement(CorpusHealthMonitor, {
          health: mockCorpusHealth,
          onRefresh: onRefreshSpy,
          pollingIntervalMs: 50,
        })
      );

      const updateBtn = screen.getByRole('button', { name: /Korpus aktualisieren/ });
      fireEvent.click(updateBtn);

      // Polling progress should appear
      await waitFor(() => {
        expect(screen.getByTestId('corpus-job-progress')).toBeInTheDocument();
      });

      // Completion message
      await waitFor(() => {
        expect(screen.getByText('Korpus-Aktualisierung erfolgreich abgeschlossen.')).toBeInTheDocument();
      });

      expect(onRefreshSpy).toHaveBeenCalled();
    });
  });

  describe('GoldsetReportViewer', () => {
    it('should render evaluation metrics and zero regression gate badge', () => {
      render(
        React.createElement(GoldsetReportViewer, {
          goldset: mockGoldset,
          evalReports: mockEvalReports.reports,
        })
      );

      // Eval report details
      expect(screen.getByText(/Evaluations-Report: run-2026-11-16/)).toBeInTheDocument();
      expect(screen.getByText('Zero-Regression Gate: Bestanden')).toBeInTheDocument();
      expect(screen.getByTestId('metric-issue-recall')).toHaveTextContent('94.0%');
      expect(screen.getByTestId('metric-citation-precision')).toHaveTextContent('97.0%');

      // Goldset cases
      expect(screen.getByText('Sozialrecht Referenz-Goldset')).toBeInTheDocument();
      expect(screen.getByText('Kürzung der Regelleistung um 30%')).toBeInTheDocument();
      expect(screen.getByText('Nichtberücksichtigung der Heizkosten')).toBeInTheDocument();

      // Case expansion
      const caseCard = screen.getByTestId('goldset-case-GS-001');
      fireEvent.click(caseCard);
      expect(screen.getByText('Erwartete Befunde: 4')).toBeInTheDocument();
    });
  });

  describe('DiagnosticsView Integration', () => {
    it('should fetch all diagnostic feeds and support switching sub-tabs', async () => {
      vi.spyOn(CompositionRoot.diagnostics, 'getModules').mockResolvedValue(mockModules);
      vi.spyOn(CompositionRoot.diagnostics, 'getCorpusHealth').mockResolvedValue(mockCorpusHealth);
      vi.spyOn(CompositionRoot.diagnostics, 'getGoldsets').mockResolvedValue(mockGoldset);
      vi.spyOn(CompositionRoot.diagnostics, 'getEvalReports').mockResolvedValue(mockEvalReports);

      render(React.createElement(DiagnosticsView));

      // Initially on modules tab
      await waitFor(() => {
        expect(screen.getByText('Sozialrecht')).toBeInTheDocument();
      });

      // Switch to corpus tab
      const corpusTab = screen.getByRole('tab', { name: /Korpus-Gesundheit/ });
      fireEvent.click(corpusTab);
      expect(screen.getByText('Vektorkorpus & Rechtsdatenbank')).toBeInTheDocument();

      // Switch to goldset tab
      const goldsetTab = screen.getByRole('tab', { name: /Prüfstand & Goldsets/ });
      fireEvent.click(goldsetTab);
      expect(screen.getByText('Sozialrecht Referenz-Goldset')).toBeInTheDocument();
      expect(screen.getByTestId('metric-issue-recall')).toHaveTextContent('94.0%');
    });
  });
});

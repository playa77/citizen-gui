import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CompositionRoot } from '@/compositionRoot';
import {
  streamingStore,
  PIPELINE_STAGES,
} from '@/stores/streamingStore';
import { AnalysisService } from '@/services/analysis';
import { StageTimeline } from '@/components/pipeline/StageTimeline';
import { LiveTokenStream } from '@/components/pipeline/LiveTokenStream';
import { StageErrorAlert } from '@/components/pipeline/StageErrorAlert';
import type {
  AnalysisFinalEventPayload,
  AnalysisErrorEventPayload,
  SseStageEventPayload,
} from '@/types/events';

describe('WP-06: Analysis Pipeline Service & SSE Streaming Timeline [Doc 1 §2.1 FR-04, Doc 2 §8.5]', () => {
  beforeEach(() => {
    window.localStorage.clear();
    streamingStore.reset();
    vi.restoreAllMocks();
  });

  describe('streamingStore', () => {
    it('should initialize with idle status, 11 pending stages, empty tokens, and null finalPayload', () => {
      const state = streamingStore.getState();
      expect(state.status).toBe('idle');
      expect(state.activeStage).toBeNull();
      expect(state.tokens).toBe('');
      expect(state.finalPayload).toBeNull();
      expect(state.caseRunId).toBeNull();
      expect(state.error).toBeNull();

      expect(Object.keys(state.stages)).toHaveLength(11);
      for (const stage of PIPELINE_STAGES) {
        expect(state.stages[stage].status).toBe('pending');
      }
    });

    it('should transition to connecting on startConnecting and reset prior state', () => {
      streamingStore.appendToken('old token');
      streamingStore.startConnecting();

      const state = streamingStore.getState();
      expect(state.status).toBe('connecting');
      expect(state.tokens).toBe('');
      expect(state.startedAt).toBeDefined();
    });

    it('should update stage to running and set activeStage, then complete stage and calculate duration', () => {
      streamingStore.startConnecting();

      // Start classification stage
      streamingStore.updateStage('classification', 'running', { model: 'gpt-4o' });
      let state = streamingStore.getState();
      expect(state.status).toBe('streaming');
      expect(state.activeStage).toBe('classification');
      expect(state.stages.classification.status).toBe('running');
      expect(state.stages.classification.startedAt).toBeDefined();

      // Complete classification stage
      streamingStore.updateStage('classification', 'complete', { identified_area: 'sgb_ii' });
      state = streamingStore.getState();
      expect(state.activeStage).toBeNull();
      expect(state.stages.classification.status).toBe('complete');
      expect(state.stages.classification.completedAt).toBeDefined();
      expect(state.stages.classification.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should append tokens incrementally', () => {
      streamingStore.appendToken('Gemäß § 11b SGB II');
      streamingStore.appendToken(' ist ein Freibetrag anzusetzen.');

      expect(streamingStore.getState().tokens).toBe(
        'Gemäß § 11b SGB II ist ein Freibetrag anzusetzen.'
      );
    });

    it('should commit terminal final event and set status to complete', () => {
      const finalPayload: AnalysisFinalEventPayload = {
        session_id: 'sess-123',
        case_run_id: 'case-run-uuid-456',
        sections: ['sachverhalt', 'berechnung', 'fristen'],
        final_output: {
          sachverhalt: 'Bewilligungsbescheid Jobcenter',
          ergebnis: 'Leistungskürzung um 120 EUR fehlerhaft',
        },
        disclosure: {
          version: '1.0',
          must_display_before: 'results',
          texts: { de: 'KI-gestützt', en: 'AI generated' },
        },
        provenance: {
          spec_version: 'citizen-provenance-v1.1',
          generator: 'citizen',
          app_version: '1.0.0',
          model_profile: 'balanced-legal',
          timestamp_utc: '2026-11-16T12:00:00Z',
          deployment_mode: 'dev',
          modules: [],
        },
      };

      streamingStore.setFinal(finalPayload);

      const state = streamingStore.getState();
      expect(state.status).toBe('complete');
      expect(state.finalPayload).toEqual(finalPayload);
      expect(state.caseRunId).toBe('case-run-uuid-456');
    });

    it('should commit error and mark active stage as error', () => {
      streamingStore.startConnecting();
      streamingStore.updateStage('verification', 'running');

      const errorPayload: AnalysisErrorEventPayload = {
        error: 'pipeline_failed',
        detail: 'Timeout during legal verification',
        session_id: 'sess-err-99',
      };

      streamingStore.setError(errorPayload);

      const state = streamingStore.getState();
      expect(state.status).toBe('error');
      expect(state.error).toEqual(errorPayload);
      expect(state.stages.verification.status).toBe('error');
    });
  });

  describe('AnalysisService & SSE Streaming Execution', () => {
    it('should stream all 11 stages and terminal event via startAnalysis', async () => {
      const mockStream = vi.fn().mockImplementation(async (endpoint, body, callbacks) => {
        expect(endpoint).toBe('/api/v1/analyze');
        expect(body.text).toBe('Prüftext');
        expect(body.legal_areas).toEqual(['sozialrecht']);

        // 1. Simulate stage events
        for (const stage of PIPELINE_STAGES) {
          callbacks.onStageEvent({
            stage,
            status: 'running',
            payload: {},
          });

          if (stage === 'construction') {
            callbacks.onToken('Forderung unbegründet: ');
            callbacks.onToken('Berechnung fehlerhaft.');
          }

          callbacks.onStageEvent({
            stage,
            status: 'complete',
            payload: {},
          });
        }

        // 2. Simulate terminal event
        callbacks.onFinal({
          session_id: 'sess-full-stream',
          case_run_id: 'case-uuid-777',
          sections: ['findings'],
          final_output: {},
          disclosure: {
            version: '1.0',
            must_display_before: 'results',
            texts: { de: 'KI-Analyse', en: 'AI Analysis' },
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
        });
      });

      const fakeSseClient = {
        streamPipeline: mockStream,
      } as any;

      const analysisService = new AnalysisService(fakeSseClient);
      await analysisService.startAnalysis('Prüftext', ['sozialrecht']);

      const state = streamingStore.getState();
      expect(state.status).toBe('complete');
      expect(state.caseRunId).toBe('case-uuid-777');
      expect(state.tokens).toBe('Forderung unbegründet: Berechnung fehlerhaft.');

      for (const stage of PIPELINE_STAGES) {
        expect(state.stages[stage].status).toBe('complete');
      }
    });

    it('should handle reevaluateStage for a single stage', async () => {
      const mockStream = vi.fn().mockImplementation(async (endpoint, body, callbacks) => {
        expect(endpoint).toBe('/api/v1/cases/case-123/reevaluate');
        expect(body.stage).toBe('calculation_check');
        expect(body.context).toBe('Zusätzlicher Freibetrag geltend gemacht');

        callbacks.onStageEvent({
          stage: 'calculation_check',
          status: 'complete',
          payload: { recomputed_cent: 15000 },
        });

        callbacks.onFinal({
          session_id: 'sess-reeval',
          case_run_id: 'case-123',
          sections: [],
          final_output: {},
          disclosure: {} as any,
          provenance: {} as any,
        });
      });

      const fakeSseClient = {
        streamPipeline: mockStream,
      } as any;

      const analysisService = new AnalysisService(fakeSseClient);
      await analysisService.reevaluateStage(
        'case-123',
        'calculation_check',
        'Zusätzlicher Freibetrag geltend gemacht'
      );

      const state = streamingStore.getState();
      expect(state.status).toBe('complete');
      expect(state.stages.calculation_check.status).toBe('complete');
    });
  });

  describe('StageTimeline Component', () => {
    it('should render all 11 stages with titles and pending statuses initially', () => {
      render(React.createElement(StageTimeline));

      expect(screen.getByText('Analyse-Pipeline (11 Stufen)')).toBeInTheDocument();
      expect(screen.getByText('Corpus- & Wissensbasis')).toBeInTheDocument();
      expect(screen.getByText('OCR-Qualitätsprüfung')).toBeInTheDocument();
      expect(screen.getByText('Textnormalisierung')).toBeInTheDocument();
      expect(screen.getByText('Bescheidklassifikation')).toBeInTheDocument();
      expect(screen.getByText('Strukturanalyse & Zerlegung')).toBeInTheDocument();
      expect(screen.getByText('Rechtsnormen- & Urteilsabruf')).toBeInTheDocument();
      expect(screen.getByText('Argumentationsaufbau')).toBeInTheDocument();
      expect(screen.getByText('Evidenzverifikation')).toBeInTheDocument();
      expect(screen.getByText('Synthese & Bescheidentwurf')).toBeInTheDocument();
      expect(screen.getByText('Gegenprüfung (Behörde/Gericht)')).toBeInTheDocument();
      expect(screen.getByText('Berechnungsprüfung § 11b SGB II')).toBeInTheDocument();

      // All 11 should have "Ausstehend" status initially
      const pendingBadges = screen.getAllByText('Ausstehend');
      expect(pendingBadges).toHaveLength(11);
    });

    it('should display active stage running indicator and completion badges', () => {
      render(React.createElement(StageTimeline));

      // Simulate advancing stage 1 and stage 2 inside act()
      act(() => {
        streamingStore.startConnecting();
        streamingStore.updateStage('corpus_health', 'complete');
        streamingStore.updateStage('ocr_quality', 'running');
      });

      expect(screen.getByText('Stream aktiv')).toBeInTheDocument();
      expect(screen.getByText('Abgeschlossen')).toBeInTheDocument();
      expect(screen.getByText('Wird ausgeführt…')).toBeInTheDocument();
    });
  });

  describe('LiveTokenStream Component', () => {
    it('should not render anything when tokens are empty and not streaming', () => {
      const { container } = render(React.createElement(LiveTokenStream));
      expect(container.firstChild).toBeNull();
    });

    it('should render streaming tokens and active generation badge', () => {
      act(() => {
        streamingStore.startConnecting();
        streamingStore.updateStage('construction', 'running');
        streamingStore.appendToken('Prüfung der Unterkunftskosten nach § 22 SGB II…');
      });

      render(React.createElement(LiveTokenStream));

      expect(
        screen.getByText('Live-Argumentationsaufbau (Token-Stream)')
      ).toBeInTheDocument();
      expect(screen.getByText('Generierung aktiv')).toBeInTheDocument();
      expect(
        screen.getByText(/Prüfung der Unterkunftskosten nach § 22 SGB II…/)
      ).toBeInTheDocument();
    });
  });

  describe('StageErrorAlert Component', () => {
    it('should render error alert with retry button when error occurs', () => {
      const onRetryMock = vi.fn();
      render(React.createElement(StageErrorAlert, { onRetry: onRetryMock }));

      // Initially no error
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // Emit error inside act()
      act(() => {
        streamingStore.setError({
          error: 'pipeline_failed',
          detail: 'Verbindung zum Backend unterbrochen',
          session_id: 'sess-err-42',
        });
      });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Analyse-Fehler aufgetreten')).toBeInTheDocument();
      expect(screen.getByText('pipeline_failed')).toBeInTheDocument();
      expect(screen.getByText('Verbindung zum Backend unterbrochen')).toBeInTheDocument();
      expect(screen.getByText('Sitzungs-ID: sess-err-42')).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /Analyse erneut versuchen/i });
      fireEvent.click(retryBtn);
      expect(onRetryMock).toHaveBeenCalledTimes(1);
    });
  });
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Database,
  BarChart2,
  RefreshCw,
  AlertTriangle,
  Server,
} from 'lucide-react';
import { CompositionRoot } from '@/compositionRoot';
import type {
  ModulesCatalogResponse,
  CorpusHealthResponse,
  GoldsetResponse,
  EvalReportSummary,
} from '@/types/api';
import { ModuleCatalogTable } from '@/components/diagnostics/ModuleCatalogTable';
import { CorpusHealthMonitor } from '@/components/diagnostics/CorpusHealthMonitor';
import { GoldsetReportViewer } from '@/components/diagnostics/GoldsetReportViewer';

export type DiagnosticsSubTab = 'modules' | 'corpus' | 'goldset';

export const DiagnosticsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<DiagnosticsSubTab>('modules');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modulesData, setModulesData] = useState<ModulesCatalogResponse | null>(null);
  const [corpusData, setCorpusData] = useState<CorpusHealthResponse | null>(null);
  const [goldsetData, setGoldsetData] = useState<GoldsetResponse | null>(null);
  const [evalReports, setEvalReports] = useState<EvalReportSummary[]>([]);

  const loadAllDiagnostics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [modulesRes, corpusRes, goldsetRes, reportsRes] = await Promise.allSettled([
        CompositionRoot.diagnostics.getModules(),
        CompositionRoot.diagnostics.getCorpusHealth(),
        CompositionRoot.diagnostics.getGoldsets(),
        CompositionRoot.diagnostics.getEvalReports(),
      ]);

      if (modulesRes.status === 'fulfilled') {
        setModulesData(modulesRes.value);
      }
      if (corpusRes.status === 'fulfilled') {
        setCorpusData(corpusRes.value);
      }
      if (goldsetRes.status === 'fulfilled') {
        setGoldsetData(goldsetRes.value);
      }
      if (reportsRes.status === 'fulfilled') {
        setEvalReports(reportsRes.value.reports || []);
      }

      // If all failed, show error
      if (
        modulesRes.status === 'rejected' &&
        corpusRes.status === 'rejected' &&
        goldsetRes.status === 'rejected' &&
        reportsRes.status === 'rejected'
      ) {
        throw new Error('Fehler beim Laden der System-Diagnosedaten.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unerwarteter Fehler bei der Systemabfrage');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllDiagnostics();
  }, [loadAllDiagnostics]);

  return (
    <div className="space-y-6">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--ds-color-border-default)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-accent)]">
            <Server className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="ds-text-title-lg font-semibold text-[var(--ds-color-text-primary)]">
              Systemdiagnose & Prüfstand
            </h1>
            <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
              Transparenz über installierte Rechtsgebiets-Module, Vektorkorpus-Gesundheit und Goldset-Evaluationen.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadAllDiagnostics}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)] text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)] ds-text-label-md font-semibold transition-colors ds-focus-ring cursor-pointer disabled:opacity-50"
          aria-label="Diagnosedaten aktualisieren"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>Neu laden</span>
        </button>
      </div>

      {/* Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--ds-color-border-subtle)]" role="tablist" aria-label="Diagnose-Bereiche">
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'modules'}
          onClick={() => setActiveSubTab('modules')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[var(--ds-size-target-min)] border-b-2 font-semibold ds-text-label-md transition-colors ds-focus-ring cursor-pointer ${
            activeSubTab === 'modules'
              ? 'border-[var(--ds-color-border-focus)] text-[var(--ds-color-text-primary)]'
              : 'border-transparent text-[var(--ds-color-text-secondary)] hover:text-[var(--ds-color-text-primary)]'
          }`}
        >
          <Layers className="w-4 h-4" aria-hidden="true" />
          <span>Module-Katalog</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'corpus'}
          onClick={() => setActiveSubTab('corpus')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[var(--ds-size-target-min)] border-b-2 font-semibold ds-text-label-md transition-colors ds-focus-ring cursor-pointer ${
            activeSubTab === 'corpus'
              ? 'border-[var(--ds-color-border-focus)] text-[var(--ds-color-text-primary)]'
              : 'border-transparent text-[var(--ds-color-text-secondary)] hover:text-[var(--ds-color-text-primary)]'
          }`}
        >
          <Database className="w-4 h-4" aria-hidden="true" />
          <span>Korpus-Gesundheit</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'goldset'}
          onClick={() => setActiveSubTab('goldset')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[var(--ds-size-target-min)] border-b-2 font-semibold ds-text-label-md transition-colors ds-focus-ring cursor-pointer ${
            activeSubTab === 'goldset'
              ? 'border-[var(--ds-color-border-focus)] text-[var(--ds-color-text-primary)]'
              : 'border-transparent text-[var(--ds-color-text-secondary)] hover:text-[var(--ds-color-text-primary)]'
          }`}
        >
          <BarChart2 className="w-4 h-4" aria-hidden="true" />
          <span>Prüfstand & Goldsets</span>
        </button>
      </div>

      {/* Global Error Notice */}
      {error && (
        <div className="p-4 rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-danger)] bg-[var(--ds-color-bg-danger-subtle)] text-[var(--ds-color-text-danger)] flex items-center gap-2 ds-text-body-md">
          <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Panels */}
      {activeSubTab === 'modules' && (
        <ModuleCatalogTable
          modules={modulesData?.modules || []}
          defaultModuleId={modulesData?.default_module}
          isLoading={isLoading}
        />
      )}

      {activeSubTab === 'corpus' && (
        <CorpusHealthMonitor
          health={corpusData}
          isLoading={isLoading}
          onRefresh={loadAllDiagnostics}
        />
      )}

      {activeSubTab === 'goldset' && (
        <GoldsetReportViewer
          goldset={goldsetData}
          evalReports={evalReports}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

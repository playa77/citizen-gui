import React, { useEffect, useState } from 'react';
import { CompositionRoot } from '@/compositionRoot';
import { complianceStore } from '@/stores/complianceStore';
import { Navbar, type ActiveTab } from '@/components/layout/Navbar';
import { SystemStatusBanner } from '@/components/layout/SystemStatusBanner';
import { DisclaimerModal } from '@/components/layout/DisclaimerModal';
import { AnalyzeView } from '@/views/AnalyzeView';
import { CaseArchiveView } from '@/views/CaseArchiveView';
import { CaseDetailView } from '@/views/CaseDetailView';
import { ConversationView } from '@/views/ConversationView';
import { IntakeView } from '@/views/IntakeView';
import { DiagnosticsView } from '@/views/DiagnosticsView';

export const App: React.FC = () => {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('analyze');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function executeBootstrapCallTrace1() {
      try {
        const { isCurrent, currentVersion } = await CompositionRoot.disclaimer.checkVersion();

        if (isCancelled) return;

        if (!isCurrent) {
          complianceStore.handleVersionMismatch(currentVersion);
          try {
            const textRes = await CompositionRoot.disclaimer.fetchDisclaimerText();
            if (!isCancelled) {
              complianceStore.setDisclaimerText(textRes.text, textRes.version);
            }
          } catch (fetchErr) {
            if (!isCancelled) {
              complianceStore.setError(
                fetchErr instanceof Error ? fetchErr.message : 'Fehler beim Laden des Hinweistextes'
              );
            }
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('[Citizen-GUI][Bootstrap] Disclaimer check failed:', err);
          complianceStore.setDisclaimerModalOpen(true);
        }
      } finally {
        if (!isCancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    executeBootstrapCallTrace1();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleNavigate = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab !== 'detail') {
      setSelectedCaseId(null);
    }
  };

  const handleOpenCaseDetail = (caseId: string) => {
    setSelectedCaseId(caseId);
    setActiveTab('detail');
  };

  return (
    <div className="min-h-svh flex flex-col bg-[var(--ds-color-surface-base)] text-[var(--ds-color-text-primary)]">
      <SystemStatusBanner />
      <Navbar activeTab={activeTab} onNavigate={handleNavigate} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {isBootstrapping ? (
          <div className="flex items-center justify-center py-24 text-[var(--ds-color-text-tertiary)]">
            <span className="ds-text-body-md">Citizen-GUI wird initialisiert…</span>
          </div>
        ) : (
          <>
            {activeTab === 'analyze' && (
              <AnalyzeView onViewCaseDetails={handleOpenCaseDetail} />
            )}

            {activeTab === 'conversations' && (
              <ConversationView />
            )}

            {activeTab === 'intake' && (
              <IntakeView
                onStartAnalysis={() => {
                  setActiveTab('analyze');
                }}
              />
            )}

            {activeTab === 'archive' && (
              <CaseArchiveView onSelectCase={handleOpenCaseDetail} />
            )}

            {activeTab === 'diagnostics' && (
              <DiagnosticsView />
            )}

            {activeTab === 'detail' && selectedCaseId && (
              <CaseDetailView
                caseId={selectedCaseId}
                onBack={() => {
                  setActiveTab('archive');
                  setSelectedCaseId(null);
                }}
              />
            )}
          </>
        )}
      </main>

      <DisclaimerModal />
    </div>
  );
};

export default App;

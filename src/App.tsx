import React, { useEffect, useState } from 'react';
import { CompositionRoot } from '@/compositionRoot';
import { complianceStore } from '@/stores/complianceStore';
import { Navbar } from '@/components/layout/Navbar';
import { SystemStatusBanner } from '@/components/layout/SystemStatusBanner';
import { DisclaimerModal } from '@/components/layout/DisclaimerModal';

export const App: React.FC = () => {
  const [isBootstrapping, setIsBootstrapping] = useState(true);

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

  return (
    <div className="min-h-svh flex flex-col bg-[var(--ds-color-surface-base)] text-[var(--ds-color-text-primary)]">
      <SystemStatusBanner />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {isBootstrapping ? (
          <div className="flex items-center justify-center py-24 text-[var(--ds-color-text-tertiary)]">
            <span className="ds-text-body-md">Citizen-GUI wird initialisiert…</span>
          </div>
        ) : (
          <section className="space-y-6">
            <div className="p-8 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)]">
              <h1 className="ds-text-headline-sm font-semibold text-[var(--ds-color-text-primary)]">
                Bescheidprüfung & Evidenzanalyse
              </h1>
              <p className="mt-2 ds-text-body-md text-[var(--ds-color-text-secondary)]">
                Willkommen bei Citizen-GUI. Laden Sie einen behördlichen Bescheid hoch, um eine
                evidenzgebundene Prüfung nach SGB II durchzuführen.
              </p>
            </div>
          </section>
        )}
      </main>

      <DisclaimerModal />
    </div>
  );
};

export default App;

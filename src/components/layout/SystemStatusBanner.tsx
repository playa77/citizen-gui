import React, { useEffect, useState } from 'react';
import { AlertTriangle, WifiOff } from 'lucide-react';
import { CompositionRoot } from '@/compositionRoot';
import type { DeploymentModeResponse, HealthResponse } from '@/types/api';

export const SystemStatusBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [devInfo, setDevInfo] = useState<DeploymentModeResponse | null>(null);

  useEffect(() => {
    let isCancelled = false;

    // Check liveness probe on mount and every 30s
    const checkHealth = async () => {
      try {
        const res = await CompositionRoot.http.request<HealthResponse>({
          url: '/health',
          method: 'GET',
        });
        if (!isCancelled) {
          setIsOnline(res.status === 'ok');
        }
      } catch {
        if (!isCancelled) {
          setIsOnline(false);
        }
      }
    };

    // Check deployment mode
    const checkDeploymentMode = async () => {
      try {
        const res = await CompositionRoot.http.request<DeploymentModeResponse>({
          url: '/api/v1/meta/deployment-mode',
          method: 'GET',
        });
        if (!isCancelled) {
          setDevInfo(res);
          CompositionRoot.prefs.setDevMode(res.dev || res.mode === 'dev');
        }
      } catch {
        // In case deployment-mode is blocked before disclaimer ack, ignore
      }
    };

    checkHealth();
    checkDeploymentMode();

    const intervalId = setInterval(checkHealth, 30000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <aside aria-label="Systemstatus" className="w-full flex flex-col">
      {/* Offline Alert */}
      {!isOnline && (
        <div
          role="alert"
          className="w-full px-4 py-2 flex items-center justify-center gap-2 bg-[var(--ds-color-bg-danger-subtle)] border-b border-[var(--ds-color-border-danger)] text-[var(--ds-color-text-danger)] ds-text-body-sm font-semibold"
        >
          <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            Verbindung zum Citizen Backend getrennt. Bitte prüfen Sie den Serverstatus.
          </span>
        </div>
      )}

      {/* Dev Mode Banner */}
      {devInfo && devInfo.dev && (
        <div
          role="status"
          className="w-full px-4 py-1.5 flex items-center justify-center gap-2 bg-[var(--ds-color-bg-warning-subtle)] border-b border-[var(--ds-color-border-warning)] text-[var(--ds-color-text-warning)] ds-text-body-sm"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            {devInfo.dev_banner ||
              'Entwicklungsmodus aktiv: Es dürfen ausschließlich synthetische Testdaten verarbeitet werden.'}
          </span>
        </div>
      )}
    </aside>
  );
};

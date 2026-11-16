import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck, Beaker, Star, Layers } from 'lucide-react';
import type { ModuleSummary } from '@/types/api';

export interface ModuleCatalogTableProps {
  modules: ModuleSummary[];
  defaultModuleId?: string;
  isLoading?: boolean;
  className?: string;
}

export const ModuleCatalogTable: React.FC<ModuleCatalogTableProps> = ({
  modules,
  defaultModuleId,
  isLoading = false,
  className = '',
}) => {
  if (isLoading) {
    return (
      <div className={`p-8 text-center text-[var(--ds-color-text-tertiary)] ${className}`}>
        <Layers className="w-8 h-8 mx-auto mb-2 animate-pulse" aria-hidden="true" />
        <p className="ds-text-body-md">Rechtsgebiets-Module werden geladen…</p>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className={`p-6 text-center rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)] ${className}`}>
        <p className="ds-text-body-md text-[var(--ds-color-text-secondary)]">
          Keine Rechtsgebiets-Module gefunden.
        </p>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)] ${className}`}>
      <table className="w-full text-left border-collapse" role="table" aria-label="Rechtsgebiets-Module Katalog">
        <thead>
          <tr className="border-b border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)]">
            <th scope="col" className="p-3.5 ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]">
              Modul & Bezeichnung
            </th>
            <th scope="col" className="p-3.5 ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]">
              Version
            </th>
            <th scope="col" className="p-3.5 ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]">
              Reifegrad (Tier)
            </th>
            <th scope="col" className="p-3.5 ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]">
              Status
            </th>
            <th scope="col" className="p-3.5 ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]">
              Rechtsbereiche (Keys)
            </th>
            <th scope="col" className="p-3.5 ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]">
              Korpus-Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ds-color-border-subtle)]">
          {modules.map((mod) => {
            const isDefault = mod.is_default || mod.id === defaultModuleId;
            const isVerified = mod.tier === 'verified';
            const corpusReady = mod.corpus?.is_ready;

            return (
              <tr
                key={mod.id}
                className="hover:bg-[var(--ds-color-bg-neutral-subtle)] transition-colors"
                data-testid={`module-row-${mod.id}`}
              >
                {/* Modul & Bezeichnung */}
                <td className="p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold ds-text-body-md text-[var(--ds-color-text-primary)]">
                      {mod.title?.de || mod.id}
                    </span>
                    {isDefault && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 ds-text-label-sm rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-bg-accent-subtle)] text-[var(--ds-color-text-accent)] border border-[var(--ds-color-border-default)]"
                        title="Standard-Rechtsgebiet"
                      >
                        <Star className="w-3 h-3 fill-current" aria-hidden="true" />
                        <span>Standard</span>
                      </span>
                    )}
                  </div>
                  <span className="ds-text-body-sm text-[var(--ds-color-text-tertiary)] font-mono">
                    ID: {mod.id}
                  </span>
                </td>

                {/* Version */}
                <td className="p-3.5 ds-text-body-sm text-[var(--ds-color-text-secondary)] font-mono">
                  v{mod.version}
                </td>

                {/* Reifegrad (Tier) */}
                <td className="p-3.5">
                  {isVerified ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ds-radius-control-sm)] ds-text-label-sm bg-[var(--ds-color-bg-success-subtle)] border border-[var(--ds-color-border-success)] text-[var(--ds-color-text-success)] font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Verifiziert (Tier 1)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ds-radius-control-sm)] ds-text-label-sm bg-[var(--ds-color-bg-warning-subtle)] border border-[var(--ds-color-border-warning)] text-[var(--ds-color-text-warning)] font-semibold">
                      <Beaker className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Experimentell (Tier 2)</span>
                    </span>
                  )}
                </td>

                {/* Status */}
                <td className="p-3.5">
                  {mod.enabled ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ds-radius-control-sm)] ds-text-label-sm bg-[var(--ds-color-bg-success-subtle)] border border-[var(--ds-color-border-success)] text-[var(--ds-color-text-success)]">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Aktiviert</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ds-radius-control-sm)] ds-text-label-sm bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-tertiary)]">
                      <span>Deaktiviert</span>
                    </span>
                  )}
                </td>

                {/* Area keys */}
                <td className="p-3.5">
                  <div className="flex flex-wrap gap-1">
                    {mod.area_keys && mod.area_keys.length > 0 ? (
                      mod.area_keys.map((key) => (
                        <span
                          key={key}
                          className="px-1.5 py-0.5 ds-text-label-sm font-mono rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-secondary)] border border-[var(--ds-color-border-subtle)]"
                        >
                          {key}
                        </span>
                      ))
                    ) : (
                      <span className="ds-text-body-sm text-[var(--ds-color-text-tertiary)]">—</span>
                    )}
                  </div>
                </td>

                {/* Korpus-Status */}
                <td className="p-3.5">
                  {mod.corpus ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        {corpusReady ? (
                          <span className="inline-flex items-center gap-1 ds-text-label-sm text-[var(--ds-color-text-success)] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Bereit</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 ds-text-label-sm text-[var(--ds-color-text-warning)] font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Nicht bereit</span>
                          </span>
                        )}
                        <span className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
                          ({mod.corpus.chunk_count.toLocaleString('de-DE')} Chunks)
                        </span>
                      </div>
                      {mod.corpus.missing_source_types && mod.corpus.missing_source_types.length > 0 && (
                        <p className="ds-text-body-sm text-[var(--ds-color-text-warning)]">
                          Fehlend: {mod.corpus.missing_source_types.join(', ')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="ds-text-body-sm text-[var(--ds-color-text-tertiary)]">
                      Kein Korpus konfiguriert
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

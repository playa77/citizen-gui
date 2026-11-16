import React, { useEffect, useState } from 'react';
import { Scale, Moon, Sun, Monitor } from 'lucide-react';
import { CompositionRoot } from '@/compositionRoot';
import type { UiTheme } from '@/types/domain';

export const Navbar: React.FC = () => {
  const [theme, setTheme] = useState<UiTheme>(() => CompositionRoot.prefs.getTheme());
  const [isDev] = useState<boolean>(() => CompositionRoot.prefs.isDevMode());

  useEffect(() => {
    // Sync theme with DOM document attribute
    const applyTheme = (t: UiTheme) => {
      if (t === 'system') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', t);
      }
    };
    applyTheme(theme);
  }, [theme]);

  const handleCycleTheme = () => {
    const nextTheme: UiTheme =
      theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(nextTheme);
    CompositionRoot.prefs.setTheme(nextTheme);
  };

  return (
    <header className="w-full border-b border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)]">
      <div className="flex items-center justify-between h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center p-2 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-accent-subtle)] text-[var(--ds-color-text-accent)]">
            <Scale className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="ds-text-title-lg font-semibold text-[var(--ds-color-text-primary)]">
                Citizen
              </span>
              {isDev && (
                <span className="px-2 py-0.5 ds-text-label-sm rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-bg-warning-subtle)] border border-[var(--ds-color-border-warning)] text-[var(--ds-color-text-warning)]">
                  Dev-Modus
                </span>
              )}
            </div>
            <p className="ds-text-body-sm text-[var(--ds-color-text-tertiary)] hidden sm:block">
              Evidenzgebundene Bescheidprüfung
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCycleTheme}
            aria-label={`Design-Thema wechseln (Aktuell: ${theme})`}
            title={`Thema: ${theme} (Klicken zum Wechseln)`}
            className="flex items-center justify-center min-h-[var(--ds-size-target-min)] min-w-[var(--ds-size-target-min)] p-2 rounded-[var(--ds-radius-control)] text-[var(--ds-color-text-secondary)] hover:text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)] transition-colors ds-focus-ring cursor-pointer"
          >
            {theme === 'light' && <Sun className="w-5 h-5" aria-hidden="true" />}
            {theme === 'dark' && <Moon className="w-5 h-5" aria-hidden="true" />}
            {theme === 'system' && <Monitor className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
};

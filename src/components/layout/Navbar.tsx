import React, { useEffect, useState } from 'react';
import { Scale, Moon, Sun, Monitor, FileSearch, FolderArchive } from 'lucide-react';
import { CompositionRoot } from '@/compositionRoot';
import type { UiTheme } from '@/types/domain';

export type ActiveTab = 'analyze' | 'archive' | 'detail';

export interface NavbarProps {
  activeTab?: ActiveTab;
  onNavigate?: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab = 'analyze',
  onNavigate,
}) => {
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
        <div className="flex items-center gap-6">
          <div
            onClick={() => onNavigate?.('analyze')}
            className="flex items-center gap-3 cursor-pointer group"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onNavigate?.('analyze');
            }}
            aria-label="Citizen Startseite"
          >
            <div className="flex items-center justify-center p-2 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-accent-subtle)] text-[var(--ds-color-text-accent)] group-hover:bg-[var(--ds-color-bg-action-primary)] group-hover:text-[var(--ds-color-text-on-action)] transition-colors">
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

          {/* Navigation Links */}
          {onNavigate && (
            <nav className="hidden md:flex items-center gap-1" aria-label="Hauptnavigation">
              <button
                type="button"
                onClick={() => onNavigate('analyze')}
                aria-current={activeTab === 'analyze' ? 'page' : undefined}
                className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] ds-text-label-md font-semibold transition-colors ds-focus-ring cursor-pointer ${
                  activeTab === 'analyze'
                    ? 'bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-primary)] border border-[var(--ds-color-border-focus)]'
                    : 'text-[var(--ds-color-text-secondary)] hover:text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)]'
                }`}
              >
                <FileSearch className="w-4 h-4" aria-hidden="true" />
                <span>Bescheid prüfen</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('archive')}
                aria-current={activeTab === 'archive' || activeTab === 'detail' ? 'page' : undefined}
                className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] ds-text-label-md font-semibold transition-colors ds-focus-ring cursor-pointer ${
                  activeTab === 'archive' || activeTab === 'detail'
                    ? 'bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-primary)] border border-[var(--ds-color-border-focus)]'
                    : 'text-[var(--ds-color-text-secondary)] hover:text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle)]'
                }`}
              >
                <FolderArchive className="w-4 h-4" aria-hidden="true" />
                <span>Fall-Archiv</span>
              </button>
            </nav>
          )}
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile nav buttons */}
          {onNavigate && (
            <div className="flex md:hidden items-center gap-1 mr-2">
              <button
                type="button"
                onClick={() => onNavigate('analyze')}
                aria-label="Bescheid prüfen"
                className={`p-2 min-h-[var(--ds-size-target-min)] min-w-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] ${
                  activeTab === 'analyze'
                    ? 'bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-primary)]'
                    : 'text-[var(--ds-color-text-secondary)]'
                }`}
              >
                <FileSearch className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('archive')}
                aria-label="Fall-Archiv"
                className={`p-2 min-h-[var(--ds-size-target-min)] min-w-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] ${
                  activeTab === 'archive' || activeTab === 'detail'
                    ? 'bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-primary)]'
                    : 'text-[var(--ds-color-text-secondary)]'
                }`}
              >
                <FolderArchive className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Theme Switcher */}
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

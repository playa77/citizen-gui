import React from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle2, Info, Scale } from 'lucide-react';
import type { FinalOutputStructure } from '@/types/api';
import { formatDateGerman } from '@/utils/formatters';

export interface DeadlineBannerProps {
  fristen?: FinalOutputStructure['fristen'];
  className?: string;
}

export const DeadlineBanner: React.FC<DeadlineBannerProps> = ({
  fristen,
  className = '',
}) => {
  if (!fristen) {
    return (
      <div
        className={`p-6 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] text-[var(--ds-color-text-secondary)] ${className}`}
        role="region"
        aria-label="Fristen und Rechtsbehelfe"
      >
        <p className="ds-text-body-md">Keine Fristdaten im Bescheid ermittelt.</p>
      </div>
    );
  }

  const {
    bescheid_datum,
    zustellungs_fiktion,
    frist_ende,
    feiertags_rollover,
    rechtsbehelfsbelehrung_korrekt,
    gesetzliche_grundlage,
  } = fristen;

  const isInstructionDefective = rechtsbehelfsbelehrung_korrekt === false;

  return (
    <section
      className={`border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] overflow-hidden shadow-raised ${className}`}
      role="region"
      aria-label="Gesetzliche Fristen und Rechtsbehelfsbelehrung"
    >
      {/* Banner Top Accent */}
      <div className="bg-[var(--ds-color-bg-accent-subtle)] border-b border-[var(--ds-color-border-default)] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-accent)] shrink-0">
            <Clock className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="ds-text-title-md font-semibold text-[var(--ds-color-text-primary)]">
              Gesetzliche Fristen & Rechtsbehelf
            </h2>
            <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
              Evidenzbasierte Fristberechnung nach Sozialgerichtsgesetz (SGG)
            </p>
          </div>
        </div>

        {/* Rechtsgrundlage Tag */}
        {gesetzliche_grundlage && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-focus)] text-[var(--ds-color-text-accent)] ds-text-label-sm font-semibold self-start sm:self-auto">
            <Scale className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{gesetzliche_grundlage}</span>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Core Deadline Highlight Card */}
        <div className="p-5 rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="ds-text-label-sm text-[var(--ds-color-text-secondary)] uppercase tracking-wider">
              Widerspruchsfrist endet am
            </span>
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-[var(--ds-color-text-accent)] shrink-0" aria-hidden="true" />
              <span className="ds-text-headline-md font-semibold text-[var(--ds-color-text-primary)]">
                {formatDateGerman(frist_ende)}
              </span>
            </div>
            {bescheid_datum && (
              <p className="ds-text-body-sm text-[var(--ds-color-text-tertiary)]">
                Datum des Bescheids: <span className="font-semibold text-[var(--ds-color-text-secondary)]">{formatDateGerman(bescheid_datum)}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 self-start md:self-auto">
            {isInstructionDefective ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-warning-subtle)] border border-[var(--ds-color-border-warning)] text-[var(--ds-color-text-warning)] ds-text-label-sm font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Rechtsbehelfsbelehrung fehlerhaft (Jahresfrist § 66 Abs. 2 SGG)</span>
              </div>
            ) : rechtsbehelfsbelehrung_korrekt ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-success-subtle)] border border-[var(--ds-color-border-success)] text-[var(--ds-color-text-success)] ds-text-label-sm font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Rechtsbehelfsbelehrung ordnungsgemäß (§ 84 SGG)</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Notices: Bekanntgabefiktion & Feiertags-Rollover */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Zustellungsfiktion (§ 37 Abs. 2 SGB X) */}
          <div className="p-4 rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)] space-y-1.5">
            <div className="flex items-center gap-2 text-[var(--ds-color-text-primary)]">
              <Info className="w-4 h-4 text-[var(--ds-color-text-accent)] shrink-0" aria-hidden="true" />
              <h3 className="ds-text-title-sm font-semibold">
                Bekanntgabefiktion (§ 37 Abs. 2 SGB X)
              </h3>
            </div>
            <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)] leading-relaxed">
              {zustellungs_fiktion ||
                'Ein schriftlicher Verwaltungsakt gilt am dritten Tag nach Aufgabe zur Post als bekanntgegeben.'}
            </p>
          </div>

          {/* Feiertags-Rollover (§ 64 Abs. 3 SGG) */}
          <div className="p-4 rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)] space-y-1.5">
            <div className="flex items-center gap-2 text-[var(--ds-color-text-primary)]">
              <Calendar className="w-4 h-4 text-[var(--ds-color-text-accent)] shrink-0" aria-hidden="true" />
              <h3 className="ds-text-title-sm font-semibold">
                Fristablauf & Feiertage (§ 64 Abs. 3 SGG)
              </h3>
            </div>
            <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)] leading-relaxed">
              {feiertags_rollover
                ? 'Feiertags-Rollover aktiv: Da das reguläre Fristende auf ein Wochenende oder einen gesetzlichen Feiertag fiel, endet die Frist mit Ablauf des nächsten Werktages.'
                : 'Fällt das Fristende auf einen Samstag, Sonntag oder gesetzlichen Feiertag, endet die Frist mit Ablauf des nächsten Werktages.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

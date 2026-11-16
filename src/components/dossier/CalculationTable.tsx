import React from 'react';
import { Calculator, TrendingUp, TrendingDown, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import type { FinalOutputStructure } from '@/types/api';
import { formatCentsToEuro, formatCentDifference } from '@/utils/formatters';

export interface CalculationTableProps {
  berechnung?: FinalOutputStructure['berechnung'];
  className?: string;
}

export const CalculationTable: React.FC<CalculationTableProps> = ({
  berechnung,
  className = '',
}) => {
  if (!berechnung) {
    return (
      <div
        className={`p-6 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] text-[var(--ds-color-text-secondary)] ${className}`}
        role="region"
        aria-label="Berechnungskaskade"
      >
        <p className="ds-text-body-md">Keine finanzielle Berechnungsprüfung im Bescheid ermittelt.</p>
      </div>
    );
  }

  const {
    anspruch_ermittelt_cent,
    anspruch_bescheid_cent,
    differenz_cent,
    positionen = [],
  } = berechnung;

  const isUnderpaid = differenz_cent > 0; // Authority awarded less than statutory entitlement
  const isOverpaid = differenz_cent < 0; // Authority awarded more or calculated deduction error against citizen
  const isExact = differenz_cent === 0;

  return (
    <section
      className={`border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] overflow-hidden shadow-raised ${className}`}
      role="region"
      aria-label="Berechnungskaskade nach § 11b SGB II"
    >
      {/* Header */}
      <div className="bg-[var(--ds-color-bg-accent-subtle)] border-b border-[var(--ds-color-border-default)] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-accent)] shrink-0">
            <Calculator className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="ds-text-title-md font-semibold text-[var(--ds-color-text-primary)]">
              Berechnungskaskade & Anspruchsprüfung
            </h2>
            <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
              Cent-genaue Gegenüberstellung nach § 11b SGB II (Einkommensabsetzbeträge)
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-secondary)] ds-text-label-sm font-semibold self-start sm:self-auto">
          <FileSpreadsheet className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{positionen.length} Positionen geprüft</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Comparison Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Behörde (Bescheid) */}
          <div className="p-4 rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)]">
            <span className="ds-text-label-sm text-[var(--ds-color-text-secondary)]">
              Behörde (Bescheid)
            </span>
            <div className="mt-2 ds-text-headline-sm font-semibold font-mono text-[var(--ds-color-text-primary)]">
              {formatCentsToEuro(anspruch_bescheid_cent)}
            </div>
            <p className="mt-1 ds-text-body-sm text-[var(--ds-color-text-tertiary)]">
              Laut angefochtenem Bescheid
            </p>
          </div>

          {/* 2. Gesetzlicher Anspruch */}
          <div className="p-4 rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)]">
            <span className="ds-text-label-sm text-[var(--ds-color-text-secondary)]">
              Gesetzlich ermittelt
            </span>
            <div className="mt-2 ds-text-headline-sm font-semibold font-mono text-[var(--ds-color-text-primary)]">
              {formatCentsToEuro(anspruch_ermittelt_cent)}
            </div>
            <p className="mt-1 ds-text-body-sm text-[var(--ds-color-text-tertiary)]">
              Gesetzlicher Anspruch nach Prüfung
            </p>
          </div>

          {/* 3. Differenz */}
          <div
            className={`p-4 rounded-[var(--ds-radius-container)] border ${
              isUnderpaid
                ? 'border-[var(--ds-color-border-success)] bg-[var(--ds-color-bg-success-subtle)]'
                : isOverpaid
                ? 'border-[var(--ds-color-border-danger)] bg-[var(--ds-color-bg-danger-subtle)]'
                : 'border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="ds-text-label-sm text-[var(--ds-color-text-secondary)]">
                Differenz / Abweichung
              </span>
              {isUnderpaid && (
                <TrendingUp className="w-4 h-4 text-[var(--ds-color-text-success)]" aria-hidden="true" />
              )}
              {isOverpaid && (
                <TrendingDown className="w-4 h-4 text-[var(--ds-color-text-danger)]" aria-hidden="true" />
              )}
              {isExact && (
                <CheckCircle2 className="w-4 h-4 text-[var(--ds-color-text-secondary)]" aria-hidden="true" />
              )}
            </div>
            <div
              className={`mt-2 ds-text-headline-sm font-semibold font-mono ${
                isUnderpaid
                  ? 'text-[var(--ds-color-text-success)]'
                  : isOverpaid
                  ? 'text-[var(--ds-color-text-danger)]'
                  : 'text-[var(--ds-color-text-primary)]'
              }`}
            >
              {formatCentDifference(differenz_cent)}
            </div>
            <p className="mt-1 ds-text-body-sm text-[var(--ds-color-text-secondary)]">
              {isUnderpaid
                ? 'Nachzahlung zu Gunsten des Bürgers'
                : isOverpaid
                ? 'Mögliche Überzahlung oder Fehlberechnung'
                : 'Keine finanzielle Abweichung'}
            </p>
          </div>
        </div>

        {/* Detailed Positions Table */}
        {positionen.length > 0 && (
          <div className="overflow-x-auto border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)]">
            <table className="w-full text-left border-collapse ds-text-body-sm">
              <caption className="sr-only">
                Aufschlüsselung der einzelnen Berechnungspositionen nach SGB II
              </caption>
              <thead>
                <tr className="border-b border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-secondary)] ds-text-label-sm font-semibold">
                  <th scope="col" className="py-3 px-4">
                    Bezeichnung / Position
                  </th>
                  <th scope="col" className="py-3 px-4 text-right">
                    Behörde (Bescheid)
                  </th>
                  <th scope="col" className="py-3 px-4 text-right">
                    Gesetzlich ermittelt
                  </th>
                  <th scope="col" className="py-3 px-4 text-right">
                    Differenz
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Rechts- & Abwägungsgrundlage
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ds-color-border-default)]">
                {positionen.map((pos, idx) => {
                  const posDelta = pos.korrekt_cent - pos.behoerde_cent;
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-[var(--ds-color-bg-neutral-subtle)] transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-[var(--ds-color-text-primary)]">
                        {pos.bezeichnung}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[var(--ds-color-text-secondary)] whitespace-nowrap">
                        {formatCentsToEuro(pos.behoerde_cent)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-[var(--ds-color-text-primary)] whitespace-nowrap">
                        {formatCentsToEuro(pos.korrekt_cent)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-semibold whitespace-nowrap ${
                          posDelta > 0
                            ? 'text-[var(--ds-color-text-success)]'
                            : posDelta < 0
                            ? 'text-[var(--ds-color-text-danger)]'
                            : 'text-[var(--ds-color-text-secondary)]'
                        }`}
                      >
                        {formatCentDifference(posDelta)}
                      </td>
                      <td className="py-3 px-4 text-[var(--ds-color-text-secondary)] max-w-xs break-words">
                        {pos.abwaegungsgrundlage || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

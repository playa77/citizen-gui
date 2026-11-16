import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  FileSearch,
  Languages,
} from 'lucide-react';
import type { OcrAssessmentResponse, OcrQualityLevel } from '@/types/api';

export interface OcrQualityBadgeProps {
  assessment: OcrAssessmentResponse;
  compact?: boolean;
}

export const OcrQualityBadge: React.FC<OcrQualityBadgeProps> = ({
  assessment,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    score,
    level,
    issues = [],
    warnings = [],
    ocr_artifacts_detected,
    readable_words_pct,
    language_detected,
    recommendations = [],
  } = assessment;

  const scorePct = Math.round(score * 100);

  const getLevelConfig = (lvl: OcrQualityLevel) => {
    switch (lvl) {
      case 'good':
        return {
          label: 'Gute Lesbarkeit',
          icon: CheckCircle2,
          bgClass: 'bg-[var(--ds-color-bg-success-subtle)]',
          borderClass: 'border-[var(--ds-color-border-success)]',
          textClass: 'text-[var(--ds-color-text-success)]',
          badgeText: 'Optimal',
        };
      case 'medium':
        return {
          label: 'Eingeschränkte Lesbarkeit',
          icon: AlertTriangle,
          bgClass: 'bg-[var(--ds-color-bg-warning-subtle)]',
          borderClass: 'border-[var(--ds-color-border-warning)]',
          textClass: 'text-[var(--ds-color-text-warning)]',
          badgeText: 'Prüfen',
        };
      case 'poor':
      default:
        return {
          label: 'Schlechte Lesbarkeit',
          icon: AlertOctagon,
          bgClass: 'bg-[var(--ds-color-bg-danger-subtle)]',
          borderClass: 'border-[var(--ds-color-border-danger)]',
          textClass: 'text-[var(--ds-color-text-danger)]',
          badgeText: 'Korrektur nötig',
        };
    }
  };

  const config = getLevelConfig(level);
  const LevelIcon = config.icon;

  const hasExtraDetails =
    issues.length > 0 ||
    warnings.length > 0 ||
    recommendations.length > 0 ||
    ocr_artifacts_detected;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--ds-radius-control)] border ${config.borderClass} ${config.bgClass} ${config.textClass}`}
        role="status"
        aria-label={`OCR-Qualität: ${config.label} (${scorePct} Prozent)`}
      >
        <LevelIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="ds-text-label-md font-semibold">{scorePct}% OCR-Score</span>
        <span className="ds-text-body-sm opacity-85">({config.label})</span>
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-[var(--ds-radius-container)] border ${config.borderClass} ${config.bgClass} transition-colors`}
      role="region"
      aria-label="OCR-Qualitätsbewertung"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-[var(--ds-radius-control)] ${config.bgClass} ${config.textClass} border ${config.borderClass}`}
          >
            <LevelIcon className="w-5 h-5 shrink-0" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`ds-text-title-sm font-semibold ${config.textClass}`}>
                {config.label}
              </span>
              <span className="px-2 py-0.5 ds-text-numeric-md font-semibold rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-primary)]">
                {scorePct} %
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[var(--ds-color-text-secondary)] ds-text-body-sm">
              <span className="inline-flex items-center gap-1">
                <FileSearch className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{readable_words_pct}% Wörter erkennbar</span>
              </span>
              {language_detected && (
                <span className="inline-flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sprache: {language_detected.toUpperCase()}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {hasExtraDetails && (
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            className="inline-flex items-center justify-between sm:justify-center gap-1.5 px-3 py-1.5 rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)] text-[var(--ds-color-text-primary)] hover:bg-[var(--ds-color-bg-neutral-subtle-hover)] transition-colors ds-text-body-sm"
          >
            <span>{isExpanded ? 'Details verbergen' : 'Details & Hinweise'}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {/* Expanded Quality Details */}
      {isExpanded && hasExtraDetails && (
        <div className="mt-4 pt-3 border-t border-[var(--ds-color-border-default)] space-y-3">
          {ocr_artifacts_detected && (
            <div
              className="p-2.5 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-warning)] flex items-start gap-2"
              role="alert"
            >
              <AlertTriangle className="w-4 h-4 text-[var(--ds-color-text-warning)] shrink-0 mt-0.5" aria-hidden="true" />
              <p className="ds-text-body-sm text-[var(--ds-color-text-primary)]">
                <strong>OCR-Artefakte erkannt:</strong> Sonderzeichen oder unvollständige Wörter
                wurden identifiziert. Bitte prüfen Sie den Text im Textfeld unten vor der Freigabe.
              </p>
            </div>
          )}

          {warnings.length > 0 && (
            <div>
              <h4 className="ds-text-label-sm font-semibold text-[var(--ds-color-text-secondary)] mb-1">
                Erkannte Lesbarkeits-Warnungen
              </h4>
              <ul className="list-disc list-inside space-y-0.5 ds-text-body-sm text-[var(--ds-color-text-primary)]">
                {warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {issues.length > 0 && (
            <div>
              <h4 className="ds-text-label-sm font-semibold text-[var(--ds-color-text-danger)] mb-1">
                Kritische Erkennungsfehler
              </h4>
              <ul className="list-disc list-inside space-y-0.5 ds-text-body-sm text-[var(--ds-color-text-primary)]">
                {issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {recommendations.length > 0 && (
            <div>
              <h4 className="ds-text-label-sm font-semibold text-[var(--ds-color-text-secondary)] mb-1">
                Handlungsempfehlungen
              </h4>
              <ul className="list-disc list-inside space-y-0.5 ds-text-body-sm text-[var(--ds-color-text-primary)]">
                {recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

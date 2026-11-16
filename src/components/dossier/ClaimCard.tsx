import React, { useState } from 'react';
import {
  Check,
  X,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Quote,
  Scale,
  Calculator,
  Calendar,
  FileText,
} from 'lucide-react';
import type { Claim, ClaimType, EvidenceBinding, AdjudicationStatus } from '@/types/domain';
import { formatConfidenceScore } from '@/utils/formatters';

export interface ClaimCardProps {
  claim: Claim;
  caseId?: string;
  onAdjudicate?: (claimId: string, status: AdjudicationStatus) => Promise<void> | void;
  onEditClaim?: (claimId: string, newText: string) => Promise<void> | void;
  onSelectCitation?: (binding: EvidenceBinding) => void;
  className?: string;
}

const CLAIM_TYPE_LABELS: Record<ClaimType, { label: string; icon: React.FC<{ className?: string }> }> = {
  fact: { label: 'Tatsache', icon: FileText },
  legal_finding: { label: 'Rechtliche Würdigung', icon: Scale },
  deadline: { label: 'Frist', icon: Calendar },
  calculation: { label: 'Berechnung', icon: Calculator },
};

export const ClaimCard: React.FC<ClaimCardProps> = ({
  claim,
  onAdjudicate,
  onEditClaim,
  onSelectCitation,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(claim.claim_text);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localStatus, setLocalStatus] = useState<AdjudicationStatus | undefined>(claim.user_status);

  const typeConfig = CLAIM_TYPE_LABELS[claim.claim_type] || {
    label: claim.claim_type,
    icon: FileText,
  };
  const TypeIcon = typeConfig.icon;

  const isAnyVerified = claim.evidence_bindings.some((b) => b.verified);

  const handleAgree = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setLocalStatus('agreed');
    try {
      if (onAdjudicate) {
        await onAdjudicate(claim.id, 'agreed');
      }
    } catch (err) {
      console.error('[ClaimCard] Adjudication error:', err);
      // Revert if failed
      setLocalStatus(claim.user_status);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispute = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setLocalStatus('disputed');
    try {
      if (onAdjudicate) {
        await onAdjudicate(claim.id, 'disputed');
      }
    } catch (err) {
      console.error('[ClaimCard] Dispute error:', err);
      // Revert if failed
      setLocalStatus(claim.user_status);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editedText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (onEditClaim) {
        await onEditClaim(claim.id, editedText.trim());
      }
      setIsEditing(false);
    } catch (err) {
      console.error('[ClaimCard] Edit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedText(claim.claim_text);
    setIsEditing(false);
  };

  return (
    <article
      className={`border rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] transition-colors ${
        localStatus === 'agreed'
          ? 'border-[var(--ds-color-border-success)]'
          : localStatus === 'disputed'
          ? 'border-[var(--ds-color-border-danger)]'
          : 'border-[var(--ds-color-border-default)]'
      } p-5 space-y-4 shadow-raised ${className}`}
      aria-label={`Feststellung: ${claim.claim_text}`}
    >
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--ds-color-border-default)]">
        <div className="flex items-center gap-2">
          {/* Claim Type Badge */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-secondary)] ds-text-label-sm font-semibold">
            <TypeIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{typeConfig.label}</span>
          </span>

          {/* Verification Badge */}
          {isAnyVerified ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-bg-success-subtle)] border border-[var(--ds-color-border-success)] text-[var(--ds-color-text-success)] ds-text-label-sm font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Verifiziert</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-bg-warning-subtle)] border border-[var(--ds-color-border-warning)] text-[var(--ds-color-text-warning)] ds-text-label-sm font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Unverifiziert</span>
            </span>
          )}

          {/* Confidence Score */}
          <span className="px-2 py-0.5 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-tertiary)] ds-text-label-sm font-mono">
            {formatConfidenceScore(claim.confidence_score)} Konfidenz
          </span>
        </div>

        {/* Adjudication Status Pill */}
        {localStatus === 'agreed' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-bg-success-subtle)] border border-[var(--ds-color-border-success)] text-[var(--ds-color-text-success)] ds-text-label-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>Bestätigt</span>
          </span>
        )}
        {localStatus === 'disputed' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-bg-danger-subtle)] border border-[var(--ds-color-border-danger)] text-[var(--ds-color-text-danger)] ds-text-label-sm font-semibold">
            <X className="w-4 h-4" aria-hidden="true" />
            <span>Bestritten</span>
          </span>
        )}
      </div>

      {/* Claim Body Text or Inline Editor */}
      {isEditing ? (
        <div className="space-y-3">
          <label htmlFor={`edit-claim-${claim.id}`} className="sr-only">
            Text der Rüge bearbeiten
          </label>
          <textarea
            id={`edit-claim-${claim.id}`}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full p-3 rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-focus)] bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-primary)] ds-text-body-md focus:outline-none focus:ring-2 focus:ring-[var(--ds-color-border-focus)] min-h-[90px]"
            rows={3}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] text-[var(--ds-color-text-secondary)] hover:bg-[var(--ds-color-bg-neutral-subtle)] ds-text-label-sm min-h-[var(--ds-size-target-min)]"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSubmitting || !editedText.trim()}
              className="px-4 py-1.5 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-action-primary)] text-[var(--ds-color-text-on-action)] ds-text-label-sm font-semibold hover:opacity-90 min-h-[var(--ds-size-target-min)]"
            >
              {isSubmitting ? 'Wird gespeichert…' : 'Speichern'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <p className="ds-text-body-md text-[var(--ds-color-text-primary)] leading-relaxed flex-1">
            {claim.claim_text}
          </p>
          {onEditClaim && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              aria-label="Text der Rüge bearbeiten"
              title="Text bearbeiten"
              className="p-2 text-[var(--ds-color-text-tertiary)] hover:text-[var(--ds-color-text-primary)] rounded-[var(--ds-radius-control)] hover:bg-[var(--ds-color-surface-sunken)] transition-colors min-h-[var(--ds-size-target-min)] min-w-[var(--ds-size-target-min)] flex items-center justify-center ds-focus-ring cursor-pointer"
            >
              <Edit2 className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* Evidence Bindings Badges */}
      {claim.evidence_bindings.length > 0 && (
        <div className="space-y-2 pt-2">
          <span className="ds-text-label-sm text-[var(--ds-color-text-secondary)]">
            Evidenznachweise ({claim.evidence_bindings.length}):
          </span>
          <div className="flex flex-wrap gap-2">
            {claim.evidence_bindings.map((binding, idx) => (
              <button
                key={binding.chunk_id || idx}
                type="button"
                onClick={() => onSelectCitation?.(binding)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)] hover:bg-[var(--ds-color-bg-accent-subtle)] hover:border-[var(--ds-color-border-focus)] transition-colors text-left ds-text-body-sm group cursor-pointer ds-focus-ring min-h-[var(--ds-size-target-min)]"
                title="Klicken zum Öffnen des Volltext-Zitats"
                aria-label={`Zitat ${binding.chunk_id}: ${binding.quote_excerpt}`}
              >
                <Quote className="w-3.5 h-3.5 text-[var(--ds-color-text-accent)] shrink-0" aria-hidden="true" />
                <span className="font-mono ds-text-label-sm text-[var(--ds-color-text-secondary)] group-hover:text-[var(--ds-color-text-accent)]">
                  {binding.chunk_id}
                </span>
                <span className="text-[var(--ds-color-text-tertiary)]">·</span>
                <span className="text-[var(--ds-color-text-primary)] max-w-xs truncate">
                  „{binding.quote_excerpt}“
                </span>
                <span className="ds-text-label-sm font-semibold text-[var(--ds-color-text-accent)] ml-1">
                  ({formatConfidenceScore(binding.binding_strength)})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Human Adjudication Controls */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--ds-color-border-default)] gap-3">
        <span className="ds-text-label-sm text-[var(--ds-color-text-secondary)]">
          Menschliche Prüfung:
        </span>

        <div className="flex items-center gap-2">
          {/* Dispute Button */}
          <button
            type="button"
            onClick={handleDispute}
            disabled={isSubmitting}
            aria-label="Dieser Feststellung widersprechen"
            className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-[var(--ds-radius-control)] border min-h-[var(--ds-size-target-min)] ds-text-label-sm font-semibold transition-colors ds-focus-ring cursor-pointer ${
              localStatus === 'disputed'
                ? 'bg-[var(--ds-color-bg-danger-subtle)] border-[var(--ds-color-border-danger)] text-[var(--ds-color-text-danger)]'
                : 'bg-[var(--ds-color-surface-raised)] border-[var(--ds-color-border-default)] text-[var(--ds-color-text-secondary)] hover:text-[var(--ds-color-text-danger)] hover:bg-[var(--ds-color-bg-danger-subtle)]'
            }`}
          >
            <X className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Widersprechen</span>
          </button>

          {/* Agree Button */}
          <button
            type="button"
            onClick={handleAgree}
            disabled={isSubmitting}
            aria-label="Diese Feststellung bestätigen"
            className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-[var(--ds-radius-control)] border min-h-[var(--ds-size-target-min)] ds-text-label-sm font-semibold transition-colors ds-focus-ring cursor-pointer ${
              localStatus === 'agreed'
                ? 'bg-[var(--ds-color-bg-success-subtle)] border-[var(--ds-color-border-success)] text-[var(--ds-color-text-success)]'
                : 'bg-[var(--ds-color-surface-raised)] border-[var(--ds-color-border-default)] text-[var(--ds-color-text-secondary)] hover:text-[var(--ds-color-text-success)] hover:bg-[var(--ds-color-bg-success-subtle)]'
            }`}
          >
            <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Zustimmen</span>
          </button>
        </div>
      </div>
    </article>
  );
};

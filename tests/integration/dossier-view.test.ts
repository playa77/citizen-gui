import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { CompositionRoot } from '@/compositionRoot';
import { streamingStore } from '@/stores/streamingStore';
import { DeadlineBanner } from '@/components/dossier/DeadlineBanner';
import { CalculationTable } from '@/components/dossier/CalculationTable';
import { AdversarialReviewCard } from '@/components/dossier/AdversarialReviewCard';
import { ClaimCard } from '@/components/dossier/ClaimCard';
import { AnalyzeView } from '@/views/AnalyzeView';
import { CaseDetailView } from '@/views/CaseDetailView';
import type { FinalOutputStructure, AnalysisFinalEventPayload } from '@/types/api';
import type { Claim } from '@/types/domain';

describe('WP-07: Dossier Viewer, Statutory Deadlines & Calculation Cascade [Doc 1 §2.1 FR-05, Doc 2 §5.1, §8.6, §14 AC-05]', () => {
  beforeEach(() => {
    window.localStorage.clear();
    streamingStore.reset();
    vi.restoreAllMocks();
  });

  describe('DeadlineBanner', () => {
    const validFristen: FinalOutputStructure['fristen'] = {
      bescheid_datum: '2026-11-01',
      zustellungs_fiktion: 'Gilt am 04.11.2026 als bekanntgegeben (§ 37 Abs. 2 SGB X)',
      frist_ende: '2026-12-04',
      feiertags_rollover: false,
      rechtsbehelfsbelehrung_korrekt: true,
      gesetzliche_grundlage: '§ 84 SGG (Monatsfrist)',
    };

    it('should render statutory deadline date, statutory basis, and delivery fiction notice', () => {
      render(React.createElement(DeadlineBanner, { fristen: validFristen }));

      expect(screen.getByText('Gesetzliche Fristen & Rechtsbehelf')).toBeInTheDocument();
      expect(screen.getByText('§ 84 SGG (Monatsfrist)')).toBeInTheDocument();
      expect(screen.getByText('04.12.2026')).toBeInTheDocument();
      expect(screen.getByText(/01.11.2026/)).toBeInTheDocument();
      expect(screen.getByText('Bekanntgabefiktion (§ 37 Abs. 2 SGB X)')).toBeInTheDocument();
      expect(screen.getByText(/Gilt am 04.11.2026 als bekanntgegeben/)).toBeInTheDocument();
      expect(screen.getByText('Rechtsbehelfsbelehrung ordnungsgemäß (§ 84 SGG)')).toBeInTheDocument();
    });

    it('should render holiday rollover alert when feiertags_rollover is true', () => {
      const rolloverFristen: FinalOutputStructure['fristen'] = {
        ...validFristen,
        frist_ende: '2026-12-07',
        feiertags_rollover: true,
      };

      render(React.createElement(DeadlineBanner, { fristen: rolloverFristen }));

      expect(screen.getByText('07.12.2026')).toBeInTheDocument();
      expect(
        screen.getByText(/Feiertags-Rollover aktiv: Da das reguläre Fristende auf ein Wochenende oder einen gesetzlichen Feiertag fiel/)
      ).toBeInTheDocument();
    });

    it('should display warning for defective legal remedies instruction with 1-year Jahresfrist § 66 Abs. 2 SGG', () => {
      const defectiveFristen: FinalOutputStructure['fristen'] = {
        ...validFristen,
        rechtsbehelfsbelehrung_korrekt: false,
        gesetzliche_grundlage: '§ 66 Abs. 2 SGG (Jahresfrist)',
      };

      render(React.createElement(DeadlineBanner, { fristen: defectiveFristen }));

      expect(
        screen.getByText('Rechtsbehelfsbelehrung fehlerhaft (Jahresfrist § 66 Abs. 2 SGG)')
      ).toBeInTheDocument();
      expect(screen.getByText('§ 66 Abs. 2 SGG (Jahresfrist)')).toBeInTheDocument();
    });

    it('should render fallback message when fristen is undefined', () => {
      render(React.createElement(DeadlineBanner, { fristen: undefined }));
      expect(screen.getByText('Keine Fristdaten im Bescheid ermittelt.')).toBeInTheDocument();
    });
  });

  describe('CalculationTable', () => {
    const validBerechnung: FinalOutputStructure['berechnung'] = {
      anspruch_ermittelt_cent: 65000,
      anspruch_bescheid_cent: 50200,
      differenz_cent: 14800,
      positionen: [
        {
          bezeichnung: 'Regelbedarf Stufe 1',
          behoerde_cent: 50200,
          korrekt_cent: 56300,
          abwaegungsgrundlage: '§ 20 SGB II Regelbedarf 2026',
        },
        {
          bezeichnung: 'Mehrbedarf Warmwasser (§ 21 Abs. 7 SGB II)',
          behoerde_cent: 0,
          korrekt_cent: 8700,
          abwaegungsgrundlage: 'Dezentrale Warmwassererzeugung nachgewiesen',
        },
      ],
    };

    it('should render cent-precise comparison between Jobcenter computation and statutory entitlement', () => {
      render(React.createElement(CalculationTable, { berechnung: validBerechnung }));

      expect(screen.getByText('Berechnungskaskade & Anspruchsprüfung')).toBeInTheDocument();
      expect(screen.getByText(/§ 11b SGB II/)).toBeInTheDocument();

      // Authority amount: 50200 cent -> 502,00 €
      expect(screen.getAllByText('502,00 €').length).toBeGreaterThanOrEqual(1);

      // Correct entitlement: 65000 cent -> 650,00 €
      expect(screen.getByText('650,00 €')).toBeInTheDocument();

      // Difference: 14800 cent -> +148,00 €
      expect(screen.getByText('+148,00 €')).toBeInTheDocument();
      expect(screen.getByText('Nachzahlung zu Gunsten des Bürgers')).toBeInTheDocument();
    });

    it('should render negative discrepancy in red when authority overcharged or calculated against citizen', () => {
      const negativeBerechnung: FinalOutputStructure['berechnung'] = {
        anspruch_ermittelt_cent: 40000,
        anspruch_bescheid_cent: 50200,
        differenz_cent: -10200,
        positionen: [
          {
            bezeichnung: 'Zu berücksichtigendes Einkommen',
            behoerde_cent: 50200,
            korrekt_cent: 40000,
            abwaegungsgrundlage: 'Freibetrag § 11b Abs. 3 SGB II fehlerhaft angesetzt',
          },
        ],
      };

      render(React.createElement(CalculationTable, { berechnung: negativeBerechnung }));

      expect(screen.getAllByText('-102,00 €').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Mögliche Überzahlung oder Fehlberechnung')).toBeInTheDocument();
    });

    it('should render table breakdown with exact position deltas and legal bases', () => {
      render(React.createElement(CalculationTable, { berechnung: validBerechnung }));

      expect(screen.getByText('Regelbedarf Stufe 1')).toBeInTheDocument();
      expect(screen.getByText('563,00 €')).toBeInTheDocument();
      expect(screen.getByText('+61,00 €')).toBeInTheDocument();
      expect(screen.getByText('§ 20 SGB II Regelbedarf 2026')).toBeInTheDocument();

      expect(screen.getByText('Mehrbedarf Warmwasser (§ 21 Abs. 7 SGB II)')).toBeInTheDocument();
      expect(screen.getByText('0,00 €')).toBeInTheDocument();
      expect(screen.getByText('87,00 €')).toBeInTheDocument();
      expect(screen.getByText('+87,00 €')).toBeInTheDocument();
      expect(screen.getByText('Dezentrale Warmwassererzeugung nachgewiesen')).toBeInTheDocument();
    });

    it('should render fallback when berechnung is undefined', () => {
      render(React.createElement(CalculationTable, { berechnung: undefined }));
      expect(
        screen.getByText('Keine finanzielle Berechnungsprüfung im Bescheid ermittelt.')
      ).toBeInTheDocument();
    });
  });

  describe('AdversarialReviewCard', () => {
    const validAdversarial: FinalOutputStructure['adversarial_verhaeltnis'] = {
      behoerden_sicht: 'Die Kürzung der Kosten der Unterkunft beruht auf der Richtlinie der Stadt.',
      buerger_sicht: 'Die Mietobergrenzen beruhen nicht auf einem schlüssigen Konzept im Sinne der BSG-Rechtsprechung.',
      risiko_einschaetzung: 'Sehr gute Erfolgsaussichten im Widerspruchs- und Klageverfahren (BSG B 4 AS 8/20 R).',
    };

    it('should render authority, citizen, and risk perspectives', () => {
      render(React.createElement(AdversarialReviewCard, { adversarial: validAdversarial }));

      expect(screen.getByText('Mehrperspektivische Gegenprüfung')).toBeInTheDocument();
      expect(screen.getByText('Position der Behörde (Jobcenter)')).toBeInTheDocument();
      expect(screen.getByText(/Kürzung der Kosten der Unterkunft/)).toBeInTheDocument();

      expect(screen.getByText('Position des Bürgers (Antragsteller)')).toBeInTheDocument();
      expect(screen.getByText(/nicht auf einem schlüssigen Konzept/)).toBeInTheDocument();

      expect(screen.getByText('Risiko- & Erfolgseinschätzung')).toBeInTheDocument();
      expect(screen.getByText(/Sehr gute Erfolgsaussichten/)).toBeInTheDocument();
    });

    it('should filter views when clicking perspective tabs', () => {
      render(React.createElement(AdversarialReviewCard, { adversarial: validAdversarial }));

      // Click "Behörde" tab
      fireEvent.click(screen.getByRole('button', { name: 'Behörde' }));
      expect(screen.getByText('Position der Behörde (Jobcenter)')).toBeInTheDocument();
      expect(screen.queryByText('Position des Bürgers (Antragsteller)')).not.toBeInTheDocument();
      expect(screen.queryByText('Risiko- & Erfolgseinschätzung')).not.toBeInTheDocument();

      // Click "Bürger" tab
      fireEvent.click(screen.getByRole('button', { name: 'Bürger' }));
      expect(screen.queryByText('Position der Behörde (Jobcenter)')).not.toBeInTheDocument();
      expect(screen.getByText('Position des Bürgers (Antragsteller)')).toBeInTheDocument();

      // Click "Risiko" tab
      fireEvent.click(screen.getByRole('button', { name: 'Risiko' }));
      expect(screen.getByText('Risiko- & Erfolgseinschätzung')).toBeInTheDocument();

      // Click "Alle" tab
      fireEvent.click(screen.getByRole('button', { name: 'Alle' }));
      expect(screen.getByText('Position der Behörde (Jobcenter)')).toBeInTheDocument();
      expect(screen.getByText('Position des Bürgers (Antragsteller)')).toBeInTheDocument();
      expect(screen.getByText('Risiko- & Erfolgseinschätzung')).toBeInTheDocument();
    });
  });

  describe('ClaimCard', () => {
    const sampleClaim: Claim = {
      id: 'claim-101',
      claim_text: 'Kürzung der Unterkunftskosten um 120 € ist rechtswidrig mangels Kostensenkungsaufforderung.',
      confidence_score: 0.95,
      claim_type: 'legal_finding',
      evidence_bindings: [
        {
          chunk_id: 'chunk-kdu-01',
          quote_excerpt: 'Die tatsächlichen Aufwendungen für Unterkunft betragen monatlich 540 Euro.',
          binding_strength: 0.94,
          verified: true,
        },
      ],
      user_status: undefined,
    };

    it('should render claim text, claim type badge, confidence score, and verified badge', () => {
      render(React.createElement(ClaimCard, { claim: sampleClaim }));

      expect(screen.getByText(/Kürzung der Unterkunftskosten um 120 € ist rechtswidrig/)).toBeInTheDocument();
      expect(screen.getByText('Rechtliche Würdigung')).toBeInTheDocument();
      expect(screen.getByText('95 % Konfidenz')).toBeInTheDocument();
      expect(screen.getByText('Verifiziert')).toBeInTheDocument();

      // Evidence binding button
      expect(screen.getByText('chunk-kdu-01')).toBeInTheDocument();
      expect(screen.getByText(/Die tatsächlichen Aufwendungen für Unterkunft/)).toBeInTheDocument();
    });

    it('should trigger onSelectCitation callback when clicking evidence citation badge', () => {
      const selectCitationMock = vi.fn();
      render(
        React.createElement(ClaimCard, {
          claim: sampleClaim,
          onSelectCitation: selectCitationMock,
        })
      );

      const citationBtn = screen.getByRole('button', {
        name: /Zitat chunk-kdu-01/,
      });
      fireEvent.click(citationBtn);

      expect(selectCitationMock).toHaveBeenCalledTimes(1);
      expect(selectCitationMock).toHaveBeenCalledWith(sampleClaim.evidence_bindings[0]);
    });
  });

  describe('AnalyzeView Integration & Completion Dossier', () => {
    const mockFinalPayload: AnalysisFinalEventPayload = {
      session_id: 'sess-full-dossier',
      case_run_id: 'case-dossier-42',
      sections: ['ergebnis', 'fristen', 'berechnung'],
      final_output: {
        sachverhalt: 'Der Antragsteller bezieht laufende Leistungen nach dem SGB II.',
        ergebnis: 'Der Bewilligungsbescheid weist erhebliche Berechnungsfehler zu Lasten des Bürgers auf.',
        fristen: {
          bescheid_datum: '2026-11-01',
          zustellungs_fiktion: 'Gilt am 04.11.2026 als bekanntgegeben (§ 37 Abs. 2 SGB X)',
          frist_ende: '2026-12-04',
          feiertags_rollover: false,
          rechtsbehelfsbelehrung_korrekt: true,
          gesetzliche_grundlage: '§ 84 SGG (Monatsfrist)',
        },
        berechnung: {
          anspruch_ermittelt_cent: 65000,
          anspruch_bescheid_cent: 50200,
          differenz_cent: 14800,
          positionen: [
            {
              bezeichnung: 'Regelbedarf Stufe 1',
              behoerde_cent: 50200,
              korrekt_cent: 56300,
              abwaegungsgrundlage: '§ 20 SGB II',
            },
          ],
        },
        adversarial_verhaeltnis: {
          behoerden_sicht: 'Kürzung aufgrund nicht anerkannter Mietkosten.',
          buerger_sicht: 'Mietobergrenze rechtswidrig festgesetzt.',
          risiko_einschaetzung: 'Sehr hohe Erfolgsaussichten.',
        },
      },
      disclosure: {
        version: 'v1.0.0',
        must_display_before: 'results',
        texts: {
          de: 'Dieses Mandatsdossier wurde durch ein KI-System gemäß EU AI Act Art. 50 vorbereitet.',
          en: 'This case dossier was generated by an AI system pursuant to EU AI Act Art. 50.',
        },
      },
      provenance: {
        spec_version: 'citizen-provenance-v1.1',
        generator: 'citizen',
        app_version: '2.0.0',
        model_profile: 'anthropic-sonnet-3.5',
        timestamp_utc: '2026-11-16T19:00:00Z',
        deployment_mode: 'dev',
        modules: [
          {
            id: 'sozialrecht',
            version: '1.4.0',
            parameter_set: 'sgb2-2026',
          },
        ],
      },
    };

    it('should render EU AI Act Art. 50 disclosure notification, provenance badge, and dossier upon streaming completion', async () => {
      render(React.createElement(AnalyzeView));

      // Initially renders Upload dropzone
      expect(screen.getByText('Bescheidprüfung & Evidenzanalyse')).toBeInTheDocument();
      expect(screen.getByText(/Bescheid per Drag & Drop hier ablegen/i)).toBeInTheDocument();

      // Establish pre-existing state by calling the production streamingStore path (Doc 2 §12.1)
      act(() => {
        streamingStore.startConnecting();
        streamingStore.setFinal(mockFinalPayload);
      });

      // Must display Art. 50 disclosure notification before/above findings
      expect(
        screen.getByText(/Dieses Mandatsdossier wurde durch ein KI-System gemäß EU AI Act Art. 50 vorbereitet./)
      ).toBeInTheDocument();

      // Must display Provenance specification
      expect(screen.getByText('citizen-provenance-v1.1')).toBeInTheDocument();
      expect(screen.getByText(/Modell: anthropic-sonnet-3.5/)).toBeInTheDocument();

      // Must display DeadlineBanner
      expect(screen.getByText('04.12.2026')).toBeInTheDocument();
      expect(screen.getByText('§ 84 SGG (Monatsfrist)')).toBeInTheDocument();

      // Must display CalculationTable
      expect(screen.getAllByText('502,00 €').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('650,00 €')).toBeInTheDocument();
      expect(screen.getAllByText('+148,00 €').length).toBeGreaterThanOrEqual(1);

      // Must display Adversarial review
      expect(screen.getByText('Position der Behörde (Jobcenter)')).toBeInTheDocument();
      expect(screen.getByText('Position des Bürgers (Antragsteller)')).toBeInTheDocument();

      // Must display generated claims
      await waitFor(() => {
        expect(screen.getByText(/Ermittelte Rügen & Evidenzbindung/)).toBeInTheDocument();
      });
    });
  });

  describe('CaseDetailView Integration', () => {
    it('should fetch case via CasesService and render full dossier view', async () => {
      const mockCaseDetail = {
        id: 'case-saved-999',
        session_id: 'sess-saved-999',
        title: 'Bürgergeld Änderungsbescheid November 2026',
        status: 'completed' as const,
        created_at: '2026-11-10T14:30:00Z',
        updated_at: '2026-11-10T14:35:00Z',
        input_preview: 'Jobcenter Berlin Mitte, Bescheid über Leistungen…',
        legal_areas: [{ legal_area: 'sozialrecht', is_primary: true }],
        input_text: 'Jobcenter Berlin Mitte, Bescheid über Leistungen zur Sicherung des Lebensunterhalts…',
        final_output: {
          sachverhalt: 'Laufende Leistungen bewilligt, jedoch Abzüge vorgenommen.',
          fristen: {
            bescheid_datum: '2026-11-01',
            zustellungs_fiktion: 'Gilt am 04.11.2026 als bekanntgegeben (§ 37 Abs. 2 SGB X)',
            frist_ende: '2026-12-04',
            feiertags_rollover: false,
            rechtsbehelfsbelehrung_korrekt: true,
            gesetzliche_grundlage: '§ 84 SGG (Monatsfrist)',
          },
          berechnung: {
            anspruch_ermittelt_cent: 65000,
            anspruch_bescheid_cent: 50200,
            differenz_cent: 14800,
            positionen: [],
          },
          adversarial_verhaeltnis: {
            behoerden_sicht: 'Behördensicht hinterlegt.',
            buerger_sicht: 'Bürgersicht hinterlegt.',
            risiko_einschaetzung: 'Geringes Prozessrisiko.',
          },
        },
        stages: [],
        claims: [
          {
            id: 'c-1',
            claim_text: 'Die Heizkosten wurden nicht in tatsächlicher Höhe übernommen.',
            confidence_score: 0.96,
            claim_type: 'legal_finding' as const,
            evidence_bindings: [
              {
                chunk_id: 'chk-hk-1',
                quote_excerpt: 'Heizkosten werden nur bis zur Obergrenze anerkannt.',
                binding_strength: 0.95,
                verified: true,
              },
            ],
            user_status: 'agreed' as const,
          },
        ],
        chat_history: [],
        user_edits: {
          edited_claims: {},
          section_adjudications: {},
        },
      };

      vi.spyOn(CompositionRoot.cases, 'getCase').mockResolvedValue(mockCaseDetail);

      render(React.createElement(CaseDetailView, { caseId: 'case-saved-999' }));

      // Wait for async load
      await waitFor(() => {
        expect(
          screen.getByText('Bürgergeld Änderungsbescheid November 2026')
        ).toBeInTheDocument();
      });

      expect(screen.getByText('Fall-ID: case-saved-999')).toBeInTheDocument();
      expect(screen.getByText('04.12.2026')).toBeInTheDocument();
      expect(screen.getByText('+148,00 €')).toBeInTheDocument();
      expect(
        screen.getByText('Die Heizkosten wurden nicht in tatsächlicher Höhe übernommen.')
      ).toBeInTheDocument();
      expect(screen.getByText('Bestätigt')).toBeInTheDocument();
    });

    it('should display error card with 404 message when case is not found', async () => {
      const notFoundErr = new Error('Case not found');
      (notFoundErr as any).status = 404;
      vi.spyOn(CompositionRoot.cases, 'getCase').mockRejectedValue(notFoundErr);

      const onBackMock = vi.fn();
      render(
        React.createElement(CaseDetailView, {
          caseId: 'non-existent-case',
          onBack: onBackMock,
        })
      );

      await waitFor(() => {
        expect(
          screen.getByText('Der angeforderte Fall existiert nicht oder wurde gelöscht.')
        ).toBeInTheDocument();
      });

      const backBtn = screen.getByRole('button', { name: /Zur Übersicht/i });
      fireEvent.click(backBtn);
      expect(onBackMock).toHaveBeenCalledTimes(1);
    });
  });
});

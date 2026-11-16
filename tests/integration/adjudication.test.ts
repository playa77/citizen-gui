import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CompositionRoot } from '@/compositionRoot';
import { CasesService } from '@/services/cases';
import { EvidenceCitationDrawer } from '@/components/dossier/EvidenceCitationDrawer';
import { ClaimCard } from '@/components/dossier/ClaimCard';
import { CaseArchiveView } from '@/views/CaseArchiveView';
import type { Claim, EvidenceBinding, CaseSummary } from '@/types/domain';

describe('WP-08: Human Adjudication Interface & Citation Slide-Over Drawer [Doc 1 §2.1 FR-06, FR-08, Doc 2 §8.6, §15.3 Call Trace 4]', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('CasesService', () => {
    it('should call GET /api/v1/cases on listRecentCases()', async () => {
      const mockCases: CaseSummary[] = [
        {
          id: 'case-1',
          session_id: 'sess-1',
          title: 'Bescheid 1',
          status: 'completed',
          created_at: '2026-11-16T10:00:00Z',
          updated_at: '2026-11-16T10:05:00Z',
          input_preview: 'Preview text…',
          legal_areas: [{ legal_area: 'sozialrecht', is_primary: true }],
        },
      ];

      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue(mockCases);

      const result = await CompositionRoot.cases.listRecentCases();

      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/cases',
        method: 'GET',
      });
      expect(result).toEqual(mockCases);
    });

    it('should call GET /api/v1/cases/{case_id} on getCase()', async () => {
      const mockDetail = { id: 'case-abc' } as any;
      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue(mockDetail);

      const result = await CompositionRoot.cases.getCase('case-abc');

      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/cases/case-abc',
        method: 'GET',
      });
      expect(result).toEqual(mockDetail);
    });

    it('should call DELETE /api/v1/cases/{case_id} on deleteCase()', async () => {
      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue({ status: 'deleted', id: 'case-del' });

      await CompositionRoot.cases.deleteCase('case-del');

      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/cases/case-del',
        method: 'DELETE',
      });
    });

    it('should call POST /api/v1/cases/{case_id}/adjudicate on adjudicate()', async () => {
      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue(undefined);

      await CompositionRoot.cases.adjudicate('case-adj', {
        target_type: 'claim',
        target_id: 'claim-123',
        status: 'agreed',
        note: 'Stimmt mit Bescheid überein',
      });

      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/cases/case-adj/adjudicate',
        method: 'POST',
        body: {
          target_type: 'claim',
          target_id: 'claim-123',
          status: 'agreed',
          note: 'Stimmt mit Bescheid überein',
        },
      });
    });

    it('should call PATCH /api/v1/cases/{case_id}/claims/{claim_id} on patchClaim()', async () => {
      const updatedClaim = { id: 'claim-patch', claim_text: 'Korrigierter Text' } as any;
      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue(updatedClaim);

      const result = await CompositionRoot.cases.patchClaim(
        'case-patch',
        'claim-patch',
        'Korrigierter Text'
      );

      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/cases/case-patch/claims/claim-patch',
        method: 'PATCH',
        body: { claim_text: 'Korrigierter Text' },
      });
      expect(result).toEqual(updatedClaim);
    });

    it('should call requestBlob on downloadExport()', async () => {
      const fakeBlob = new Blob(['{"case": "data"}'], { type: 'application/json' });
      const blobSpy = vi
        .spyOn(CompositionRoot.http, 'requestBlob')
        .mockResolvedValue(fakeBlob);

      const result = await CompositionRoot.cases.downloadExport('case-exp', 'json');

      expect(blobSpy).toHaveBeenCalledWith({
        url: '/api/v1/cases/case-exp/export',
        method: 'GET',
        params: { format: 'json' },
      });
      expect(result).toEqual(fakeBlob);
    });
  });

  describe('EvidenceCitationDrawer', () => {
    const sampleBinding: EvidenceBinding = {
      chunk_id: 'chunk-bsg-2026-44',
      quote_excerpt: 'Die Angemessenheit der Unterkunftskosten ist nach den tatsächlichen Gegebenheiten des örtlichen Wohnungsmarktes zu bestimmen.',
      binding_strength: 0.92,
      verified: true,
    };

    it('should not render anything when isOpen is false or binding is null', () => {
      const { container: c1 } = render(
        React.createElement(EvidenceCitationDrawer, {
          isOpen: false,
          binding: sampleBinding,
          onClose: vi.fn(),
        })
      );
      expect(c1.firstChild).toBeNull();

      const { container: c2 } = render(
        React.createElement(EvidenceCitationDrawer, {
          isOpen: true,
          binding: null,
          onClose: vi.fn(),
        })
      );
      expect(c2.firstChild).toBeNull();
    });

    it('should render chunk ID, quote excerpt, binding strength, and verification badge when open', () => {
      render(
        React.createElement(EvidenceCitationDrawer, {
          isOpen: true,
          binding: sampleBinding,
          onClose: vi.fn(),
        })
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Evidenz-Zitation')).toBeInTheDocument();
      expect(screen.getByText('chunk-bsg-2026-44')).toBeInTheDocument();
      expect(screen.getByText('92 %')).toBeInTheDocument();
      expect(screen.getByText('Verifiziert')).toBeInTheDocument();
      expect(
        screen.getByText(/Die Angemessenheit der Unterkunftskosten ist nach den tatsächlichen Gegebenheiten/)
      ).toBeInTheDocument();
    });

    it('should call onClose when clicking close button or pressing Escape', () => {
      const onCloseMock = vi.fn();
      render(
        React.createElement(EvidenceCitationDrawer, {
          isOpen: true,
          binding: sampleBinding,
          onClose: onCloseMock,
        })
      );

      // Close button (X)
      const closeButtons = screen.getAllByRole('button', { name: 'Schließen' });
      fireEvent.click(closeButtons[0]!);
      expect(onCloseMock).toHaveBeenCalledTimes(1);

      // Escape key press
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onCloseMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('ClaimCard Human Adjudication (Call Trace 4)', () => {
    const claimToAdjudicate: Claim = {
      id: 'claim-trace4',
      claim_text: 'Kürzung der Regelleistung um 30 % rechtswidrig (§ 31a SGB II).',
      confidence_score: 0.96,
      claim_type: 'legal_finding',
      evidence_bindings: [],
      user_status: undefined,
    };

    it('should dispatch Call Trace 4 upon clicking Zustimmen and update badge to Bestätigt', async () => {
      const onAdjudicateMock = vi.fn().mockResolvedValue(undefined);

      render(
        React.createElement(ClaimCard, {
          claim: claimToAdjudicate,
          onAdjudicate: onAdjudicateMock,
        })
      );

      expect(screen.queryByText('Bestätigt')).not.toBeInTheDocument();

      const agreeBtn = screen.getByRole('button', {
        name: /Diese Feststellung bestätigen/i,
      });
      fireEvent.click(agreeBtn);

      expect(onAdjudicateMock).toHaveBeenCalledWith('claim-trace4', 'agreed');

      await waitFor(() => {
        expect(screen.getByText('Bestätigt')).toBeInTheDocument();
      });
    });

    it('should dispatch Call Trace 4 upon clicking Widersprechen and update badge to Bestritten', async () => {
      const onAdjudicateMock = vi.fn().mockResolvedValue(undefined);

      render(
        React.createElement(ClaimCard, {
          claim: claimToAdjudicate,
          onAdjudicate: onAdjudicateMock,
        })
      );

      expect(screen.queryByText('Bestritten')).not.toBeInTheDocument();

      const disputeBtn = screen.getByRole('button', {
        name: /Dieser Feststellung widersprechen/i,
      });
      fireEvent.click(disputeBtn);

      expect(onAdjudicateMock).toHaveBeenCalledWith('claim-trace4', 'disputed');

      await waitFor(() => {
        expect(screen.getByText('Bestritten')).toBeInTheDocument();
      });
    });

    it('should support inline text editing with Save and Cancel', async () => {
      const onEditMock = vi.fn().mockResolvedValue(undefined);

      render(
        React.createElement(ClaimCard, {
          claim: claimToAdjudicate,
          onEditClaim: onEditMock,
        })
      );

      // Click edit pencil button
      const editBtn = screen.getByRole('button', { name: /Text der Rüge bearbeiten/i });
      fireEvent.click(editBtn);

      // Textarea should appear
      const textarea = screen.getByRole('textbox', { name: /Text der Rüge bearbeiten/i });
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue(claimToAdjudicate.claim_text);

      // Edit text and save
      fireEvent.change(textarea, {
        target: { value: 'Korrektur: Kürzung um 30 % verstößt gegen BVerfG Urteil 2019.' },
      });

      const saveBtn = screen.getByRole('button', { name: 'Speichern' });
      fireEvent.click(saveBtn);

      expect(onEditMock).toHaveBeenCalledWith(
        'claim-trace4',
        'Korrektur: Kürzung um 30 % verstößt gegen BVerfG Urteil 2019.'
      );

      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      });
    });

    it('should revert inline edits when Cancel is clicked', () => {
      const onEditMock = vi.fn();

      render(
        React.createElement(ClaimCard, {
          claim: claimToAdjudicate,
          onEditClaim: onEditMock,
        })
      );

      // Open editor
      fireEvent.click(screen.getByRole('button', { name: /Text der Rüge bearbeiten/i }));
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Ungewollte Änderung' } });

      // Click Abbrechen
      fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

      expect(onEditMock).not.toHaveBeenCalled();
      expect(screen.getByText(claimToAdjudicate.claim_text)).toBeInTheDocument();
    });
  });

  describe('CaseArchiveView', () => {
    const mockCaseList: CaseSummary[] = [
      {
        id: 'case-arch-1',
        session_id: 'sess-arch-1',
        title: 'Jobcenter Berlin Neukölln Bescheid 2026',
        status: 'completed',
        created_at: '2026-11-15T12:00:00Z',
        updated_at: '2026-11-15T12:05:00Z',
        input_preview: 'Sehr geehrte Damen und Herren, anbei der Bescheid…',
        legal_areas: [{ legal_area: 'sozialrecht', is_primary: true }],
      },
      {
        id: 'case-arch-2',
        session_id: 'sess-arch-2',
        title: 'Jobcenter Köln Bescheid',
        status: 'completed',
        created_at: '2026-11-14T09:00:00Z',
        updated_at: '2026-11-14T09:04:00Z',
        input_preview: 'Aufhebung- und Erstattungsbescheid…',
        legal_areas: [{ legal_area: 'sozialrecht', is_primary: true }],
      },
    ];

    it('should load and render cases from CasesService', async () => {
      vi.spyOn(CompositionRoot.cases, 'listRecentCases').mockResolvedValue(mockCaseList);

      const onSelectCaseMock = vi.fn();
      render(
        React.createElement(CaseArchiveView, { onSelectCase: onSelectCaseMock })
      );

      // Loading state initially
      expect(screen.getByText('Fälle werden geladen…')).toBeInTheDocument();

      await waitFor(() => {
        expect(
          screen.getByText('Jobcenter Berlin Neukölln Bescheid 2026')
        ).toBeInTheDocument();
        expect(screen.getByText('Jobcenter Köln Bescheid')).toBeInTheDocument();
      });

      expect(screen.getAllByText('Abgeschlossen')).toHaveLength(2);
      expect(screen.getAllByText('sozialrecht')).toHaveLength(2);

      // Open case action
      const openButtons = screen.getAllByRole('button', { name: /Öffnen/i });
      fireEvent.click(openButtons[0]!);
      expect(onSelectCaseMock).toHaveBeenCalledWith('case-arch-1');
    });

    it('should display empty state when list is empty', async () => {
      vi.spyOn(CompositionRoot.cases, 'listRecentCases').mockResolvedValue([]);

      render(React.createElement(CaseArchiveView));

      await waitFor(() => {
        expect(
          screen.getByText('Keine archivierten Fälle vorhanden')
        ).toBeInTheDocument();
      });
    });

    it('should delete a case and remove it from view', async () => {
      vi.spyOn(CompositionRoot.cases, 'listRecentCases').mockResolvedValue([
        mockCaseList[0]!,
      ]);
      const deleteSpy = vi
        .spyOn(CompositionRoot.cases, 'deleteCase')
        .mockResolvedValue(undefined);

      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(React.createElement(CaseArchiveView));

      await waitFor(() => {
        expect(
          screen.getByText('Jobcenter Berlin Neukölln Bescheid 2026')
        ).toBeInTheDocument();
      });

      const deleteBtn = screen.getByRole('button', {
        name: /Fall Jobcenter Berlin Neukölln Bescheid 2026 löschen/i,
      });
      fireEvent.click(deleteBtn);

      expect(deleteSpy).toHaveBeenCalledWith('case-arch-1');

      await waitFor(() => {
        expect(
          screen.queryByText('Jobcenter Berlin Neukölln Bescheid 2026')
        ).not.toBeInTheDocument();
        expect(
          screen.getByText('Keine archivierten Fälle vorhanden')
        ).toBeInTheDocument();
      });
    });
  });
});

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompositionRoot } from '@/compositionRoot';
import { DocumentService } from '@/services/documents';
import { UnverifiedSlotAlert } from '@/components/documents/UnverifiedSlotAlert';
import { DocumentPreview } from '@/components/documents/DocumentPreview';
import { DocumentGeneratorForm } from '@/components/documents/DocumentGeneratorForm';
import type {
  GeneratorOptionsResponse,
  GenerateDocumentRequest,
  GeneratedDocumentResponse,
} from '@/types/api';
import type { DocumentSlot } from '@/types/domain';

describe('WP-09: Procedural Document Generator & Unverified Slot Alerts [Doc 1 §2.1 FR-07, Doc 2 §8.7, §15.3 Call Trace 5]', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('DocumentService', () => {
    it('should call GET /api/v1/documents/generator-options/{case_run_id} on getOptions()', async () => {
      const mockOptions: GeneratorOptionsResponse = {
        case_run_id: 'case-test-123',
        available_doc_types: [
          {
            doc_type: 'widerspruch',
            title: 'Widerspruch (§ 84 SGG)',
            description: 'Förmlicher Rechtsbehelf.',
          },
          {
            doc_type: 'ueberpruefungsantrag_44',
            title: 'Überprüfungsantrag (§ 44 SGB X)',
            description: 'Korrektur bestandskräftiger Bescheide.',
          },
        ],
        frist_info: {
          datum: '2026-12-15',
          ist_jahresfrist: false,
        },
        user_slots_required: ['name', 'adresse', 'aktenzeichen'],
      };

      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue(mockOptions);

      const result = await CompositionRoot.documents.getOptions('case-test-123');

      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/documents/generator-options/case-test-123',
        method: 'GET',
      });
      expect(result).toEqual(mockOptions);
    });

    it('should call POST /api/v1/documents/generate on generate()', async () => {
      const req: GenerateDocumentRequest = {
        case_run_id: 'case-test-123',
        doc_type: 'widerspruch',
        user_data: {
          name: 'Max Mustermann',
          adresse: 'Musterstraße 1, 10115 Berlin',
          aktenzeichen: 'BG-123/26',
        },
      };

      const mockDoc: GeneratedDocumentResponse = {
        doc_type: 'widerspruch',
        title: 'Widerspruch gegen den Bescheid vom 10.11.2026',
        rendered_text: '# Widerspruch\n\nHiermit lege ich Widerspruch ein.',
        slots: [
          { key: 'name', value: 'Max Mustermann', verified: true, needs_review: false },
        ],
        generation_metadata: {
          selected_by: 'user',
          frist_am: '2026-12-15',
        },
        provenance: {
          spec_version: 'citizen-provenance-v1.1',
          generator: 'citizen',
          app_version: '2.0.0',
          model_profile: 'eu-avv',
          timestamp_utc: '2026-11-16T12:00:00Z',
          deployment_mode: 'dev',
          modules: [{ id: 'sozialrecht', version: '1.0.0', parameter_set: '1.0.0' }],
        },
      };

      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue(mockDoc);

      const result = await CompositionRoot.documents.generate(req);

      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/documents/generate',
        method: 'POST',
        body: req,
      });
      expect(result).toEqual(mockDoc);
    });
  });

  describe('UnverifiedSlotAlert', () => {
    it('should return null when all slots are verified and no [BITTE PRÜFEN] in text', () => {
      const slots: DocumentSlot[] = [
        { key: 'name', value: 'Erika Muster', verified: true, needs_review: false },
        { key: 'anspruch', value: '650,00 €', verified: true, needs_review: false },
      ];

      const { container } = render(
        React.createElement(UnverifiedSlotAlert, {
          slots,
          renderedText: 'Alles geprüft und belegt.',
        })
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render amber alert with slot keys when slots are unverified', () => {
      const slots: DocumentSlot[] = [
        { key: 'name', value: 'Erika Muster', verified: true, needs_review: false },
        {
          key: 'unterkunftskosten_differenz',
          value: '[BITTE PRÜFEN]',
          verified: false,
          needs_review: true,
        },
      ];

      render(
        React.createElement(UnverifiedSlotAlert, {
          slots,
          renderedText: 'Der Betrag von [BITTE PRÜFEN: unterkunftskosten_differenz] ist einzusetzen.',
        })
      );

      expect(
        screen.getByRole('alert', { name: /Warnung vor ungeprüften Datenfeldern/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/1 ungeprüftes Datenfeld/i)).toBeInTheDocument();
      expect(screen.getByText('unterkunftskosten_differenz:')).toBeInTheDocument();
      expect(screen.getByText('[BITTE PRÜFEN]')).toBeInTheDocument();
    });

    it('should extract unverified patterns directly from renderedText if slots array is empty', () => {
      const text =
        'Sehr geehrte Damen und Herren,\n' +
        'der Bescheid enthält Fehler bzgl. [BITTE PRÜFEN: Heizkostenabrechnung 2025].';

      render(
        React.createElement(UnverifiedSlotAlert, {
          slots: [],
          renderedText: text,
        })
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText('[BITTE PRÜFEN: Heizkostenabrechnung 2025]')
      ).toBeInTheDocument();
    });
  });

  describe('DocumentPreview', () => {
    const mockDoc: GeneratedDocumentResponse = {
      doc_type: 'widerspruch',
      title: 'Widerspruch gegen den Bescheid vom 10.11.2026',
      rendered_text:
        '# Widerspruch\n\n' +
        'Sehr geehrte Damen und Herren,\n\n' +
        'hiermit lege ich Widerspruch ein gegen Ihren Bescheid.\n\n' +
        'Die Unterkunftskosten wurden mit [BITTE PRÜFEN: Betrag nicht lesbar] zu niedrig bemessen.\n\n' +
        'Mit freundlichen Grüßen,\n' +
        'Erika Muster',
      slots: [
        {
          key: 'kosten_der_unterkunft',
          value: '[BITTE PRÜFEN]',
          verified: false,
          needs_review: true,
        },
      ],
      generation_metadata: {
        selected_by: 'user',
        frist_am: '2026-12-10',
      },
      provenance: {
        spec_version: 'citizen-provenance-v1.1',
        generator: 'citizen',
        app_version: '2.0.0',
        model_profile: 'eu-avv',
        timestamp_utc: '2026-11-16T14:00:00Z',
        deployment_mode: 'dev',
        modules: [{ id: 'sozialrecht', version: '1.0.0', parameter_set: '2026-Q1' }],
      },
    };

    it('should render document title, markdown content, and unverified slot alert', () => {
      render(React.createElement(DocumentPreview, { document: mockDoc }));

      expect(
        screen.getByText('Widerspruch gegen den Bescheid vom 10.11.2026')
      ).toBeInTheDocument();
      expect(screen.getByText('hiermit lege ich Widerspruch ein gegen Ihren Bescheid.')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/1 ungeprüftes Datenfeld/i)).toBeInTheDocument();
    });

    it('should render EU AI Act Art. 50(2) machine-readable provenance metadata', () => {
      render(React.createElement(DocumentPreview, { document: mockDoc }));

      const provRegion = screen.getByRole('region', {
        name: /EU AI Act Art\. 50\(2\) Provenienzangaben/i,
      });
      expect(provRegion).toBeInTheDocument();
      expect(provRegion).toHaveTextContent('citizen-provenance-v1.1');
      expect(provRegion).toHaveTextContent('Generator: citizen');
      expect(provRegion).toHaveTextContent('Modellprofil: eu-avv');
      expect(provRegion).toHaveTextContent('sozialrecht (1.0.0)');
    });

    it('should copy document text to clipboard when Kopieren button is clicked', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      render(React.createElement(DocumentPreview, { document: mockDoc }));

      const copyBtn = screen.getByRole('button', {
        name: /Schriftsatz in die Zwischenablage kopieren/i,
      });
      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith(mockDoc.rendered_text);
        expect(screen.getByText('Kopiert!')).toBeInTheDocument();
      });
    });

    it('should invoke window.print when PDF drucken button is clicked', () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

      render(React.createElement(DocumentPreview, { document: mockDoc }));

      const printBtn = screen.getByRole('button', {
        name: /Schriftsatz drucken oder als PDF speichern/i,
      });
      fireEvent.click(printBtn);

      expect(printSpy).toHaveBeenCalledTimes(1);
    });

    it('should trigger onEditUserData callback when button is clicked', () => {
      const onEditMock = vi.fn();
      render(
        React.createElement(DocumentPreview, {
          document: mockDoc,
          onEditUserData: onEditMock,
        })
      );

      const editBtn = screen.getByRole('button', { name: /Angaben bearbeiten/i });
      fireEvent.click(editBtn);

      expect(onEditMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('DocumentGeneratorForm (Call Trace 5)', () => {
    const mockOptions: GeneratorOptionsResponse = {
      case_run_id: 'case-ct5',
      available_doc_types: [
        {
          doc_type: 'widerspruch',
          title: 'Widerspruch (§ 84 SGG)',
          description: 'Förmlicher Rechtsbehelf gegen den Bescheid.',
        },
        {
          doc_type: 'akteneinsichtsantrag_25',
          title: 'Akteneinsichtsantrag (§ 25 SGB X)',
          description: 'Einsicht in die behördliche Leistungsakte.',
        },
      ],
      frist_info: {
        datum: '2026-12-10',
        ist_jahresfrist: false,
      },
      user_slots_required: ['name', 'adresse', 'aktenzeichen'],
    };

    const mockGeneratedDoc: GeneratedDocumentResponse = {
      doc_type: 'widerspruch',
      title: 'Widerspruch zur Leistungsberechnung',
      rendered_text:
        '# Widerspruch\n\n' +
        'Absender: Max Mustermann, Berliner Str. 5, 10115 Berlin\n' +
        'Aktenzeichen: BG-999\n\n' +
        'Hiermit widerspreche ich.',
      slots: [],
      generation_metadata: { selected_by: 'user', frist_am: '2026-12-10' },
      provenance: {
        spec_version: 'citizen-provenance-v1.1',
        generator: 'citizen',
        app_version: '2.0.0',
        model_profile: 'eu-avv',
        timestamp_utc: '2026-11-16T15:00:00Z',
        deployment_mode: 'dev',
        modules: [{ id: 'sozialrecht', version: '1.0.0', parameter_set: '1.0.0' }],
      },
    };

    it('should load options, accept personal details, and generate document on submit', async () => {
      vi.spyOn(CompositionRoot.documents, 'getOptions').mockResolvedValue(mockOptions);
      const generateSpy = vi
        .spyOn(CompositionRoot.documents, 'generate')
        .mockResolvedValue(mockGeneratedDoc);

      const onGeneratedMock = vi.fn();

      render(
        React.createElement(DocumentGeneratorForm, {
          caseRunId: 'case-ct5',
          deadlineDate: '2026-12-10',
          onDocumentGenerated: onGeneratedMock,
        })
      );

      // Verify options are displayed
      await waitFor(() => {
        expect(screen.getByText('Widerspruch (§ 84 SGG)')).toBeInTheDocument();
        expect(screen.getByText('Akteneinsichtsantrag (§ 25 SGB X)')).toBeInTheDocument();
      });

      // Submit button should be disabled until required inputs are filled
      const submitBtn = screen.getByRole('button', { name: /Entwurf erstellen/i });
      expect(submitBtn).toBeDisabled();

      // Enter citizen personal details
      const nameInput = screen.getByLabelText(/Vollständiger Name/i);
      const adresseInput = screen.getByLabelText(/Anschrift/i);
      const azInput = screen.getByLabelText(/Aktenzeichen/i);

      fireEvent.change(nameInput, { target: { value: 'Max Mustermann' } });
      fireEvent.change(adresseInput, { target: { value: 'Berliner Str. 5, 10115 Berlin' } });
      fireEvent.change(azInput, { target: { value: 'BG-999' } });

      // Button should now be enabled
      expect(submitBtn).not.toBeDisabled();

      // Submit form
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(generateSpy).toHaveBeenCalledWith({
          case_run_id: 'case-ct5',
          doc_type: 'widerspruch',
          user_data: {
            name: 'Max Mustermann',
            adresse: 'Berliner Str. 5, 10115 Berlin',
            aktenzeichen: 'BG-999',
          },
        });
        expect(onGeneratedMock).toHaveBeenCalledWith(mockGeneratedDoc);
      });

      // UI should transition to preview
      await waitFor(() => {
        expect(screen.getByText('Widerspruch zur Leistungsberechnung')).toBeInTheDocument();
        expect(screen.getByText(/Absender: Max Mustermann/i)).toBeInTheDocument();
      });

      // Clicking 'Angaben bearbeiten' returns to the input form
      const editBtn = screen.getByRole('button', { name: /Angaben bearbeiten/i });
      fireEvent.click(editBtn);

      await waitFor(() => {
        expect(screen.getByLabelText(/Vollständiger Name/i)).toHaveValue('Max Mustermann');
      });
    });

    it('should display error message when document generation fails', async () => {
      vi.spyOn(CompositionRoot.documents, 'getOptions').mockResolvedValue(mockOptions);
      vi.spyOn(CompositionRoot.documents, 'generate').mockRejectedValue(
        new Error('Vorlagengenerator temporär nicht erreichbar.')
      );

      render(React.createElement(DocumentGeneratorForm, { caseRunId: 'case-ct5' }));

      await waitFor(() => {
        expect(screen.getByText('Widerspruch (§ 84 SGG)')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Vollständiger Name/i), {
        target: { value: 'Max Mustermann' },
      });
      fireEvent.change(screen.getByLabelText(/Anschrift/i), {
        target: { value: 'Berliner Str. 5, 10115 Berlin' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Entwurf erstellen/i }));

      await waitFor(() => {
        expect(
          screen.getByText('Vorlagengenerator temporär nicht erreichbar.')
        ).toBeInTheDocument();
      });
    });
  });
});

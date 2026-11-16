import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompositionRoot } from '@/compositionRoot';
import { ConversationService } from '@/services/conversations';
import { IntakeService } from '@/services/intake';
import { DocumentAttachmentList } from '@/components/conversations/DocumentAttachmentList';
import { ChatWindow } from '@/components/conversations/ChatWindow';
import { TurnCounter } from '@/components/intake/TurnCounter';
import { IntakeWizard } from '@/components/intake/IntakeWizard';
import { ConversationView } from '@/views/ConversationView';
import { IntakeView } from '@/views/IntakeView';
import type {
  ConversationSummary,
  ConversationDetail,
  AttachedDocument,
  IntakeSession,
  IntakeResult,
} from '@/types/api';

describe('WP-10: Conversations (Chat-First) & Multi-Turn Intake Wizards [Doc 1 §2.1 FR-09, Doc 2 §6.2, CITIZEN-API §8.2, §8.5]', () => {
  beforeEach(() => {
    window.localStorage.clear();
    CompositionRoot.prefs.setDevMode(false);
    vi.restoreAllMocks();
  });

  describe('ConversationService', () => {
    it('should call POST /api/v1/conversations on createConversation without file', async () => {
      const mockDetail: ConversationDetail = {
        id: 'conv-101',
        title: 'Mietrecht Vorprüfung',
        created_at: '2026-11-16T14:00:00Z',
        updated_at: '2026-11-16T14:00:00Z',
        messages: [],
        documents: [],
      };

      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue(mockDetail);

      const result = await CompositionRoot.conversations.createConversation('Mietrecht Vorprüfung');

      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/conversations',
        method: 'POST',
        body: { title: 'Mietrecht Vorprüfung' },
      });
      expect(result).toEqual(mockDetail);
    });

    it('should call POST /api/v1/conversations with FormData and X-Document-Tag in dev mode', async () => {
      CompositionRoot.prefs.setDevMode(true);
      CompositionRoot.prefs.setDevDocumentTag('synthetic');

      const mockDetail: ConversationDetail = {
        id: 'conv-file-102',
        title: 'Bescheid-Upload',
        created_at: '2026-11-16T14:00:00Z',
        updated_at: '2026-11-16T14:00:00Z',
        messages: [],
        documents: [
          {
            id: 'doc-1',
            original_filename: 'bescheid.pdf',
            created_at: '2026-11-16T14:00:00Z',
          },
        ],
      };

      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue(mockDetail);

      const file = new File(['dummy-content'], 'bescheid.pdf', { type: 'application/pdf' });
      const result = await CompositionRoot.conversations.createConversation('Bescheid-Upload', file);

      expect(requestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/v1/conversations',
          method: 'POST',
          headers: expect.objectContaining({ 'X-Document-Tag': 'synthetic' }),
        })
      );
      expect(result).toEqual(mockDetail);
    });

    it('should call GET /api/v1/conversations on listConversations()', async () => {
      const mockList: ConversationSummary[] = [
        {
          id: 'conv-1',
          title: 'Fall 1',
          created_at: '2026-11-16T10:00:00Z',
          updated_at: '2026-11-16T10:05:00Z',
          message_count: 2,
          document_count: 1,
        },
      ];

      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue(mockList);

      const result = await CompositionRoot.conversations.listConversations();

      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/conversations',
        method: 'GET',
      });
      expect(result).toEqual(mockList);
    });

    it('should call GET /api/v1/conversations/{id} on getConversation()', async () => {
      const mockDetail: ConversationDetail = {
        id: 'conv-abc',
        title: 'Detail Chat',
        created_at: '2026-11-16T10:00:00Z',
        updated_at: '2026-11-16T10:05:00Z',
        messages: [],
        documents: [],
      };

      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue(mockDetail);

      const result = await CompositionRoot.conversations.getConversation('conv-abc');

      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/conversations/conv-abc',
        method: 'GET',
      });
      expect(result).toEqual(mockDetail);
    });

    it('should call DELETE /api/v1/conversations/{id} on deleteConversation()', async () => {
      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue({ status: 'deleted', id: 'conv-del' });

      const result = await CompositionRoot.conversations.deleteConversation('conv-del');

      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/conversations/conv-del',
        method: 'DELETE',
      });
      expect(result).toEqual({ status: 'deleted', id: 'conv-del' });
    });

    it('should call POST /api/v1/conversations/{id}/documents on attachDocument()', async () => {
      const mockDoc: AttachedDocument = {
        id: 'doc-99',
        original_filename: 'anlage.pdf',
        created_at: '2026-11-16T12:00:00Z',
      };

      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue(mockDoc);

      const file = new File(['text'], 'anlage.pdf', { type: 'application/pdf' });
      const result = await CompositionRoot.conversations.attachDocument('conv-att', file);

      expect(requestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/v1/conversations/conv-att/documents',
          method: 'POST',
        })
      );
      expect(result).toEqual(mockDoc);
    });

    it('should call DELETE /api/v1/conversations/{id}/documents/{docId} on deleteDocument()', async () => {
      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue({ status: 'deleted', id: 'doc-del' });

      await CompositionRoot.conversations.deleteDocument('conv-1', 'doc-del');

      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/conversations/conv-1/documents/doc-del',
        method: 'DELETE',
      });
    });

    it('should connect SSE stream on sendMessageStream() and dispatch events', async () => {
      const connectSpy = vi
        .spyOn(CompositionRoot.sse, 'connect')
        .mockImplementation(async (options) => {
          options.onEvent({
            event: 'token',
            data: JSON.stringify({ type: 'token', text: 'Guten ' }),
          });
          options.onEvent({
            event: 'token',
            data: JSON.stringify({ type: 'token', text: 'Tag!' }),
          });
          options.onEvent({
            event: 'done',
            data: JSON.stringify({
              type: 'done',
              full_response: 'Guten Tag!',
              disclosure: {
                version: '1.0',
                must_display_before: 'results',
                texts: { de: 'KI-System' },
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
            }),
          });
        });

      const onTokenMock = vi.fn();
      const onDoneMock = vi.fn();

      await CompositionRoot.conversations.sendMessageStream('conv-stream-1', 'Hallo!', {
        onToken: onTokenMock,
        onDone: onDoneMock,
      });

      expect(connectSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/v1/conversations/conv-stream-1/messages',
          method: 'POST',
          body: { content: 'Hallo!' },
        })
      );
      expect(onTokenMock).toHaveBeenCalledWith('Guten ');
      expect(onTokenMock).toHaveBeenCalledWith('Tag!');
      expect(onDoneMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'done', full_response: 'Guten Tag!' })
      );
    });
  });

  describe('IntakeService', () => {
    it('should call POST /api/v1/intake/start on start()', async () => {
      const mockSession: IntakeSession = {
        id: 'intake-1',
        session_id: 'client-sess-1',
        state: 'active',
        turn_count: 0,
        max_turns: 8,
        messages: [],
        question: 'Wann ist Ihnen der Bescheid zugegangen?',
      };

      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue(mockSession);

      const result = await CompositionRoot.intake.start({
        initial_text: 'Bescheid erhalten über Bürgergeld-Kürzung.',
        max_turns: 8,
      });

      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/intake/start',
        method: 'POST',
        body: {
          initial_text: 'Bescheid erhalten über Bürgergeld-Kürzung.',
          max_turns: 8,
        },
      });
      expect(result).toEqual(mockSession);
    });

    it('should call POST /api/v1/intake/{id}/message on sendMessage()', async () => {
      const mockUpdatedSession: IntakeSession = {
        id: 'intake-1',
        session_id: 'client-sess-1',
        state: 'active',
        turn_count: 1,
        max_turns: 8,
        messages: [
          { role: 'user', content: 'Am 05.11.2026.' },
        ],
        question: 'Wurde eine Rechtsbehelfsbelehrung beigefügt?',
      };

      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue(mockUpdatedSession);

      const result = await CompositionRoot.intake.sendMessage('intake-1', 'Am 05.11.2026.');

      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/intake/intake-1/message',
        method: 'POST',
        body: { message: 'Am 05.11.2026.' },
      });
      expect(result).toEqual(mockUpdatedSession);
    });

    it('should call GET /api/v1/intake/{id} on getSession()', async () => {
      const mockSession: IntakeSession = {
        id: 'intake-get',
        session_id: 'sess-g',
        state: 'active',
        turn_count: 2,
        max_turns: 8,
        messages: [],
      };

      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue(mockSession);

      const result = await CompositionRoot.intake.getSession('intake-get');

      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/intake/intake-get',
        method: 'GET',
      });
      expect(result).toEqual(mockSession);
    });

    it('should call POST /api/v1/intake/{id}/restart on restart()', async () => {
      const mockReset: IntakeSession = {
        id: 'intake-rst',
        session_id: 'sess-rst',
        state: 'active',
        turn_count: 0,
        max_turns: 8,
        messages: [],
      };

      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue(mockReset);

      const result = await CompositionRoot.intake.restart('intake-rst');

      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/intake/intake-rst/restart',
        method: 'POST',
      });
      expect(result).toEqual(mockReset);
    });

    it('should call POST /api/v1/intake/{id}/confirm on confirm()', async () => {
      const mockResult: IntakeResult = {
        legal_areas: ['sozialrecht'],
        summary: 'Aufhebungsbescheid Bürgergeld mit strittigen Heizkosten.',
        key_facts: { bescheiddatum: '2026-11-01', differenz: '150 Euro' },
        open_questions: [],
      };

      const requestSpy = vi
        .spyOn(CompositionRoot.http, 'request')
        .mockResolvedValue(mockResult);

      const result = await CompositionRoot.intake.confirm('intake-conf');

      expect(requestSpy).toHaveBeenCalledWith({
        url: '/api/v1/intake/intake-conf/confirm',
        method: 'POST',
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('TurnCounter', () => {
    it('should render turn count, max turns, and progress percentage', () => {
      render(React.createElement(TurnCounter, { turnCount: 3, maxTurns: 8 }));

      expect(screen.getByText('Frage 3 von 8')).toBeInTheDocument();
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '3');
      expect(progressbar).toHaveAttribute('aria-valuemax', '8');
    });

    it('should display warning note when near turn limit', () => {
      render(React.createElement(TurnCounter, { turnCount: 7, maxTurns: 8 }));

      expect(
        screen.getByText(/Das Interview nähert sich dem Abschluss/i)
      ).toBeInTheDocument();
    });
  });

  describe('DocumentAttachmentList', () => {
    const mockDocuments: AttachedDocument[] = [
      {
        id: 'doc-1',
        original_filename: 'Bescheid_November.pdf',
        created_at: '2026-11-16T12:00:00Z',
      },
      {
        id: 'doc-2',
        original_filename: 'Heizkostenabrechnung.pdf',
        created_at: '2026-11-16T12:05:00Z',
      },
    ];

    it('should render document list with filenames', () => {
      render(
        React.createElement(DocumentAttachmentList, {
          documents: mockDocuments,
          onAttachDocument: vi.fn(),
          onDeleteDocument: vi.fn(),
        })
      );

      expect(screen.getByText('Angehängte Dokumente (2)')).toBeInTheDocument();
      expect(screen.getByText('Bescheid_November.pdf')).toBeInTheDocument();
      expect(screen.getByText('Heizkostenabrechnung.pdf')).toBeInTheDocument();
    });

    it('should invoke onDeleteDocument when trash button is clicked', async () => {
      const onDeleteMock = vi.fn().mockResolvedValue(undefined);

      render(
        React.createElement(DocumentAttachmentList, {
          documents: mockDocuments,
          onAttachDocument: vi.fn(),
          onDeleteDocument: onDeleteMock,
        })
      );

      const delBtn = screen.getByRole('button', {
        name: /Dokument Bescheid_November\.pdf entfernen/i,
      });
      fireEvent.click(delBtn);

      expect(onDeleteMock).toHaveBeenCalledWith('doc-1');
    });
  });

  describe('ChatWindow', () => {
    it('should render message list and allow user message submission', async () => {
      const messages = [
        {
          id: 'm-1',
          role: 'user' as const,
          content: 'Ist der Bescheid vom 10.11.2026 fehlerhaft?',
          created_at: '2026-11-16T14:00:00Z',
        },
        {
          id: 'm-2',
          role: 'assistant' as const,
          content: 'Ja, bei den Unterkunftskosten wurden Abzüge vorgenommen.',
          created_at: '2026-11-16T14:01:00Z',
          disclosure: {
            version: '1.0',
            must_display_before: 'results',
            texts: { de: 'KI-generierte Rechtsanalyse' },
          },
          provenance: {
            spec_version: 'citizen-provenance-v1.1',
            generator: 'citizen',
            app_version: '2.0.0',
            model_profile: 'eu-avv',
            timestamp_utc: '2026-11-16T14:01:00Z',
            deployment_mode: 'dev',
            modules: [],
          },
        },
      ];

      const onSendMock = vi.fn().mockResolvedValue(undefined);

      render(
        React.createElement(ChatWindow, {
          messages,
          onSendMessage: onSendMock,
        })
      );

      // Verify messages rendered
      expect(screen.getByText('Ist der Bescheid vom 10.11.2026 fehlerhaft?')).toBeInTheDocument();
      expect(
        screen.getByText('Ja, bei den Unterkunftskosten wurden Abzüge vorgenommen.')
      ).toBeInTheDocument();
      expect(screen.getByText('KI-generierte Rechtsanalyse')).toBeInTheDocument();
      expect(screen.getByText(/Provenienz: citizen-provenance-v1.1/i)).toBeInTheDocument();

      // Submit new message
      const input = screen.getByRole('textbox', { name: /Nachricht an den Rechtsassistenten/i });
      fireEvent.change(input, { target: { value: 'Welche Frist gilt hier?' } });

      const sendBtn = screen.getByRole('button', { name: /Nachricht senden/i });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(onSendMock).toHaveBeenCalledWith('Welche Frist gilt hier?');
      });
    });

    it('should render streaming tokens and current stage indicator while isStreaming is true', () => {
      render(
        React.createElement(ChatWindow, {
          messages: [],
          onSendMessage: vi.fn(),
          isStreaming: true,
          streamingTokens: 'Die Frist beträgt einen Monat ab Bekanntgabe.',
          currentStageName: 'calculation_check',
        })
      );

      expect(screen.getByText('Pipeline-Stufe: calculation_check')).toBeInTheDocument();
      expect(
        screen.getByText(/Die Frist beträgt einen Monat ab Bekanntgabe\./i)
      ).toBeInTheDocument();
    });
  });

  describe('IntakeWizard', () => {
    it('should execute full interview lifecycle: start -> answer -> confirm -> done', async () => {
      const mockStartSession: IntakeSession = {
        id: 'intake-life-1',
        session_id: 'client-sess-life',
        state: 'active',
        turn_count: 0,
        max_turns: 4,
        messages: [],
        question: 'Wann ging Ihnen der Bescheid zu?',
      };

      const mockAnswerSession: IntakeSession = {
        id: 'intake-life-1',
        session_id: 'client-sess-life',
        state: 'active',
        turn_count: 1,
        max_turns: 4,
        messages: [{ role: 'user', content: 'Gestern mit der Post.' }],
        question: 'Worum geht es inhaltlich bei der Kürzung?',
      };

      const mockFinalResult: IntakeResult = {
        legal_areas: ['sozialrecht'],
        summary: 'Kürzung der Leistungen für Unterkunft und Heizung nach § 22 SGB II.',
        key_facts: { zugangsdatum: '2026-11-15' },
        open_questions: [],
      };

      const startSpy = vi
        .spyOn(CompositionRoot.intake, 'start')
        .mockResolvedValue(mockStartSession);
      const sendSpy = vi
        .spyOn(CompositionRoot.intake, 'sendMessage')
        .mockResolvedValue(mockAnswerSession);
      const confirmSpy = vi
        .spyOn(CompositionRoot.intake, 'confirm')
        .mockResolvedValue(mockFinalResult);

      const onCompleteMock = vi.fn();
      const onStartAnalysisMock = vi.fn();

      render(
        React.createElement(IntakeWizard, {
          onComplete: onCompleteMock,
          onStartAnalysis: onStartAnalysisMock,
        })
      );

      // Step 1: Start
      expect(screen.getByText('Geführte Erstberatung & Sachverhaltserfassung')).toBeInTheDocument();
      const initTextarea = screen.getByLabelText(/Ihr Anliegen oder Ausgangssachverhalt/i);
      fireEvent.change(initTextarea, {
        target: { value: 'Ich habe einen Bescheid erhalten mit Abzügen bei der Miete.' },
      });

      const startBtn = screen.getByRole('button', { name: /Interview starten/i });
      fireEvent.click(startBtn);

      await waitFor(() => {
        expect(startSpy).toHaveBeenCalled();
      });

      // Step 2: Answering questions
      await waitFor(() => {
        expect(screen.getByText('Wann ging Ihnen der Bescheid zu?')).toBeInTheDocument();
      });

      const answerInput = screen.getByLabelText(/Ihre Antwort/i);
      fireEvent.change(answerInput, { target: { value: 'Gestern mit der Post.' } });

      const answerBtn = screen.getByRole('button', { name: /Antwort senden/i });
      fireEvent.click(answerBtn);

      await waitFor(() => {
        expect(sendSpy).toHaveBeenCalledWith('intake-life-1', 'Gestern mit der Post.');
      });

      // Step 3: Early Confirm
      await waitFor(() => {
        expect(screen.getByText('Worum geht es inhaltlich bei der Kürzung?')).toBeInTheDocument();
      });

      const confirmBtn = screen.getByRole('button', { name: /Vorzeitig abschließen/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalledWith('intake-life-1');
        expect(onCompleteMock).toHaveBeenCalledWith(mockFinalResult);
      });

      // Step 4: Done view
      await waitFor(() => {
        expect(screen.getByText('Erstberatung abgeschlossen')).toBeInTheDocument();
        expect(screen.getByText('sozialrecht')).toBeInTheDocument();
        expect(
          screen.getByText(/Kürzung der Leistungen für Unterkunft und Heizung/i)
        ).toBeInTheDocument();
      });

      // Click 'Zur Bescheidprüfung übernehmen'
      const takeOverBtn = screen.getByRole('button', { name: /Zur Bescheidprüfung übernehmen/i });
      fireEvent.click(takeOverBtn);
      expect(onStartAnalysisMock).toHaveBeenCalledWith(mockFinalResult);
    });
  });

  describe('ConversationView Integration', () => {
    it('should list conversations and display active conversation with attachments', async () => {
      const mockList: ConversationSummary[] = [
        {
          id: 'conv-int-1',
          title: 'Erster Beratungsfall',
          created_at: '2026-11-16T12:00:00Z',
          updated_at: '2026-11-16T12:00:00Z',
          message_count: 1,
          document_count: 1,
        },
      ];

      const mockDetail: ConversationDetail = {
        id: 'conv-int-1',
        title: 'Erster Beratungsfall',
        created_at: '2026-11-16T12:00:00Z',
        updated_at: '2026-11-16T12:00:00Z',
        messages: [
          {
            role: 'assistant',
            content: 'Wie kann ich Ihnen bei diesem Bescheid behilflich sein?',
            created_at: '2026-11-16T12:00:00Z',
          },
        ],
        documents: [
          {
            id: 'doc-int-1',
            original_filename: 'bescheid_volltext.pdf',
            created_at: '2026-11-16T12:00:00Z',
          },
        ],
      };

      vi.spyOn(CompositionRoot.conversations, 'listConversations').mockResolvedValue(mockList);
      vi.spyOn(CompositionRoot.conversations, 'getConversation').mockResolvedValue(mockDetail);

      render(React.createElement(ConversationView));

      await waitFor(() => {
        expect(screen.getByText('Erster Beratungsfall')).toBeInTheDocument();
        expect(screen.getByText('bescheid_volltext.pdf')).toBeInTheDocument();
        expect(
          screen.getByText('Wie kann ich Ihnen bei diesem Bescheid behilflich sein?')
        ).toBeInTheDocument();
      });
    });
  });

  describe('IntakeView Integration', () => {
    it('should mount IntakeWizard and render statutory disclaimer boundary notice', () => {
      render(React.createElement(IntakeView));

      expect(
        screen.getByText('Mandatsvorbereitung & Erstberatungs-Assistent')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Rechtsinformation nach § 2 Abs\. 1 RDG\. Keine anwaltliche Beratung\./i)
      ).toBeInTheDocument();
      expect(
        screen.getByText('Geführte Erstberatung & Sachverhaltserfassung')
      ).toBeInTheDocument();
    });
  });
});

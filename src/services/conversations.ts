import type { HttpClient } from './http';
import type { SseClient } from './sse';
import type { LocalPreferencesStore } from '@/stores/localPreferences';
import type {
  ConversationSummary,
  ConversationDetail,
  AttachedDocument,
  SendMessageRequest,
} from '@/types/api';

export interface MessageStreamCallbacks {
  onToken?: (token: string) => void;
  onStage?: (stageEvent: Record<string, unknown>) => void;
  onDone?: (finalEvent: Record<string, unknown>) => void;
  onError?: (err: Error) => void;
}

/**
 * Service for managing chat-first conversation workflows and document attachments.
 * [Doc 1 §2.1 FR-09, Doc 2 §6.2, CITIZEN-API §8.5]
 */
export class ConversationService {
  constructor(
    private readonly http: HttpClient,
    private readonly sse: SseClient,
    private readonly prefs?: LocalPreferencesStore
  ) {}

  /**
   * Creates a new conversation, optionally with an initial title and/or uploaded document.
   */
  public async createConversation(
    title?: string,
    file?: File
  ): Promise<ConversationDetail> {
    if (file) {
      const formData = new FormData();
      if (title) formData.append('title', title);
      formData.append('file', file);

      const headers: Record<string, string> = {};
      if (this.prefs?.isDevMode()) {
        headers['X-Document-Tag'] = this.prefs.getDevDocumentTag() || 'synthetic';
      }

      return this.http.request<ConversationDetail>({
        url: '/api/v1/conversations',
        method: 'POST',
        body: formData,
        headers,
      });
    }

    return this.http.request<ConversationDetail>({
      url: '/api/v1/conversations',
      method: 'POST',
      body: title ? { title } : {},
    });
  }

  /**
   * Retrieves the list of recent conversations.
   */
  public async listConversations(): Promise<ConversationSummary[]> {
    return this.http.request<ConversationSummary[]>({
      url: '/api/v1/conversations',
      method: 'GET',
    });
  }

  /**
   * Retrieves full details, history, and attachments for a specific conversation.
   */
  public async getConversation(conversationId: string): Promise<ConversationDetail> {
    return this.http.request<ConversationDetail>({
      url: `/api/v1/conversations/${encodeURIComponent(conversationId)}`,
      method: 'GET',
    });
  }

  /**
   * Deletes an entire conversation and its messages.
   */
  public async deleteConversation(
    conversationId: string
  ): Promise<{ status: string; id: string }> {
    return this.http.request<{ status: string; id: string }>({
      url: `/api/v1/conversations/${encodeURIComponent(conversationId)}`,
      method: 'DELETE',
    });
  }

  /**
   * Attaches a document to an existing conversation.
   */
  public async attachDocument(
    conversationId: string,
    file: File
  ): Promise<AttachedDocument> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (this.prefs?.isDevMode()) {
      headers['X-Document-Tag'] = this.prefs.getDevDocumentTag() || 'synthetic';
    }

    return this.http.request<AttachedDocument>({
      url: `/api/v1/conversations/${encodeURIComponent(conversationId)}/documents`,
      method: 'POST',
      body: formData,
      headers,
    });
  }

  /**
   * Lists all documents attached to a conversation.
   */
  public async listDocuments(conversationId: string): Promise<AttachedDocument[]> {
    return this.http.request<AttachedDocument[]>({
      url: `/api/v1/conversations/${encodeURIComponent(conversationId)}/documents`,
      method: 'GET',
    });
  }

  /**
   * Removes an attached document from a conversation.
   */
  public async deleteDocument(
    conversationId: string,
    documentId: string
  ): Promise<{ status: string; id: string }> {
    return this.http.request<{ status: string; id: string }>({
      url: `/api/v1/conversations/${encodeURIComponent(conversationId)}/documents/${encodeURIComponent(documentId)}`,
      method: 'DELETE',
    });
  }

  /**
   * Sends a user message and streams the assistant response via SSE.
   * First message following document attachment executes full analysis pipeline;
   * subsequent messages stream RAG chat tokens.
   */
  public async sendMessageStream(
    conversationId: string,
    content: string,
    callbacks: MessageStreamCallbacks
  ): Promise<void> {
    const url = `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`;
    const payload: SendMessageRequest = { content };

    return this.sse.connect({
      url,
      method: 'POST',
      body: payload,
      onEvent: (event: { event?: string; data: string }) => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            callbacks.onError?.(new Error(data.message || data.error));
            return;
          }

          if (data.type === 'token' || typeof data.token === 'string') {
            callbacks.onToken?.(data.token || data.text || '');
            return;
          }

          if (event.event === 'stage_start' || event.event === 'stage_progress' || event.event === 'stage_complete' || data.stage) {
            callbacks.onStage?.(data);
            return;
          }

          if (data.type === 'done' || data.final_output || data.full_response) {
            callbacks.onDone?.(data);
            return;
          }

          // Fallback token extraction for raw string payloads
          if (typeof data === 'string') {
            callbacks.onToken?.(data);
          }
        } catch {
          // If event.data is raw plain text token
          if (event.data) {
            callbacks.onToken?.(event.data);
          }
        }
      },
      onError: (err: Error) => {
        callbacks.onError?.(err);
      },
    });
  }
}

import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { CompositionRoot } from '@/compositionRoot';
import type {
  ConversationSummary,
  ConversationDetail,
  ConversationMessage,
} from '@/types/api';
import { ChatWindow } from '@/components/conversations/ChatWindow';
import { DocumentAttachmentList } from '@/components/conversations/DocumentAttachmentList';
import { formatDateGerman } from '@/utils/formatters';

export interface ConversationViewProps {
  className?: string;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  className = '',
}) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null);

  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingTokens, setStreamingTokens] = useState('');
  const [currentStageName, setCurrentStageName] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Load conversations list on mount
  const fetchConversations = async () => {
    setIsLoadingList(true);
    try {
      const list = await CompositionRoot.conversations.listConversations();
      setConversations(list);
      if (list.length > 0 && !activeConversationId) {
        const first = list[0];
        if (first) {
          setActiveConversationId(first.id);
        }
      }
    } catch (err) {
      console.error('[ConversationView] Failed to fetch conversations:', err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Load detail when activeConversationId changes
  useEffect(() => {
    if (!activeConversationId) {
      setActiveConversation(null);
      return;
    }

    let isCancelled = false;
    const loadDetail = async () => {
      setIsLoadingDetail(true);
      setError(null);
      try {
        const detail = await CompositionRoot.conversations.getConversation(activeConversationId);
        if (!isCancelled) {
          setActiveConversation(detail);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('[ConversationView] Error loading conversation:', err);
          setError(
            err instanceof Error ? err.message : 'Fehler beim Laden der Konversation.'
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingDetail(false);
        }
      }
    };

    loadDetail();

    return () => {
      isCancelled = true;
    };
  }, [activeConversationId]);

  // Create new conversation
  const handleCreateNew = async () => {
    try {
      const created = await CompositionRoot.conversations.createConversation(
        `Bescheidprüfung ${new Date().toLocaleDateString('de-DE')}`
      );
      setConversations((prev) => [
        {
          id: created.id,
          title: created.title,
          created_at: created.created_at,
          updated_at: created.updated_at,
          message_count: 0,
          document_count: 0,
        },
        ...prev,
      ]);
      setActiveConversationId(created.id);
      setActiveConversation(created);
    } catch (err) {
      console.error('[ConversationView] Create error:', err);
      alert('Fehler beim Erstellen einer neuen Konversation.');
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Möchten Sie diese Konversation wirklich löschen?')) return;

    try {
      await CompositionRoot.conversations.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        setActiveConversationId(remaining.length > 0 && remaining[0] ? remaining[0].id : null);
      }
    } catch (err) {
      console.error('[ConversationView] Delete error:', err);
      alert('Fehler beim Löschen der Konversation.');
    }
  };

  // Attach document
  const handleAttachDocument = async (file: File) => {
    if (!activeConversationId) return;

    setIsUploadingDoc(true);
    try {
      const doc = await CompositionRoot.conversations.attachDocument(activeConversationId, file);
      setActiveConversation((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          documents: [...prev.documents, doc],
        };
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, document_count: c.document_count + 1 }
            : c
        )
      );
    } catch (err) {
      console.error('[ConversationView] Attach error:', err);
      alert('Fehler beim Anhängen des Dokuments.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Delete attached document
  const handleDeleteDocument = async (docId: string) => {
    if (!activeConversationId) return;

    try {
      await CompositionRoot.conversations.deleteDocument(activeConversationId, docId);
      setActiveConversation((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          documents: prev.documents.filter((d) => d.id !== docId),
        };
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, document_count: Math.max(0, c.document_count - 1) }
            : c
        )
      );
    } catch (err) {
      console.error('[ConversationView] Delete document error:', err);
      alert('Fehler beim Entfernen des Dokuments.');
    }
  };

  // Send message with SSE streaming
  const handleSendMessage = async (content: string) => {
    if (!activeConversationId) return;

    // Optimistically append user message
    const userMsg: ConversationMessage = {
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    setActiveConversation((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        messages: [...prev.messages, userMsg],
      };
    });

    setIsStreaming(true);
    setStreamingTokens('');
    setCurrentStageName(undefined);

    let accumulatedTokens = '';

    try {
      await CompositionRoot.conversations.sendMessageStream(
        activeConversationId,
        content,
        {
          onToken: (tok) => {
            accumulatedTokens += tok;
            setStreamingTokens(accumulatedTokens);
          },
          onStage: (stage) => {
            const name = (stage.stage_name as string) || (stage.stage as string);
            if (name) {
              setCurrentStageName(name);
            }
          },
          onDone: (finalEvent) => {
            const assistantContent =
              (finalEvent.full_response as string) ||
              accumulatedTokens ||
              (finalEvent.final_output
                ? JSON.stringify(finalEvent.final_output, null, 2)
                : 'Prüfung abgeschlossen.');

            const assistantMsg: ConversationMessage = {
              role: 'assistant',
              content: assistantContent,
              created_at: new Date().toISOString(),
              disclosure: finalEvent.disclosure as any,
              provenance: finalEvent.provenance as any,
              sections: finalEvent.sections as any,
              final_output: finalEvent.final_output as any,
            };

            setActiveConversation((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                messages: [...prev.messages, assistantMsg],
              };
            });

            setIsStreaming(false);
            setStreamingTokens('');
            setCurrentStageName(undefined);
          },
          onError: (err) => {
            console.error('[ConversationView] Stream error:', err);
            setIsStreaming(false);
            setCurrentStageName(undefined);
            alert(`Stream-Fehler: ${err.message}`);
          },
        }
      );
    } catch (err) {
      console.error('[ConversationView] Send message failure:', err);
      setIsStreaming(false);
      setCurrentStageName(undefined);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Intro Header */}
      <div className="p-6 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="ds-text-headline-sm font-semibold text-[var(--ds-color-text-primary)]">
            Chat-First Rechtskonversation & RAG
          </h1>
          <p className="mt-1 ds-text-body-md text-[var(--ds-color-text-secondary)]">
            Führen Sie dialogbasierte Bescheidprüfungen durch. Dokumente können flexibel angehängt und im Gespräch vertieft werden.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateNew}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-action-primary)] text-[var(--ds-color-text-on-action)] hover:opacity-90 ds-text-label-md font-semibold cursor-pointer ds-focus-ring shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Neue Konversation</span>
        </button>
      </div>

      {/* Main Grid: Sidebar + Chat Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Conversation Sidebar */}
        <div className="lg:col-span-1 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] p-4 space-y-3">
          <h2 className="ds-text-title-sm font-semibold text-[var(--ds-color-text-primary)] pb-2 border-b border-[var(--ds-color-border-default)]">
            Unterhaltungen ({conversations.length})
          </h2>

          {isLoadingList ? (
            <div className="flex items-center justify-center py-6 text-[var(--ds-color-text-secondary)]">
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="ds-text-body-sm text-[var(--ds-color-text-tertiary)] italic py-2">
              Keine gespeicherten Konversationen vorhanden.
            </p>
          ) : (
            <ul className="space-y-1.5" role="list">
              {conversations.map((c) => {
                const isActive = c.id === activeConversationId;
                return (
                  <li
                    key={c.id}
                    onClick={() => setActiveConversationId(c.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setActiveConversationId(c.id);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-[var(--ds-radius-control)] cursor-pointer transition-colors ds-focus-ring ${
                      isActive
                        ? 'bg-[var(--ds-color-surface-sunken)] border border-[var(--ds-color-border-focus)]'
                        : 'hover:bg-[var(--ds-color-bg-neutral-subtle)] border border-transparent'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="ds-text-label-md font-semibold text-[var(--ds-color-text-primary)] truncate">
                        {c.title || 'Ohne Titel'}
                      </p>
                      <div className="flex items-center gap-2 ds-text-body-sm text-[var(--ds-color-text-tertiary)] mt-0.5">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        <span>{formatDateGerman(c.updated_at || c.created_at)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(c.id, e)}
                      className="p-1 min-h-[var(--ds-size-target-min)] min-w-[var(--ds-size-target-min)] flex items-center justify-center text-[var(--ds-color-text-tertiary)] hover:text-[var(--ds-color-text-danger)] cursor-pointer ds-focus-ring"
                      aria-label={`Konversation ${c.title} löschen`}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right Column: Active Conversation & Chat Window */}
        <div className="lg:col-span-3 space-y-4">
          {isLoadingDetail ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3 text-[var(--ds-color-text-secondary)]">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--ds-color-text-accent)]" aria-hidden="true" />
              <p className="ds-text-body-md">Konversation wird geladen…</p>
            </div>
          ) : activeConversation ? (
            <>
              {/* Document Attachments Bar */}
              <DocumentAttachmentList
                documents={activeConversation.documents || []}
                onAttachDocument={handleAttachDocument}
                onDeleteDocument={handleDeleteDocument}
                isUploading={isUploadingDoc}
              />

              {/* Chat Window */}
              <ChatWindow
                messages={activeConversation.messages || []}
                onSendMessage={handleSendMessage}
                isStreaming={isStreaming}
                streamingTokens={streamingTokens}
                currentStageName={currentStageName}
              />
            </>
          ) : (
            <div className="p-12 border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] text-center space-y-3">
              <MessageSquare className="w-10 h-10 mx-auto text-[var(--ds-color-text-tertiary)]" aria-hidden="true" />
              <h3 className="ds-text-title-md font-semibold text-[var(--ds-color-text-primary)]">
                Keine Konversation ausgewählt
              </h3>
              <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)]">
                Wählen Sie eine bestehende Konversation aus oder starten Sie eine neue.
              </p>
              <button
                type="button"
                onClick={handleCreateNew}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-action-primary)] text-[var(--ds-color-text-on-action)] hover:opacity-90 ds-text-label-md font-semibold cursor-pointer ds-focus-ring"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Neue Konversation starten</span>
              </button>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="p-4 rounded-[var(--ds-radius-container)] bg-[var(--ds-color-bg-danger-subtle)] border border-[var(--ds-color-border-danger)] text-[var(--ds-color-text-danger)] ds-text-body-sm flex items-center gap-2"
            >
              <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

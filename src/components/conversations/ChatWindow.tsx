import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, ShieldCheck } from 'lucide-react';
import type { ConversationMessage } from '@/types/api';
import { SanitizedHtml } from '@/components/common/SanitizedHtml';

export interface ChatWindowProps {
  messages: ConversationMessage[];
  onSendMessage: (content: string) => Promise<void>;
  isStreaming?: boolean;
  streamingTokens?: string;
  currentStageName?: string;
  className?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSendMessage,
  isStreaming = false,
  streamingTokens = '',
  currentStageName,
  className = '',
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages or streaming tokens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, streamingTokens, isStreaming]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming) return;

    setInputValue('');
    await onSendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      role="region"
      aria-label="Konversationsverlauf"
      className={`flex flex-col h-[600px] border border-[var(--ds-color-border-default)] rounded-[var(--ds-radius-container)] bg-[var(--ds-color-surface-raised)] overflow-hidden ${className}`}
    >
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3 text-[var(--ds-color-text-secondary)]">
            <div className="p-3 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-accent)]">
              <Bot className="w-8 h-8" aria-hidden="true" />
            </div>
            <div>
              <h4 className="ds-text-title-md font-semibold text-[var(--ds-color-text-primary)]">
                Bescheidprüfung & RAG-Konversation
              </h4>
              <p className="ds-text-body-sm text-[var(--ds-color-text-secondary)] max-w-md mt-1">
                Stellen Sie konkrete Fragen zu Ihrem Bescheid oder hängen Sie oben ein Dokument an. Die erste Nachricht führt eine umfassende Rechtsprüfung durch.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id || idx}
              className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div
                  className="p-2 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-accent-subtle)] text-[var(--ds-color-text-accent)] shrink-0 mt-1"
                  aria-hidden="true"
                >
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-[var(--ds-radius-container)] p-4 space-y-2 ${
                  isUser
                    ? 'bg-[var(--ds-color-bg-action-primary)] text-[var(--ds-color-text-on-action)]'
                    : 'bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-primary)] border border-[var(--ds-color-border-default)]'
                }`}
              >
                {/* EU AI Act Art. 50 disclosure notice if attached to message */}
                {!isUser && msg.disclosure && (
                  <div
                    role="note"
                    className="p-2 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-raised)] border border-[var(--ds-color-border-default)] ds-text-body-sm flex items-center gap-1.5 text-[var(--ds-color-text-secondary)]"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[var(--ds-color-text-accent)] shrink-0" aria-hidden="true" />
                    <span>{msg.disclosure.texts?.de || 'KI-generierte Auskunft'}</span>
                  </div>
                )}

                <SanitizedHtml
                  html={msg.content}
                  className={`ds-text-body-md whitespace-pre-wrap leading-relaxed ${
                    isUser ? 'text-[var(--ds-color-text-on-action)]' : 'text-[var(--ds-color-text-primary)]'
                  }`}
                />

                {/* Provenance badge if available */}
                {!isUser && msg.provenance && (
                  <div className="pt-1 text-[var(--ds-color-text-tertiary)] ds-text-label-sm font-mono flex items-center gap-1">
                    <span>Provenienz: {msg.provenance.spec_version}</span>
                  </div>
                )}
              </div>

              {isUser && (
                <div
                  className="p-2 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-secondary)] shrink-0 mt-1"
                  aria-hidden="true"
                >
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Live Streaming Assistant Message */}
        {isStreaming && (
          <div className="flex items-start gap-3 justify-start">
            <div
              className="p-2 rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-accent-subtle)] text-[var(--ds-color-text-accent)] shrink-0 mt-1"
              aria-hidden="true"
            >
              <Bot className="w-4 h-4" />
            </div>

            <div className="max-w-[85%] rounded-[var(--ds-radius-container)] p-4 bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-primary)] border border-[var(--ds-color-border-default)] space-y-2">
              {currentStageName && (
                <div className="flex items-center gap-2 ds-text-label-sm text-[var(--ds-color-text-accent)] font-semibold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>Pipeline-Stufe: {currentStageName}</span>
                </div>
              )}

              {streamingTokens ? (
                <p className="ds-text-body-md whitespace-pre-wrap leading-relaxed text-[var(--ds-color-text-primary)]">
                  {streamingTokens}
                  <span className="inline-block w-2 h-4 ml-1 bg-[var(--ds-color-text-accent)] animate-pulse" aria-hidden="true" />
                </p>
              ) : (
                <div className="flex items-center gap-2 text-[var(--ds-color-text-secondary)] ds-text-body-sm py-1">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--ds-color-text-accent)]" aria-hidden="true" />
                  <span>Antwort wird formuliert…</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="p-3 sm:p-4 border-t border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-raised)] flex items-end gap-2"
      >
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            rows={2}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nachricht eingeben… (Eingabetaste zum Senden, Umschalt+Eingabe für Zeilenumbruch)"
            disabled={isStreaming}
            className="w-full resize-none px-3.5 py-2.5 rounded-[var(--ds-radius-control)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)] text-[var(--ds-color-text-primary)] placeholder-[var(--ds-color-text-tertiary)] ds-text-body-md ds-focus-ring disabled:opacity-50"
            aria-label="Nachricht an den Rechtsassistenten"
          />
        </div>

        <button
          type="submit"
          disabled={isStreaming || !inputValue.trim()}
          className="inline-flex items-center justify-center p-3 min-h-[var(--ds-size-target-min)] min-w-[var(--ds-size-target-min)] rounded-[var(--ds-radius-control)] bg-[var(--ds-color-bg-action-primary)] text-[var(--ds-color-text-on-action)] hover:opacity-90 disabled:opacity-50 cursor-pointer ds-focus-ring transition-opacity"
          aria-label="Nachricht senden"
        >
          {isStreaming ? (
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="w-5 h-5" aria-hidden="true" />
          )}
        </button>
      </form>
    </div>
  );
};

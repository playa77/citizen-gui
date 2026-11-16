import React, { useEffect, useRef } from 'react';
import { Terminal, Sparkles } from 'lucide-react';
import { useStreamingStore } from '@/stores/streamingStore';

export interface LiveTokenStreamProps {
  className?: string;
}

export const LiveTokenStream: React.FC<LiveTokenStreamProps> = ({ className = '' }) => {
  const tokens = useStreamingStore((s) => s.tokens);
  const activeStage = useStreamingStore((s) => s.activeStage);
  const pipelineStatus = useStreamingStore((s) => s.status);
  const scrollRef = useRef<HTMLPreElement>(null);

  const isStreaming =
    pipelineStatus === 'streaming' && (activeStage === 'construction' || tokens.length > 0);

  // Auto-scroll to bottom as new tokens arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [tokens]);

  if (!isStreaming && tokens.length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-[var(--ds-radius-container)] border border-[var(--ds-color-border-default)] bg-[var(--ds-color-surface-sunken)] overflow-hidden ${className}`}
      role="region"
      aria-label="Live-Argumentationsaufbau Token-Stream"
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--ds-color-surface-raised)] border-b border-[var(--ds-color-border-default)]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[var(--ds-color-text-accent)]" aria-hidden="true" />
          <span className="ds-text-label-md font-semibold text-[var(--ds-color-text-primary)]">
            Live-Argumentationsaufbau (Token-Stream)
          </span>
        </div>

        {isStreaming && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--ds-radius-control-sm)] bg-[var(--ds-color-bg-accent-subtle)] text-[var(--ds-color-text-accent)] ds-text-label-sm font-semibold">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" aria-hidden="true" />
            <span>Generierung aktiv</span>
          </div>
        )}
      </div>

      {/* Stream Output */}
      <pre
        ref={scrollRef}
        role="log"
        aria-live="polite"
        className="p-4 max-h-64 overflow-y-auto whitespace-pre-wrap break-words font-mono ds-text-code-sm text-[var(--ds-color-text-primary)] bg-[var(--ds-color-bg-field)] leading-relaxed"
      >
        {tokens}
        {isStreaming && (
          <span className="inline-block w-2 h-4 ml-1 bg-[var(--ds-color-text-accent)] animate-pulse align-middle" />
        )}
      </pre>
    </div>
  );
};

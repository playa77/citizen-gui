import { fetchEventSource } from '@microsoft/fetch-event-source';
import type { LocalPreferencesStore } from '@/stores/localPreferences';
import type {
  AnalysisErrorEventPayload,
  AnalysisFinalEventPayload,
  SseStageEventPayload,
} from '@/types/events';

export interface SseCallbacks {
  onStageEvent: (event: SseStageEventPayload) => void;
  onToken?: (token: string) => void;
  onFinal: (payload: AnalysisFinalEventPayload) => void;
  onError: (error: AnalysisErrorEventPayload) => void;
}

export interface SseConnectOptions {
  url: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  onEvent: (ev: { event?: string; data: string }) => void;
  onError?: (err: Error) => void;
}

export class SseClient {
  constructor(private readonly prefs: LocalPreferencesStore) {}

  public async streamPipeline(
    endpoint: string,
    body: unknown,
    callbacks: SseCallbacks
  ): Promise<void> {
    const abortController = new AbortController();
    let lastActivityTime = Date.now();
    let watchdogInterval: ReturnType<typeof setInterval> | null = null;
    let isTerminated = false;

    // Watchdog checking every 15s for 60s inactivity threshold
    watchdogInterval = setInterval(() => {
      if (isTerminated) return;
      const inactiveMs = Date.now() - lastActivityTime;
      if (inactiveMs >= 60000) {
        console.warn(
          '[Citizen-GUI][SSE] Inactivity watchdog: No event received for 60 seconds. LLM reasoning may be taking longer than expected.'
        );
      }
    }, 15000);

    const cleanup = () => {
      isTerminated = true;
      if (watchdogInterval) {
        clearInterval(watchdogInterval);
        watchdogInterval = null;
      }
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };

    const ackVersion = this.prefs.getDisclaimerAckVersion();
    if (ackVersion) {
      headers['X-Disclaimer-Ack'] = ackVersion;
    }

    try {
      await fetchEventSource(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: abortController.signal,
        async onopen(response) {
          lastActivityTime = Date.now();
          if (!response.ok) {
            let errorText = '';
            try {
              errorText = await response.text();
            } catch {
              // ignore
            }
            throw new Error(`SSE connection failed with status ${response.status}: ${errorText}`);
          }
        },
        onmessage(ev) {
          lastActivityTime = Date.now();

          if (!ev.data) return;

          try {
            const data = JSON.parse(ev.data);

            // 1. Error event
            if (ev.event === 'error' || data.error) {
              cleanup();
              abortController.abort();
              callbacks.onError({
                error: data.error || 'Pipeline execution failed',
                detail: data.detail,
                session_id: data.session_id,
              });
              return;
            }

            // 2. Final terminal event
            if (ev.event === 'final' || data.final_output || data.case_run_id) {
              cleanup();
              abortController.abort();
              callbacks.onFinal(data as AnalysisFinalEventPayload);
              return;
            }

            // 3. Stage event
            if (data.stage && data.status) {
              const stagePayload = data as SseStageEventPayload;
              callbacks.onStageEvent(stagePayload);

              // Check for incremental token inside stage payload
              if (stagePayload.payload && typeof stagePayload.payload.token === 'string') {
                callbacks.onToken?.(stagePayload.payload.token);
              }
            } else if (typeof data.token === 'string') {
              callbacks.onToken?.(data.token);
            }
          } catch (err) {
            console.error('[Citizen-GUI][SSE] Error parsing event data:', err);
          }
        },
        onerror(err) {
          cleanup();
          callbacks.onError({
            error: err instanceof Error ? err.message : 'Unknown SSE error',
          });
          // Rethrow to stop retry
          throw err;
        },
      });
    } catch {
      // Abort or error caught
    } finally {
      cleanup();
    }
  }

  public async connect(options: SseConnectOptions): Promise<void> {
    const abortController = new AbortController();
    let isTerminated = false;

    const cleanup = () => {
      isTerminated = true;
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(options.headers || {}),
    };

    const ackVersion = this.prefs.getDisclaimerAckVersion();
    if (ackVersion) {
      headers['X-Disclaimer-Ack'] = ackVersion;
    }

    try {
      await fetchEventSource(options.url, {
        method: options.method || 'POST',
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: abortController.signal,
        async onopen(response) {
          if (!response.ok) {
            let errorText = '';
            try {
              errorText = await response.text();
            } catch {
              // ignore
            }
            throw new Error(`SSE stream connection failed (${response.status}): ${errorText}`);
          }
        },
        onmessage(ev) {
          if (isTerminated) return;
          options.onEvent({ event: ev.event, data: ev.data });
        },
        onerror(err) {
          cleanup();
          const errorObj = err instanceof Error ? err : new Error(String(err));
          options.onError?.(errorObj);
          throw err;
        },
      });
    } catch {
      // Aborted or finished
    } finally {
      cleanup();
    }
  }
}

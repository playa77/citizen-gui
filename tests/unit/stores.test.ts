import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalPreferencesStore, STORAGE_KEYS } from '@/stores/localPreferences';
import { HttpClient, ApiError } from '@/services/http';
import { SseClient } from '@/services/sse';
import { CompositionRoot } from '@/compositionRoot';

describe('WP-03: Storage Adapters & LocalPreferencesStore [Doc 1 §5.2]', () => {
  let store: LocalPreferencesStore;

  beforeEach(() => {
    window.localStorage.clear();
    store = new LocalPreferencesStore();
  });

  it('should initialize with correct default values', () => {
    expect(store.getDisclaimerAckVersion()).toBeNull();
    expect(store.getTheme()).toBe('system');
    expect(store.getDevDocumentTag()).toBe('synthetic');
    expect(store.getDraftAnalysisText()).toBe('');
    expect(store.isDevMode()).toBe(false);
  });

  it('should manage disclaimer version lifecycle', () => {
    store.setDisclaimerAckVersion('v3.0.0');
    expect(store.getDisclaimerAckVersion()).toBe('v3.0.0');
    expect(window.localStorage.getItem(STORAGE_KEYS.DISCLAIMER_ACK_VERSION)).toBe('v3.0.0');

    store.clearDisclaimerAckVersion();
    expect(store.getDisclaimerAckVersion()).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.DISCLAIMER_ACK_VERSION)).toBeNull();
  });

  it('should manage UI theme preference', () => {
    store.setTheme('dark');
    expect(store.getTheme()).toBe('dark');
    expect(window.localStorage.getItem(STORAGE_KEYS.UI_THEME)).toBe('dark');

    store.setTheme('light');
    expect(store.getTheme()).toBe('light');

    // Invalid value fallback
    window.localStorage.setItem(STORAGE_KEYS.UI_THEME, 'invalid-theme');
    expect(store.getTheme()).toBe('system');
  });

  it('should manage dev document tag preference', () => {
    store.setDevDocumentTag('goldset');
    expect(store.getDevDocumentTag()).toBe('goldset');
    expect(window.localStorage.getItem(STORAGE_KEYS.DEV_DOCUMENT_TAG)).toBe('goldset');

    // Invalid value fallback
    window.localStorage.setItem(STORAGE_KEYS.DEV_DOCUMENT_TAG, 'unknown-tag');
    expect(store.getDevDocumentTag()).toBe('synthetic');
  });

  it('should manage draft analysis text and eviction', () => {
    const sampleText = 'Jobcenter Bescheid vom 12.01.2026';
    store.setDraftAnalysisText(sampleText);
    expect(store.getDraftAnalysisText()).toBe(sampleText);
    expect(window.localStorage.getItem(STORAGE_KEYS.DRAFT_ANALYSIS_TEXT)).toBe(sampleText);

    store.clearDraftAnalysisText();
    expect(store.getDraftAnalysisText()).toBe('');
    expect(window.localStorage.getItem(STORAGE_KEYS.DRAFT_ANALYSIS_TEXT)).toBeNull();
  });

  it('should toggle dev mode state', () => {
    expect(store.isDevMode()).toBe(false);
    store.setDevMode(true);
    expect(store.isDevMode()).toBe(true);
    store.setDevMode(false);
    expect(store.isDevMode()).toBe(false);
  });
});

describe('WP-03: HTTP Transport Client & Gate Interceptors [Doc 2 §7, §8.1]', () => {
  let store: LocalPreferencesStore;
  let http: HttpClient;

  beforeEach(() => {
    window.localStorage.clear();
    store = new LocalPreferencesStore();
    http = new HttpClient(store);
    vi.restoreAllMocks();
  });

  it('should automatically append X-Disclaimer-Ack when stored', async () => {
    store.setDisclaimerAckVersion('v3.0.0');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ status: 'ok' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await http.request({ url: '/api/v1/cases' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Disclaimer-Ack']).toBe('v3.0.0');
  });

  it('should exempt /health and disclaimer/version from X-Disclaimer-Ack', async () => {
    store.setDisclaimerAckVersion('v3.0.0');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ status: 'ok' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await http.request({ url: '/health' });
    await http.request({ url: '/api/v1/meta/disclaimer/version' });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [, initHealth] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headersHealth = initHealth.headers as Record<string, string>;
    expect(headersHealth['X-Disclaimer-Ack']).toBeUndefined();

    const [, initVersion] = fetchMock.mock.calls[1] as [string, RequestInit];
    const headersVersion = initVersion.headers as Record<string, string>;
    expect(headersVersion['X-Disclaimer-Ack']).toBeUndefined();
  });

  it('should inject X-Document-Tag: synthetic on upload in dev mode', async () => {
    store.setDevMode(true);
    store.setDevDocumentTag('synthetic');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ text: 'Extracted text' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const testFile = new File(['sample content'], 'notice.pdf', { type: 'application/pdf' });
    await http.upload('/api/v1/ingest', testFile);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Document-Tag']).toBe('synthetic');
  });

  it('should handle 403 disclaimer_version_mismatch by clearing ack and calling handler', async () => {
    store.setDisclaimerAckVersion('v2.0.0');
    const onMismatch = vi.fn();
    http.setVersionMismatchHandler(onMismatch);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        error: 'disclaimer_version_mismatch',
        required_version: 'v3.0.0',
        detail: 'Disclaimer version mismatch',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(http.request({ url: '/api/v1/cases' })).rejects.toThrow(ApiError);

    expect(store.getDisclaimerAckVersion()).toBeNull();
    expect(onMismatch).toHaveBeenCalledWith('v3.0.0');
  });
});

describe('WP-03: Composition Root Singleton Wiring [Doc 2 §15.1]', () => {
  it('should instantiate singleton storage and transport instances', () => {
    expect(CompositionRoot.prefs).toBeInstanceOf(LocalPreferencesStore);
    expect(CompositionRoot.http).toBeInstanceOf(HttpClient);
    expect(CompositionRoot.sse).toBeInstanceOf(SseClient);
  });
});

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { CompositionRoot } from '@/compositionRoot';
import { complianceStore } from '@/stores/complianceStore';
import { App } from '@/App';
import { DisclaimerModal } from '@/components/layout/DisclaimerModal';
import { ApiError } from '@/services/http';

describe('WP-04: Legal Disclaimer Service & Compliance Modal Gate [Doc 1 §2.1 FR-01, FR-02]', () => {
  beforeEach(() => {
    window.localStorage.clear();
    complianceStore.reset();
    vi.restoreAllMocks();
  });

  it('should verify checkVersion() evaluates match between stored version and backend version', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/v1/meta/disclaimer/version')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ version: 'v3.0.0' }),
        };
      }
      return { ok: false, status: 404 };
    });
    vi.stubGlobal('fetch', fetchMock);

    // Initial state: empty localStorage (calling production path)
    const initialCheck = await CompositionRoot.disclaimer.checkVersion();
    expect(initialCheck.isCurrent).toBe(false);
    expect(initialCheck.currentVersion).toBe('v3.0.0');

    // Acknowledge via production service path
    CompositionRoot.disclaimer.acknowledge('v3.0.0');

    const confirmedCheck = await CompositionRoot.disclaimer.checkVersion();
    expect(confirmedCheck.isCurrent).toBe(true);
    expect(confirmedCheck.currentVersion).toBe('v3.0.0');
  });

  it('should fetch disclaimer text and Art. 50 disclosure payload', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/v1/meta/disclaimer/text')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            text: '<p>Rechtlicher Hinweis zu Citizen</p>',
            version: 'v3.0.0',
          }),
        };
      }
      if (url.includes('/api/v1/meta/disclosure')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            version: '1.0',
            must_display_before: 'results',
            texts: {
              de: 'Diese Analyse wurde von einem KI-System erstellt.',
              en: 'This analysis was produced by an AI system.',
            },
          }),
        };
      }
      return { ok: false, status: 404 };
    });
    vi.stubGlobal('fetch', fetchMock);

    const textRes = await CompositionRoot.disclaimer.fetchDisclaimerText();
    expect(textRes.version).toBe('v3.0.0');
    expect(textRes.text).toContain('Rechtlicher Hinweis');

    const disclosure = await CompositionRoot.disclaimer.fetchDisclosure();
    expect(disclosure.version).toBe('1.0');
    expect(disclosure.must_display_before).toBe('results');
    expect(disclosure.texts.de).toContain('KI-System');
  });

  it('should open DisclaimerModal on bootstrap when unconfirmed, and clicking Zustimmen persists version and closes modal', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/v1/meta/disclaimer/version')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ version: 'v3.0.0' }),
        };
      }
      if (url.includes('/api/v1/meta/disclaimer/text')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            text: '<p>Amtlicher Disclaimer Text</p>',
            version: 'v3.0.0',
          }),
        };
      }
      if (url.includes('/health')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ status: 'ok', version: '2.0.0' }),
        };
      }
      if (url.includes('/api/v1/meta/deployment-mode')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            mode: 'self',
            synthetic_data_only: false,
            dev: false,
            dev_banner: null,
          }),
        };
      }
      return { ok: false, status: 404 };
    });
    vi.stubGlobal('fetch', fetchMock);

    render(React.createElement(App));

    // Modal opens displaying header and text
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Rechtlicher Hinweis & Nutzungsbedingungen')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Amtlicher Disclaimer Text')).toBeInTheDocument();
    });

    // Zustimmen button is enabled
    const confirmButton = screen.getByRole('button', { name: 'Zustimmen' });
    expect(confirmButton).toBeEnabled();

    // Click Zustimmen
    fireEvent.click(confirmButton);

    // Modal closes and ack is persisted
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(CompositionRoot.prefs.getDisclaimerAckVersion()).toBe('v3.0.0');
  });

  it('should immediately re-open modal and clear stored ack on simulated 403 disclaimer_version_mismatch', async () => {
    // Establish pre-existing confirmed state via production path
    CompositionRoot.disclaimer.acknowledge('v2.5.0');
    expect(CompositionRoot.prefs.getDisclaimerAckVersion()).toBe('v2.5.0');

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/v1/cases')) {
        return {
          ok: false,
          status: 403,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            error: 'disclaimer_version_mismatch',
            required_version: 'v3.0.0',
            detail: 'Disclaimer version mismatch',
          }),
        };
      }
      if (url.includes('/api/v1/meta/disclaimer/text')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            text: '<p>Neuer Disclaimer v3.0.0</p>',
            version: 'v3.0.0',
          }),
        };
      }
      return { ok: false, status: 404 };
    });
    vi.stubGlobal('fetch', fetchMock);

    render(React.createElement(DisclaimerModal));

    // Initially modal is closed because complianceStore.isDisclaimerModalOpen is false
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Simulate API request that returns 403 disclaimer_version_mismatch
    await act(async () => {
      await expect(CompositionRoot.http.request({ url: '/api/v1/cases' })).rejects.toThrow(ApiError);
    });

    // Ack should be evicted from storage
    expect(CompositionRoot.prefs.getDisclaimerAckVersion()).toBeNull();

    // Modal should now be open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(complianceStore.getState().isDisclaimerModalOpen).toBe(true);
      expect(complianceStore.getState().currentDisclaimerVersion).toBe('v3.0.0');
    });
  });
});

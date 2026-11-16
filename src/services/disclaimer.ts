import type { HttpClient } from './http';
import type { LocalPreferencesStore } from '@/stores/localPreferences';
import type {
  Art50Disclosure,
  DisclaimerTextResponse,
  DisclaimerVersionResponse,
} from '@/types/api';

export class DisclaimerService {
  constructor(
    private readonly http: HttpClient,
    private readonly prefs: LocalPreferencesStore
  ) {}

  public async checkVersion(): Promise<{ isCurrent: boolean; currentVersion: string }> {
    const res = await this.http.request<DisclaimerVersionResponse>({
      url: '/api/v1/meta/disclaimer/version',
      method: 'GET',
    });
    const stored = this.prefs.getDisclaimerAckVersion();
    return {
      isCurrent: stored !== null && stored === res.version,
      currentVersion: res.version,
    };
  }

  public async fetchDisclaimerText(): Promise<DisclaimerTextResponse> {
    return this.http.request<DisclaimerTextResponse>({
      url: '/api/v1/meta/disclaimer/text',
      method: 'GET',
    });
  }

  public acknowledge(version: string): void {
    this.prefs.setDisclaimerAckVersion(version);
  }

  public async fetchDisclosure(): Promise<Art50Disclosure> {
    return this.http.request<Art50Disclosure>({
      url: '/api/v1/meta/disclosure',
      method: 'GET',
    });
  }
}

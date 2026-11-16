import type { LocalPreferencesStore } from '@/stores/localPreferences';

export class ApiError extends Error {
  public readonly status: number;
  public readonly error: string;
  public readonly details?: unknown;

  constructor(status: number, error: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.error = error;
    this.details = details;
  }
}

export interface RequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  signal?: AbortSignal;
}

export type VersionMismatchHandler = (requiredVersion?: string) => void;

export class HttpClient {
  private versionMismatchHandler?: VersionMismatchHandler;

  constructor(private readonly prefs: LocalPreferencesStore) {}

  public setVersionMismatchHandler(handler: VersionMismatchHandler): void {
    this.versionMismatchHandler = handler;
  }

  private isDisclaimerExempt(url: string): boolean {
    const cleanUrl = url.split('?')[0] ?? url;
    return (
      cleanUrl.endsWith('/health') ||
      cleanUrl.endsWith('/api/v1/meta/disclaimer/version') ||
      cleanUrl.endsWith('/meta/disclaimer/version')
    );
  }

  private isUploadRoute(url: string): boolean {
    const cleanUrl = url.split('?')[0] ?? url;
    return (
      cleanUrl.includes('/api/v1/ingest') ||
      cleanUrl.includes('/ingest') ||
      cleanUrl.includes('/documents')
    );
  }

  private buildUrl(url: string, params?: Record<string, string | number | boolean | undefined>): string {
    if (!params) return url;
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined) {
        query.append(key, String(val));
      }
    }
    const queryString = query.toString();
    if (!queryString) return url;
    return url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`;
  }

  public async request<T>(config: RequestConfig): Promise<T> {
    const method = config.method ?? 'GET';
    const finalUrl = this.buildUrl(config.url, config.params);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...config.headers,
    };

    // Inject X-Disclaimer-Ack unless exempt
    if (!this.isDisclaimerExempt(finalUrl)) {
      const ackVersion = this.prefs.getDisclaimerAckVersion();
      if (ackVersion) {
        headers['X-Disclaimer-Ack'] = ackVersion;
      }
    }

    // Set JSON content-type if body is provided and not FormData
    let body: BodyInit | undefined;
    if (config.body !== undefined && config.body !== null) {
      if (typeof config.body === 'string' || config.body instanceof FormData || config.body instanceof Blob) {
        body = config.body as BodyInit;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(config.body);
      }
    }

    const response = await fetch(finalUrl, {
      method,
      headers,
      body,
      signal: config.signal,
    });

    return this.handleResponse<T>(response);
  }

  public async upload<T>(url: string, file: File, additionalFields?: Record<string, string>): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    // Inject X-Disclaimer-Ack
    if (!this.isDisclaimerExempt(url)) {
      const ackVersion = this.prefs.getDisclaimerAckVersion();
      if (ackVersion) {
        headers['X-Disclaimer-Ack'] = ackVersion;
      }
    }

    // Inject X-Document-Tag if in dev mode
    if (this.prefs.isDevMode() || this.isUploadRoute(url)) {
      if (this.prefs.isDevMode()) {
        headers['X-Document-Tag'] = this.prefs.getDevDocumentTag();
      }
    }

    const formData = new FormData();
    formData.append('file', file);
    if (additionalFields) {
      for (const [key, val] of Object.entries(additionalFields)) {
        formData.append(key, val);
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      let errorBody: Record<string, unknown> = {};
      let rawText = '';
      try {
        if (isJson) {
          errorBody = (await response.json()) as Record<string, unknown>;
        } else {
          rawText = await response.text();
        }
      } catch {
        // Response body unparseable
      }

      const errorCode = String(
        errorBody.error ||
        (typeof errorBody.detail === 'object' && errorBody.detail !== null
          ? (errorBody.detail as Record<string, unknown>).error
          : errorBody.detail) ||
        `HTTP_${response.status}`
      );

      const errorMessage = String(
        errorBody.message ||
        (typeof errorBody.detail === 'string' ? errorBody.detail : '') ||
        rawText ||
        response.statusText ||
        `Request failed with status ${response.status}`
      );

      // Handle 403 disclaimer mismatch
      if (
        response.status === 403 &&
        (errorCode === 'disclaimer_version_mismatch' || errorCode === 'disclaimer_required')
      ) {
        this.prefs.clearDisclaimerAckVersion();
        const reqVer = typeof errorBody.required_version === 'string' ? errorBody.required_version : undefined;
        this.versionMismatchHandler?.(reqVer);
      }

      throw new ApiError(response.status, errorCode, errorMessage, errorBody);
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    if (isJson) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  }
}

import type { DevDocumentTag, UiTheme } from '@/types/domain';

export const STORAGE_KEYS = {
  DISCLAIMER_ACK_VERSION: 'citizen_disclaimer_ack_version',
  UI_THEME: 'citizen_ui_theme',
  DEV_DOCUMENT_TAG: 'citizen_dev_document_tag',
  DRAFT_ANALYSIS_TEXT: 'citizen_draft_analysis_text',
} as const;

export class LocalPreferencesStore {
  private isDev: boolean = false;
  private memoryFallback: Map<string, string> = new Map();

  private getStorage(): Storage | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage;
      } catch {
        return null;
      }
    }
    return null;
  }

  private getItem(key: string): string | null {
    const storage = this.getStorage();
    if (storage) {
      try {
        return storage.getItem(key);
      } catch {
        return this.memoryFallback.get(key) ?? null;
      }
    }
    return this.memoryFallback.get(key) ?? null;
  }

  private setItem(key: string, value: string): void {
    const storage = this.getStorage();
    if (storage) {
      try {
        storage.setItem(key, value);
        return;
      } catch {
        this.memoryFallback.set(key, value);
        return;
      }
    }
    this.memoryFallback.set(key, value);
  }

  private removeItem(key: string): void {
    const storage = this.getStorage();
    if (storage) {
      try {
        storage.removeItem(key);
      } catch {
        this.memoryFallback.delete(key);
        return;
      }
    }
    this.memoryFallback.delete(key);
  }

  // 1. Disclaimer Ack Version
  public getDisclaimerAckVersion(): string | null {
    return this.getItem(STORAGE_KEYS.DISCLAIMER_ACK_VERSION);
  }

  public setDisclaimerAckVersion(version: string): void {
    this.setItem(STORAGE_KEYS.DISCLAIMER_ACK_VERSION, version);
  }

  public clearDisclaimerAckVersion(): void {
    this.removeItem(STORAGE_KEYS.DISCLAIMER_ACK_VERSION);
  }

  // 2. UI Theme
  public getTheme(): UiTheme {
    const value = this.getItem(STORAGE_KEYS.UI_THEME);
    if (value === 'light' || value === 'dark' || value === 'system') {
      return value;
    }
    return 'system';
  }

  public setTheme(theme: UiTheme): void {
    this.setItem(STORAGE_KEYS.UI_THEME, theme);
  }

  // 3. Dev Document Tag
  public getDevDocumentTag(): DevDocumentTag {
    const value = this.getItem(STORAGE_KEYS.DEV_DOCUMENT_TAG);
    if (value === 'goldset' || value === 'synthetic') {
      return value;
    }
    return 'synthetic';
  }

  public setDevDocumentTag(tag: DevDocumentTag): void {
    this.setItem(STORAGE_KEYS.DEV_DOCUMENT_TAG, tag);
  }

  // 4. Draft Analysis Text
  public getDraftAnalysisText(): string {
    return this.getItem(STORAGE_KEYS.DRAFT_ANALYSIS_TEXT) ?? '';
  }

  public setDraftAnalysisText(text: string): void {
    this.setItem(STORAGE_KEYS.DRAFT_ANALYSIS_TEXT, text);
  }

  public clearDraftAnalysisText(): void {
    this.removeItem(STORAGE_KEYS.DRAFT_ANALYSIS_TEXT);
  }

  // Dev mode flag
  public isDevMode(): boolean {
    return this.isDev;
  }

  public setDevMode(isDev: boolean): void {
    this.isDev = isDev;
  }
}

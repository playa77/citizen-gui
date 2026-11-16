import { useSyncExternalStore } from 'react';
import type { Art50Disclosure } from '@/types/api';

export interface ComplianceState {
  isDisclaimerModalOpen: boolean;
  currentDisclaimerVersion: string | null;
  disclaimerText: string | null;
  art50Disclosure: Art50Disclosure | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ComplianceState = {
  isDisclaimerModalOpen: false,
  currentDisclaimerVersion: null,
  disclaimerText: null,
  art50Disclosure: null,
  isLoading: false,
  error: null,
};

class ComplianceStore {
  private state: ComplianceState = { ...initialState };
  private listeners: Set<() => void> = new Set();

  public getState = (): ComplianceState => {
    return this.state;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private setState(partial: Partial<ComplianceState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  public setDisclaimerModalOpen(open: boolean): void {
    this.setState({ isDisclaimerModalOpen: open });
  }

  public setDisclaimerText(text: string, version: string): void {
    this.setState({
      disclaimerText: text,
      currentDisclaimerVersion: version,
      isLoading: false,
      error: null,
    });
  }

  public handleVersionMismatch(requiredVersion?: string): void {
    this.setState({
      isDisclaimerModalOpen: true,
      currentDisclaimerVersion: requiredVersion ?? null,
      disclaimerText: null, // Forces re-fetch of text
    });
  }

  public setArt50Disclosure(disclosure: Art50Disclosure): void {
    this.setState({ art50Disclosure: disclosure });
  }

  public setLoading(loading: boolean): void {
    this.setState({ isLoading: loading });
  }

  public setError(error: string | null): void {
    this.setState({ error, isLoading: false });
  }

  public reset(): void {
    this.state = { ...initialState };
    this.notify();
  }
}

export const complianceStore = new ComplianceStore();

export function useComplianceStore<T = ComplianceState>(
  selector: (state: ComplianceState) => T = (s) => s as unknown as T
): T {
  return useSyncExternalStore(
    complianceStore.subscribe,
    () => selector(complianceStore.getState()),
    () => selector(complianceStore.getState())
  );
}

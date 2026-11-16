import { LocalPreferencesStore } from './stores/localPreferences';
import { HttpClient } from './services/http';
import { SseClient } from './services/sse';
import { DisclaimerService } from './services/disclaimer';
import { complianceStore } from './stores/complianceStore';

export class CompositionRoot {
  public static readonly prefs = new LocalPreferencesStore();
  public static readonly http = new HttpClient(CompositionRoot.prefs);
  public static readonly sse = new SseClient(CompositionRoot.prefs);
  public static readonly disclaimer = new DisclaimerService(
    CompositionRoot.http,
    CompositionRoot.prefs
  );
}

// Automatically wire HTTP 403 disclaimer mismatch to complianceStore
CompositionRoot.http.setVersionMismatchHandler((requiredVersion) => {
  complianceStore.handleVersionMismatch(requiredVersion);
});

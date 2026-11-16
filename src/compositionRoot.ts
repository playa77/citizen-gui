import { LocalPreferencesStore } from './stores/localPreferences';
import { HttpClient } from './services/http';
import { SseClient } from './services/sse';

export class CompositionRoot {
  public static readonly prefs = new LocalPreferencesStore();
  public static readonly http = new HttpClient(CompositionRoot.prefs);
  public static readonly sse = new SseClient(CompositionRoot.prefs);
}

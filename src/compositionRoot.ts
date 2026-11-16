import { LocalPreferencesStore } from './stores/localPreferences';
import { HttpClient } from './services/http';
import { SseClient } from './services/sse';
import { DisclaimerService } from './services/disclaimer';
import { IngestionService } from './services/ingestion';
import { AnalysisService } from './services/analysis';
import { CasesService } from './services/cases';
import { DocumentService } from './services/documents';
import { ConversationService } from './services/conversations';
import { IntakeService } from './services/intake';
import { DiagnosticsService } from './services/diagnostics';
import { complianceStore } from './stores/complianceStore';

export class CompositionRoot {
  public static readonly prefs = new LocalPreferencesStore();
  public static readonly http = new HttpClient(CompositionRoot.prefs);
  public static readonly sse = new SseClient(CompositionRoot.prefs);
  public static readonly disclaimer = new DisclaimerService(
    CompositionRoot.http,
    CompositionRoot.prefs
  );
  public static readonly ingestion = new IngestionService(
    CompositionRoot.http,
    CompositionRoot.prefs
  );
  public static readonly analysis = new AnalysisService(CompositionRoot.sse);
  public static readonly cases = new CasesService(CompositionRoot.http);
  public static readonly documents = new DocumentService(CompositionRoot.http);
  public static readonly conversations = new ConversationService(
    CompositionRoot.http,
    CompositionRoot.sse,
    CompositionRoot.prefs
  );
  public static readonly intake = new IntakeService(CompositionRoot.http);
  public static readonly diagnostics = new DiagnosticsService(CompositionRoot.http);
}

// Automatically wire HTTP 403 disclaimer mismatch to complianceStore
CompositionRoot.http.setVersionMismatchHandler((requiredVersion) => {
  complianceStore.handleVersionMismatch(requiredVersion);
});

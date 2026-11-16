import type { HttpClient } from './http';
import type {
  IntakeStartRequest,
  IntakeSession,
  IntakeResult,
  IntakeSendMessageRequest,
} from '@/types/api';

/**
 * Service managing multi-turn pre-analysis intake interviews.
 * [Doc 1 §2.1 FR-09, Doc 2 §6.2, CITIZEN-API §8.2]
 */
export class IntakeService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Starts a new intake interview session with initial citizen text.
   * max_turns must be between 2 and 12 (default 8).
   */
  public async start(req: IntakeStartRequest): Promise<IntakeSession> {
    return this.http.request<IntakeSession>({
      url: '/api/v1/intake/start',
      method: 'POST',
      body: req,
    });
  }

  /**
   * Sends a citizen response message in an active intake interview.
   * Returns updated session; state transitions to 'done' when interview is complete.
   */
  public async sendMessage(
    intakeId: string,
    message: string
  ): Promise<IntakeSession> {
    const payload: IntakeSendMessageRequest = { message };
    return this.http.request<IntakeSession>({
      url: `/api/v1/intake/${encodeURIComponent(intakeId)}/message`,
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Retrieves the current state of an intake session.
   */
  public async getSession(intakeId: string): Promise<IntakeSession> {
    return this.http.request<IntakeSession>({
      url: `/api/v1/intake/${encodeURIComponent(intakeId)}`,
      method: 'GET',
    });
  }

  /**
   * Abandons current interview and resets the session.
   */
  public async restart(intakeId: string): Promise<IntakeSession> {
    return this.http.request<IntakeSession>({
      url: `/api/v1/intake/${encodeURIComponent(intakeId)}/restart`,
      method: 'POST',
    });
  }

  /**
   * Force-finalizes the interview early and extracts the structured IntakeResult.
   */
  public async confirm(intakeId: string): Promise<IntakeResult> {
    return this.http.request<IntakeResult>({
      url: `/api/v1/intake/${encodeURIComponent(intakeId)}/confirm`,
      method: 'POST',
    });
  }
}

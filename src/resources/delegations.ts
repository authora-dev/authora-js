import type { HttpClient } from '../http.js';
import type {
  CreateDelegationParams,
  Delegation,
  DelegationVerification,
  ListAgentDelegationsParams,
  PaginatedList,
  VerifyDelegationParams,
} from '../types.js';
import { toQuery } from '../utils.js';

/**
 * Resource class for managing permission delegations between agents.
 *
 * Delegations allow one agent (the issuer) to grant a subset of its
 * permissions to another agent (the target).
 */
export class DelegationsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new delegation from one agent to another.
   *
   * @param params - Delegation parameters including issuer, target, and permissions.
   * @returns The created delegation.
   */
  async create(params: CreateDelegationParams): Promise<Delegation> {
    return this.http.post<Delegation>('/delegations', { body: params });
  }

  /**
   * Retrieve a delegation by its ID.
   *
   * @param delegationId - The unique identifier of the delegation.
   * @returns The delegation object.
   */
  async get(delegationId: string): Promise<Delegation> {
    return this.http.get<Delegation>(`/delegations/${delegationId}`);
  }

  /**
   * Revoke an active delegation.
   *
   * @param delegationId - The unique identifier of the delegation to revoke.
   * @returns The revoked delegation.
   */
  async revoke(delegationId: string): Promise<Delegation> {
    return this.http.post<Delegation>(`/delegations/${delegationId}/revoke`);
  }

  /**
   * Verify that a delegation is valid and active.
   *
   * @param params - Verification parameters including the delegationId.
   * @returns Verification result.
   */
  async verify(params: VerifyDelegationParams): Promise<DelegationVerification> {
    return this.http.post<DelegationVerification>('/delegations/verify', { body: params });
  }

  /**
   * List all delegations.
   *
   * @returns A paginated list of delegations.
   */
  async list(): Promise<PaginatedList<Delegation>> {
    return this.http.get<PaginatedList<Delegation>>('/delegations');
  }

  /**
   * List delegations for a specific agent (issued or received).
   *
   * @param agentId - The unique identifier of the agent.
   * @param params - Optional filters including direction and pagination.
   * @returns A paginated list of delegations.
   */
  async listByAgent(agentId: string, params?: ListAgentDelegationsParams): Promise<PaginatedList<Delegation>> {
    return this.http.get<PaginatedList<Delegation>>(
      `/agents/${agentId}/delegations`,
      params ? { query: toQuery(params) } : undefined,
    );
  }
}

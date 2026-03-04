import type { HttpClient } from '../http.js';
import type {
  Agent,
  ActivateAgentParams,
  AgentVerification,
  CreateAgentParams,
  ListAgentsParams,
  PaginatedList,
  RotateKeyParams,
} from '../types.js';
import { toQuery } from '../utils.js';

/**
 * Resource class for managing Authora agents.
 *
 * Agents represent autonomous software entities that can be granted
 * permissions and participate in delegation chains.
 */
export class AgentsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new agent within a workspace.
   *
   * @param params - Agent creation parameters.
   * @returns The newly created agent.
   */
  async create(params: CreateAgentParams): Promise<Agent> {
    return this.http.post<Agent>('/agents', { body: params });
  }

  /**
   * List agents in a workspace with optional filters and pagination.
   *
   * @param params - Query parameters including workspaceId and optional filters.
   * @returns A paginated list of agents.
   */
  async list(params: ListAgentsParams): Promise<PaginatedList<Agent>> {
    return this.http.get<PaginatedList<Agent>>('/agents', { query: toQuery(params) });
  }

  /**
   * Retrieve a single agent by its ID.
   *
   * @param agentId - The unique identifier of the agent.
   * @returns The agent object.
   */
  async get(agentId: string): Promise<Agent> {
    return this.http.get<Agent>(`/agents/${agentId}`);
  }

  /**
   * Verify an agent's identity. This endpoint is public and requires no authentication.
   *
   * @param agentId - The unique identifier of the agent to verify.
   * @returns Verification result including validity status.
   */
  async verify(agentId: string): Promise<AgentVerification> {
    return this.http.get<AgentVerification>(`/agents/${agentId}/verify`, { auth: false });
  }

  /**
   * Activate a pending agent by providing its public key.
   *
   * @param agentId - The unique identifier of the agent.
   * @param params - Activation parameters including the public key.
   * @returns The activated agent.
   */
  async activate(agentId: string, params: ActivateAgentParams): Promise<Agent> {
    return this.http.post<Agent>(`/agents/${agentId}/activate`, { body: params });
  }

  /**
   * Suspend an active agent, temporarily revoking its access.
   *
   * @param agentId - The unique identifier of the agent.
   * @returns The suspended agent.
   */
  async suspend(agentId: string): Promise<Agent> {
    return this.http.post<Agent>(`/agents/${agentId}/suspend`);
  }

  /**
   * Permanently revoke an agent, removing all its access.
   *
   * @param agentId - The unique identifier of the agent.
   * @returns The revoked agent.
   */
  async revoke(agentId: string): Promise<Agent> {
    return this.http.post<Agent>(`/agents/${agentId}/revoke`);
  }

  /**
   * Rotate an agent's key pair by providing a new public key.
   *
   * @param agentId - The unique identifier of the agent.
   * @param params - Parameters including the new public key.
   * @returns The agent with the updated key information.
   */
  async rotateKey(agentId: string, params: RotateKeyParams): Promise<Agent> {
    return this.http.post<Agent>(`/agents/${agentId}/rotate-key`, { body: params });
  }
}

import type { HttpClient } from '../http.js';
import type {
  Agent,
  ActivateAgentParams,
  AgentVerification,
  CreateAgentParams,
  ListAgentsParams,
  PaginatedList,
  RotateKeyParams,
  UpdateAgentParams,
} from '../types.js';
import { toQuery } from '../utils.js';

export class AgentsResource {
  constructor(private readonly http: HttpClient) {}

  async create(params: CreateAgentParams): Promise<Agent> {
    return this.http.post<Agent>('/agents', { body: params });
  }

  async list(params: ListAgentsParams): Promise<PaginatedList<Agent>> {
    return this.http.get<PaginatedList<Agent>>('/agents', { query: toQuery(params) });
  }

  async get(agentId: string): Promise<Agent> {
    return this.http.get<Agent>(`/agents/${agentId}`);
  }

  async update(agentId: string, params: UpdateAgentParams): Promise<Agent> {
    return this.http.patch<Agent>(`/agents/${agentId}`, { body: params });
  }

  async verify(agentId: string): Promise<AgentVerification> {
    return this.http.get<AgentVerification>(`/agents/${agentId}/verify`, { auth: false });
  }

  async activate(agentId: string, params: ActivateAgentParams): Promise<Agent> {
    return this.http.post<Agent>(`/agents/${agentId}/activate`, { body: params });
  }

  async suspend(agentId: string): Promise<Agent> {
    return this.http.post<Agent>(`/agents/${agentId}/suspend`);
  }

  async revoke(agentId: string): Promise<Agent> {
    return this.http.post<Agent>(`/agents/${agentId}/revoke`);
  }

  async rotateKey(agentId: string, params: RotateKeyParams): Promise<Agent> {
    return this.http.post<Agent>(`/agents/${agentId}/rotate-key`, { body: params });
  }
}

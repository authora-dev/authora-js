import type { HttpClient } from '../http.js';
import type {
  BulkRevokeResult,
  CreateDelegationParams,
  Delegation,
  DelegationVerification,
  ListAgentDelegationsParams,
  PaginatedList,
  VerifyDelegationParams,
} from '../types.js';
import { toQuery } from '../utils.js';

export class DelegationsResource {
  constructor(private readonly http: HttpClient) {}

  async create(params: CreateDelegationParams): Promise<Delegation> {
    return this.http.post<Delegation>('/delegations', { body: params });
  }

  async get(delegationId: string): Promise<Delegation> {
    return this.http.get<Delegation>(`/delegations/${delegationId}`);
  }

  async revoke(delegationId: string): Promise<Delegation> {
    return this.http.post<Delegation>(`/delegations/${delegationId}/revoke`);
  }

  async verify(params: VerifyDelegationParams): Promise<DelegationVerification> {
    return this.http.post<DelegationVerification>('/delegations/verify', { body: params });
  }

  async list(): Promise<PaginatedList<Delegation>> {
    return this.http.get<PaginatedList<Delegation>>('/delegations');
  }

  async listByAgent(agentId: string, params?: ListAgentDelegationsParams): Promise<PaginatedList<Delegation>> {
    return this.http.get<PaginatedList<Delegation>>(
      `/agents/${agentId}/delegations`,
      params ? { query: toQuery(params) } : undefined,
    );
  }

  async revokeAll(agentId: string): Promise<BulkRevokeResult> {
    return this.http.post<BulkRevokeResult>(`/agents/${agentId}/delegations/revoke-all`);
  }
}

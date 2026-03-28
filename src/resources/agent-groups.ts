import type { HttpClient } from '../http.js';
import type {
  AgentGroup,
  AgentGroupMember,
  BulkAssignRoleParams,
  BulkAssignRoleResult,
  CreateAgentGroupParams,
  ListAgentGroupsParams,
  PaginatedList,
  UpdateAgentGroupParams,
} from '../types.js';
import { toQuery } from '../utils.js';

export class AgentGroupsResource {
  constructor(private readonly http: HttpClient) {}

  async create(params: CreateAgentGroupParams): Promise<AgentGroup> {
    return this.http.post<AgentGroup>('/agent-groups', { body: params });
  }

  async list(params: ListAgentGroupsParams): Promise<PaginatedList<AgentGroup>> {
    return this.http.get<PaginatedList<AgentGroup>>('/agent-groups', { query: toQuery(params) });
  }

  async get(groupId: string): Promise<AgentGroup> {
    return this.http.get<AgentGroup>(`/agent-groups/${groupId}`);
  }

  async update(groupId: string, params: UpdateAgentGroupParams): Promise<AgentGroup> {
    return this.http.patch<AgentGroup>(`/agent-groups/${groupId}`, { body: params });
  }

  async delete(groupId: string): Promise<void> {
    await this.http.delete<void>(`/agent-groups/${groupId}`);
  }

  async addMembers(groupId: string, agentIds: string[]): Promise<void> {
    await this.http.post<void>(`/agent-groups/${groupId}/members`, { body: { agentIds } });
  }

  async removeMembers(groupId: string, agentIds: string[]): Promise<void> {
    await this.http.delete<void>(`/agent-groups/${groupId}/members`, { body: { agentIds } });
  }

  async listMembers(groupId: string): Promise<AgentGroupMember[]> {
    return this.http.get<AgentGroupMember[]>(`/agent-groups/${groupId}/members`);
  }

  async listAgentGroups(agentId: string): Promise<AgentGroup[]> {
    return this.http.get<AgentGroup[]>(`/agents/${agentId}/groups`);
  }

  async bulkAssignRole(params: BulkAssignRoleParams): Promise<BulkAssignRoleResult> {
    return this.http.post<BulkAssignRoleResult>('/agents/bulk/assign-role', { body: params });
  }
}

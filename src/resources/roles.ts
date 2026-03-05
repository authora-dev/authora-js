import type { HttpClient } from '../http.js';
import type {
  AgentRoleAssignment,
  AssignRoleParams,
  CreateRoleParams,
  ListRolesParams,
  PaginatedList,
  Role,
  UpdateRoleParams,
} from '../types.js';
import { toQuery } from '../utils.js';

export class RolesResource {
  constructor(private readonly http: HttpClient) {}

  async create(params: CreateRoleParams): Promise<Role> {
    return this.http.post<Role>('/roles', { body: params });
  }

  async list(params: ListRolesParams): Promise<PaginatedList<Role>> {
    return this.http.get<PaginatedList<Role>>('/roles', { query: toQuery(params) });
  }

  async get(roleId: string): Promise<Role> {
    return this.http.get<Role>(`/roles/${roleId}`);
  }

  async update(roleId: string, params: UpdateRoleParams): Promise<Role> {
    return this.http.patch<Role>(`/roles/${roleId}`, { body: params });
  }

  async delete(roleId: string): Promise<void> {
    await this.http.delete<void>(`/roles/${roleId}`);
  }

  async assign(agentId: string, params: AssignRoleParams): Promise<AgentRoleAssignment> {
    return this.http.post<AgentRoleAssignment>(`/agents/${agentId}/roles`, { body: params });
  }

  async unassign(agentId: string, roleId: string): Promise<void> {
    await this.http.delete<void>(`/agents/${agentId}/roles/${roleId}`);
  }

  async listAgentRoles(agentId: string): Promise<{ agentId: string; roles: Role[] }> {
    return this.http.get<{ agentId: string; roles: Role[] }>(`/agents/${agentId}/roles`);
  }

  async getAncestors(roleId: string): Promise<Role[]> {
    return this.http.get<Role[]>(`/roles/${roleId}/ancestors`);
  }

  async getChildren(roleId: string): Promise<Role[]> {
    return this.http.get<Role[]>(`/roles/${roleId}/children`);
  }
}

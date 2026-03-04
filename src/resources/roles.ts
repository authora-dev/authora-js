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

/**
 * Resource class for managing roles and agent role assignments.
 *
 * Roles define sets of permissions that can be assigned to agents.
 */
export class RolesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new role in a workspace.
   *
   * @param params - Role creation parameters including permissions.
   * @returns The newly created role.
   */
  async create(params: CreateRoleParams): Promise<Role> {
    return this.http.post<Role>('/roles', { body: params });
  }

  /**
   * List roles in a workspace with optional pagination.
   *
   * @param params - Query parameters including workspaceId.
   * @returns A paginated list of roles.
   */
  async list(params: ListRolesParams): Promise<PaginatedList<Role>> {
    return this.http.get<PaginatedList<Role>>('/roles', { query: toQuery(params) });
  }

  /**
   * Retrieve a single role by its ID.
   *
   * @param roleId - The unique identifier of the role.
   * @returns The role object.
   */
  async get(roleId: string): Promise<Role> {
    return this.http.get<Role>(`/roles/${roleId}`);
  }

  /**
   * Update an existing role. Only provided fields are modified.
   *
   * @param roleId - The unique identifier of the role to update.
   * @param params - Fields to update.
   * @returns The updated role.
   */
  async update(roleId: string, params: UpdateRoleParams): Promise<Role> {
    return this.http.patch<Role>(`/roles/${roleId}`, { body: params });
  }

  /**
   * Delete a role by its ID.
   *
   * @param roleId - The unique identifier of the role to delete.
   */
  async delete(roleId: string): Promise<void> {
    await this.http.delete<void>(`/roles/${roleId}`);
  }

  /**
   * Assign a role to an agent.
   *
   * @param agentId - The agent to assign the role to.
   * @param params - Assignment parameters including the roleId.
   * @returns The role assignment record.
   */
  async assign(agentId: string, params: AssignRoleParams): Promise<AgentRoleAssignment> {
    return this.http.post<AgentRoleAssignment>(`/agents/${agentId}/roles`, { body: params });
  }

  /**
   * Remove a role assignment from an agent.
   *
   * @param agentId - The agent to remove the role from.
   * @param roleId - The role to unassign.
   */
  async unassign(agentId: string, roleId: string): Promise<void> {
    await this.http.delete<void>(`/agents/${agentId}/roles/${roleId}`);
  }

  /**
   * List all roles assigned to an agent.
   *
   * @param agentId - The unique identifier of the agent.
   * @returns Array of role assignments.
   */
  async listAgentRoles(agentId: string): Promise<{ agentId: string; roles: Role[] }> {
    return this.http.get<{ agentId: string; roles: Role[] }>(`/agents/${agentId}/roles`);
  }
}

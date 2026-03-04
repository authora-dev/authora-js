import type { HttpClient } from '../http.js';
import type {
  BatchPermissionCheckParams,
  BatchPermissionCheckResult,
  PermissionCheckParams,
  PermissionCheckResult,
} from '../types.js';

/**
 * Resource class for checking and querying agent permissions.
 *
 * Provides methods to check individual permissions, perform batch checks,
 * and retrieve the effective permissions for a given agent.
 */
export class PermissionsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Check whether an agent has a specific permission on a resource.
   *
   * @param params - Permission check parameters including agentId, resource, and action.
   * @returns The permission check result indicating whether the action is allowed.
   */
  async check(params: PermissionCheckParams): Promise<PermissionCheckResult> {
    return this.http.post<PermissionCheckResult>('/permissions/check', { body: params });
  }

  /**
   * Check multiple permissions for an agent in a single request.
   *
   * @param params - Batch check parameters including agentId and an array of checks.
   * @returns Results for each permission check in the batch.
   */
  async checkBatch(params: BatchPermissionCheckParams): Promise<BatchPermissionCheckResult> {
    return this.http.post<BatchPermissionCheckResult>('/permissions/check-batch', { body: params });
  }

  /**
   * Retrieve the effective (resolved) permissions for an agent.
   *
   * This returns the combined permissions from all roles, policies,
   * and delegations that apply to the agent.
   *
   * @param agentId - The unique identifier of the agent.
   * @returns Array of effective permissions.
   */
  async getEffective(agentId: string): Promise<{ agentId: string; permissions: string[]; denyPermissions: string[] }> {
    return this.http.get<{ agentId: string; permissions: string[]; denyPermissions: string[] }>(`/agents/${agentId}/permissions`);
  }
}

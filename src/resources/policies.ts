import type { HttpClient } from '../http.js';
import type {
  AttachPolicyParams,
  AddPermissionParams,
  CreatePolicyParams,
  EvaluatePolicyParams,
  ListAttachmentsParams,
  ListPoliciesParams,
  PaginatedList,
  Policy,
  PolicyAttachment,
  PolicyVersion,
  PolicyEvaluationResult,
  PolicySimulationResult,
  RemovePermissionParams,
  SimulatePolicyParams,
  UpdatePolicyParams,
} from '../types.js';
import { toQuery } from '../utils.js';

/**
 * Resource class for managing authorization policies.
 *
 * Policies define fine-grained access control rules that determine
 * whether agents can perform specific actions on resources.
 */
export class PoliciesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new policy in a workspace.
   *
   * @param params - Policy creation parameters.
   * @returns The newly created policy.
   */
  async create(params: CreatePolicyParams): Promise<Policy> {
    return this.http.post<Policy>('/policies', { body: params });
  }

  /**
   * List policies in a workspace.
   *
   * @param params - Query parameters including workspaceId.
   * @returns A paginated list of policies.
   */
  async list(params: ListPoliciesParams): Promise<PaginatedList<Policy>> {
    return this.http.get<PaginatedList<Policy>>('/policies', { query: toQuery(params) });
  }

  /**
   * Update an existing policy. Only provided fields are modified.
   *
   * @param policyId - The unique identifier of the policy to update.
   * @param params - Fields to update.
   * @returns The updated policy.
   */
  async update(policyId: string, params: UpdatePolicyParams): Promise<Policy> {
    return this.http.patch<Policy>(`/policies/${policyId}`, { body: params });
  }

  /**
   * Delete a policy by its ID.
   *
   * @param policyId - The unique identifier of the policy to delete.
   */
  async delete(policyId: string): Promise<void> {
    await this.http.delete<void>(`/policies/${policyId}`);
  }

  /**
   * Simulate a policy evaluation without enforcing the result.
   *
   * Useful for testing policy configurations before they go live.
   *
   * @param params - Simulation parameters.
   * @returns The simulation result showing which policies would match.
   */
  async simulate(params: SimulatePolicyParams): Promise<PolicySimulationResult> {
    return this.http.post<PolicySimulationResult>('/policies/simulate', { body: params });
  }

  async evaluate(params: EvaluatePolicyParams): Promise<PolicyEvaluationResult> {
    return this.http.post<PolicyEvaluationResult>('/policies/evaluate', { body: params });
  }

  async listVersions(policyId: string): Promise<PolicyVersion[]> {
    const res = await this.http.get<{ items: PolicyVersion[] }>(`/policies/${policyId}/versions`);
    return res.items ?? (res as unknown as PolicyVersion[]);
  }

  async getVersion(policyId: string, version: number): Promise<PolicyVersion> {
    return this.http.get<PolicyVersion>(`/policies/${policyId}/versions/${version}`);
  }

  async rollback(policyId: string, version: number, changedBy?: string): Promise<Policy> {
    return this.http.post<Policy>(`/policies/${policyId}/rollback`, { body: { version, changedBy } });
  }

  /**
   * Attach a policy to an agent or MCP server.
   * Idempotent -- returns existing attachment if already attached.
   */
  async attachToTarget(params: AttachPolicyParams): Promise<PolicyAttachment> {
    return this.http.post<PolicyAttachment>('/policies/attachments', { body: params });
  }

  /**
   * Detach a policy from an agent or MCP server by composite key.
   */
  async detachFromTarget(params: AttachPolicyParams): Promise<void> {
    await this.http.post<void>('/policies/detach', { body: params });
  }

  /**
   * Detach a policy attachment by its ID.
   */
  async detachById(attachmentId: string): Promise<void> {
    await this.http.delete<void>(`/policies/attachments/${attachmentId}`);
  }

  /**
   * List all policies attached to a specific agent or MCP server.
   */
  async listAttachments(params: ListAttachmentsParams): Promise<PaginatedList<PolicyAttachment>> {
    return this.http.get<PaginatedList<PolicyAttachment>>('/policies/attachments', { query: toQuery(params) });
  }

  /**
   * List all targets (agents and MCP servers) a policy is attached to.
   */
  async listPolicyTargets(policyId: string): Promise<PaginatedList<PolicyAttachment>> {
    return this.http.get<PaginatedList<PolicyAttachment>>(`/policies/${policyId}/attachments`);
  }

  /**
   * Add resources and/or actions to an existing policy without replacing current ones.
   * Use this to update permissions on an already-attached policy instead of creating a new one.
   */
  async addPermission(params: AddPermissionParams): Promise<Policy> {
    return this.http.post<Policy>('/policies/add-permission', { body: params });
  }

  /**
   * Remove specific resources and/or actions from an existing policy.
   */
  async removePermission(params: RemovePermissionParams): Promise<Policy> {
    return this.http.post<Policy>('/policies/remove-permission', { body: params });
  }
}

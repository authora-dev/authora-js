import type { HttpClient } from '../http.js';
import type {
  CreatePolicyParams,
  EvaluatePolicyParams,
  ListPoliciesParams,
  PaginatedList,
  Policy,
  PolicyEvaluationResult,
  PolicySimulationResult,
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

  /**
   * Evaluate policies for a given agent, resource, and action.
   *
   * @param params - Evaluation parameters.
   * @returns The evaluation result.
   */
  async evaluate(params: EvaluatePolicyParams): Promise<PolicyEvaluationResult> {
    return this.http.post<PolicyEvaluationResult>('/policies/evaluate', { body: params });
  }
}

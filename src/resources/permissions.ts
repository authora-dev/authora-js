import type { HttpClient } from '../http.js';
import type {
  BatchPermissionCheckParams,
  BatchPermissionCheckResult,
  EffectivePermissions,
  PermissionCheckParams,
  PermissionCheckResult,
} from '../types.js';

export class PermissionsResource {
  constructor(private readonly http: HttpClient) {}

  async check(params: PermissionCheckParams): Promise<PermissionCheckResult> {
    return this.http.post<PermissionCheckResult>('/permissions/check', { body: params });
  }

  async checkBatch(params: BatchPermissionCheckParams): Promise<BatchPermissionCheckResult> {
    return this.http.post<BatchPermissionCheckResult>('/permissions/check-batch', { body: params });
  }

  async getEffective(agentId: string): Promise<EffectivePermissions> {
    return this.http.get<EffectivePermissions>(`/agents/${agentId}/permissions`);
  }
}

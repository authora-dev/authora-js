import type { HttpClient } from '../http.js';
import type {
  ApprovalChallenge,
  ListApprovalsParams,
  ApprovalStats,
  DecideApprovalParams,
  BulkDecideParams,
  BulkDecideResult,
  ApprovalSettings,
  UpdateApprovalSettingsParams,
  TestAiParams,
  TestAiResult,
  ApprovalPattern,
  ListPatternsParams,
  EscalationRule,
  CreateEscalationRuleParams,
  UpdateEscalationRuleParams,
  ApprovalWebhook,
  CreateApprovalWebhookParams,
  UpdateApprovalWebhookParams,
  PushSubscribeParams,
  PermissionSuggestion,
  PaginatedList,
} from '../types.js';

export class ApprovalsResource {
  constructor(private readonly http: HttpClient) {}

  async create(params: {
    organizationId: string;
    workspaceId: string;
    agentId: string;
    challengeType?: 'tool_call' | 'agent_onboarding';
    mcpServerId?: string;
    toolName?: string;
    arguments?: Record<string, unknown>;
    resource: string;
    action: string;
    context?: Record<string, unknown>;
    riskInput?: Record<string, unknown>;
  }): Promise<ApprovalChallenge> {
    return this.http.post('/approvals', { body: params });
  }

  async list(params?: ListApprovalsParams): Promise<PaginatedList<ApprovalChallenge>> {
    return this.http.get('/approvals', { query: params as Record<string, string | number | boolean | undefined> });
  }

  async get(id: string): Promise<ApprovalChallenge> {
    return this.http.get(`/approvals/${id}`);
  }

  async getStatus(id: string): Promise<{ status: string }> {
    return this.http.get(`/approvals/${id}/status`);
  }

  async stats(): Promise<ApprovalStats> {
    return this.http.get('/approvals/stats');
  }

  async decide(id: string, params: DecideApprovalParams): Promise<ApprovalChallenge> {
    return this.http.post(`/approvals/${id}/decide`, { body: params });
  }

  async bulkDecide(params: BulkDecideParams): Promise<BulkDecideResult> {
    return this.http.post('/approvals/bulk-decide', { body: params });
  }

  async suggestions(id: string): Promise<PermissionSuggestion[]> {
    return this.http.post(`/approvals/${id}/suggestions`);
  }

  async getSettings(): Promise<ApprovalSettings> {
    return this.http.get('/approvals/settings');
  }

  async updateSettings(params: UpdateApprovalSettingsParams): Promise<ApprovalSettings> {
    return this.http.patch('/approvals/settings', { body: params });
  }

  async testAi(params: TestAiParams): Promise<TestAiResult> {
    return this.http.post('/approvals/settings/test-ai', { body: params });
  }

  async listPatterns(params?: ListPatternsParams): Promise<ApprovalPattern[]> {
    return this.http.get('/approvals/patterns', { query: params as Record<string, string | number | boolean | undefined> });
  }

  async dismissPattern(id: string): Promise<void> {
    await this.http.post(`/approvals/patterns/${id}/dismiss`);
  }

  async createPolicyFromPattern(id: string): Promise<unknown> {
    return this.http.post(`/approvals/patterns/${id}/create-policy`);
  }

  async listEscalationRules(): Promise<EscalationRule[]> {
    return this.http.get('/approvals/escalation-rules');
  }

  async getEscalationRule(id: string): Promise<EscalationRule> {
    return this.http.get(`/approvals/escalation-rules/${id}`);
  }

  async createEscalationRule(params: CreateEscalationRuleParams): Promise<EscalationRule> {
    return this.http.post('/approvals/escalation-rules', { body: params });
  }

  async updateEscalationRule(id: string, params: UpdateEscalationRuleParams): Promise<EscalationRule> {
    return this.http.patch(`/approvals/escalation-rules/${id}`, { body: params });
  }

  async deleteEscalationRule(id: string): Promise<void> {
    await this.http.delete(`/approvals/escalation-rules/${id}`);
  }

  async getVapidKey(): Promise<{ publicKey: string }> {
    return this.http.get('/approvals/push/vapid-key');
  }

  async subscribePush(params: PushSubscribeParams): Promise<void> {
    await this.http.post('/approvals/push/subscribe', { body: params });
  }

  async unsubscribePush(endpoint: string): Promise<void> {
    await this.http.post('/approvals/push/unsubscribe', { body: { endpoint } });
  }

  async listWebhooks(): Promise<ApprovalWebhook[]> {
    return this.http.get('/approvals/webhooks');
  }

  async createWebhook(params: CreateApprovalWebhookParams): Promise<ApprovalWebhook> {
    return this.http.post('/approvals/webhooks', { body: params });
  }

  async updateWebhook(id: string, params: UpdateApprovalWebhookParams): Promise<ApprovalWebhook> {
    return this.http.patch(`/approvals/webhooks/${id}`, { body: params });
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.http.delete(`/approvals/webhooks/${id}`);
  }
}

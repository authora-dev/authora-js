import type { HttpClient } from '../http.js';
import type {
  CreateWorkspaceParams,
  ListWorkspacesParams,
  PaginatedList,
  UpdateWorkspaceParams,
  Workspace,
  WorkspaceStats,
} from '../types.js';
import { toQuery } from '../utils.js';

export class WorkspacesResource {
  constructor(private readonly http: HttpClient) {}

  async create(params: CreateWorkspaceParams): Promise<Workspace> {
    return this.http.post<Workspace>('/workspaces', { body: params });
  }

  async get(workspaceId: string): Promise<Workspace> {
    return this.http.get<Workspace>(`/workspaces/${workspaceId}`);
  }

  async list(params: ListWorkspacesParams): Promise<PaginatedList<Workspace>> {
    return this.http.get<PaginatedList<Workspace>>('/workspaces', { query: toQuery(params) });
  }

  async getStats(workspaceId: string): Promise<WorkspaceStats> {
    return this.http.get<WorkspaceStats>(`/workspaces/${workspaceId}/stats`);
  }

  async update(workspaceId: string, params: UpdateWorkspaceParams): Promise<Workspace> {
    return this.http.patch<Workspace>(`/workspaces/${workspaceId}`, { body: params });
  }

  async delete(workspaceId: string): Promise<Workspace> {
    return this.http.delete<Workspace>(`/workspaces/${workspaceId}`);
  }

  async restore(workspaceId: string): Promise<Workspace> {
    return this.http.post<Workspace>(`/workspaces/${workspaceId}/restore`);
  }
}

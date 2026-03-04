import type { HttpClient } from '../http.js';
import type {
  CreateWorkspaceParams,
  ListWorkspacesParams,
  PaginatedList,
  Workspace,
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
}

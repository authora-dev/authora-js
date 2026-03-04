import type { HttpClient } from '../http.js';
import type {
  CreateWorkspaceParams,
  ListWorkspacesParams,
  PaginatedList,
  Workspace,
} from '../types.js';
import { toQuery } from '../utils.js';

/**
 * Resource class for managing workspaces within an organization.
 *
 * Workspaces provide logical isolation for agents, roles, policies,
 * and other resources within an organization.
 */
export class WorkspacesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new workspace in an organization.
   *
   * @param params - Workspace creation parameters.
   * @returns The newly created workspace.
   */
  async create(params: CreateWorkspaceParams): Promise<Workspace> {
    return this.http.post<Workspace>('/workspaces', { body: params });
  }

  /**
   * Retrieve a workspace by its ID.
   *
   * @param workspaceId - The unique identifier of the workspace.
   * @returns The workspace object.
   */
  async get(workspaceId: string): Promise<Workspace> {
    return this.http.get<Workspace>(`/workspaces/${workspaceId}`);
  }

  /**
   * List workspaces for an organization with optional pagination.
   *
   * @param params - Query parameters including organizationId.
   * @returns A paginated list of workspaces.
   */
  async list(params: ListWorkspacesParams): Promise<PaginatedList<Workspace>> {
    return this.http.get<PaginatedList<Workspace>>('/workspaces', { query: toQuery(params) });
  }
}

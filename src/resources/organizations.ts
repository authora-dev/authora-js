import type { HttpClient } from '../http.js';
import type {
  CreateOrganizationParams,
  ListOrganizationsParams,
  Organization,
  PaginatedList,
} from '../types.js';
import { toQuery } from '../utils.js';

/**
 * Resource class for managing organizations.
 *
 * Organizations are the top-level entity in Authora and serve as
 * the container for workspaces, users, and billing.
 */
export class OrganizationsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new organization.
   *
   * @param params - Organization creation parameters.
   * @returns The newly created organization.
   */
  async create(params: CreateOrganizationParams): Promise<Organization> {
    return this.http.post<Organization>('/organizations', { body: params });
  }

  /**
   * Retrieve an organization by its ID.
   *
   * @param orgId - The unique identifier of the organization.
   * @returns The organization object.
   */
  async get(orgId: string): Promise<Organization> {
    return this.http.get<Organization>(`/organizations/${orgId}`);
  }

  /**
   * List organizations with optional pagination.
   *
   * @param params - Optional pagination parameters.
   * @returns A paginated list of organizations.
   */
  async list(params?: ListOrganizationsParams): Promise<PaginatedList<Organization>> {
    return this.http.get<PaginatedList<Organization>>(
      '/organizations',
      params ? { query: toQuery(params) } : undefined,
    );
  }
}

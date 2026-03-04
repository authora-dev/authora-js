import type { HttpClient } from '../http.js';
import type {
  CreateOrganizationParams,
  ListOrganizationsParams,
  Organization,
  PaginatedList,
} from '../types.js';
import { toQuery } from '../utils.js';

export class OrganizationsResource {
  constructor(private readonly http: HttpClient) {}

  async create(params: CreateOrganizationParams): Promise<Organization> {
    return this.http.post<Organization>('/organizations', { body: params });
  }

  async get(orgId: string): Promise<Organization> {
    return this.http.get<Organization>(`/organizations/${orgId}`);
  }

  async list(params?: ListOrganizationsParams): Promise<PaginatedList<Organization>> {
    return this.http.get<PaginatedList<Organization>>(
      '/organizations',
      params ? { query: toQuery(params) } : undefined,
    );
  }
}

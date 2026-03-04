import type { HttpClient } from '../http.js';
import type {
  ListMcpServersParams,
  McpProxyRequest,
  McpProxyResponse,
  McpServer,
  McpTool,
  PaginatedList,
  RegisterMcpServerParams,
  RegisterMcpToolParams,
  UpdateMcpServerParams,
} from '../types.js';
import { toQuery } from '../utils.js';

export class McpResource {
  constructor(private readonly http: HttpClient) {}

  async register(params: RegisterMcpServerParams): Promise<McpServer> {
    return this.http.post<McpServer>('/mcp/servers', { body: params });
  }

  async listServers(params: ListMcpServersParams): Promise<PaginatedList<McpServer>> {
    return this.http.get<PaginatedList<McpServer>>('/mcp/servers', { query: toQuery(params) });
  }

  async getServer(serverId: string): Promise<McpServer> {
    return this.http.get<McpServer>(`/mcp/servers/${serverId}`);
  }

  async updateServer(serverId: string, params: UpdateMcpServerParams): Promise<McpServer> {
    return this.http.patch<McpServer>(`/mcp/servers/${serverId}`, { body: params });
  }

  async listTools(serverId: string): Promise<McpTool[]> {
    const res = await this.http.get<{ items: McpTool[] }>(`/mcp/servers/${serverId}/tools`);
    return res.items ?? (res as unknown as McpTool[]);
  }

  async registerTool(serverId: string, params: RegisterMcpToolParams): Promise<McpTool> {
    return this.http.post<McpTool>(`/mcp/servers/${serverId}/tools`, { body: params });
  }

  async proxy(body: McpProxyRequest): Promise<McpProxyResponse> {
    return this.http.post<McpProxyResponse>('/mcp/proxy', { body });
  }
}

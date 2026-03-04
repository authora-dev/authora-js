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

/**
 * Resource class for managing MCP (Model Context Protocol) servers and tools.
 *
 * Provides methods to register, manage, and proxy requests to MCP servers
 * that agents can use for tool execution.
 */
export class McpResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Register a new MCP server in a workspace.
   *
   * @param params - Server registration parameters.
   * @returns The registered MCP server.
   */
  async register(params: RegisterMcpServerParams): Promise<McpServer> {
    return this.http.post<McpServer>('/mcp/servers', { body: params });
  }

  /**
   * List MCP servers in a workspace.
   *
   * @param params - Query parameters including workspaceId.
   * @returns A paginated list of MCP servers.
   */
  async listServers(params: ListMcpServersParams): Promise<PaginatedList<McpServer>> {
    return this.http.get<PaginatedList<McpServer>>('/mcp/servers', { query: toQuery(params) });
  }

  /**
   * Retrieve a single MCP server by its ID.
   *
   * @param serverId - The unique identifier of the MCP server.
   * @returns The MCP server object.
   */
  async getServer(serverId: string): Promise<McpServer> {
    return this.http.get<McpServer>(`/mcp/servers/${serverId}`);
  }

  /**
   * Update an existing MCP server. Only provided fields are modified.
   *
   * @param serverId - The unique identifier of the MCP server to update.
   * @param params - Fields to update.
   * @returns The updated MCP server.
   */
  async updateServer(serverId: string, params: UpdateMcpServerParams): Promise<McpServer> {
    return this.http.patch<McpServer>(`/mcp/servers/${serverId}`, { body: params });
  }

  /**
   * List tools registered for an MCP server.
   *
   * @param serverId - The unique identifier of the MCP server.
   * @returns Array of tools.
   */
  async listTools(serverId: string): Promise<McpTool[]> {
    const res = await this.http.get<{ items: McpTool[] }>(`/mcp/servers/${serverId}/tools`);
    return res.items ?? (res as unknown as McpTool[]);
  }

  /**
   * Register a new tool for an MCP server.
   *
   * @param serverId - The unique identifier of the MCP server.
   * @param params - Tool registration parameters.
   * @returns The registered tool.
   */
  async registerTool(serverId: string, params: RegisterMcpToolParams): Promise<McpTool> {
    return this.http.post<McpTool>(`/mcp/servers/${serverId}/tools`, { body: params });
  }

  /**
   * Proxy a JSON-RPC request to an MCP server.
   *
   * @param body - A JSON-RPC 2.0 request object.
   * @returns The JSON-RPC 2.0 response.
   */
  async proxy(body: McpProxyRequest): Promise<McpProxyResponse> {
    return this.http.post<McpProxyResponse>('/mcp/proxy', { body });
  }
}

export interface MCPResponse<T = any> {
  jsonrpc: string;
  id: number;
  result?: {
    content: { type: string; text: string }[];
    isError?: boolean;
    data?: T;
  };
  error?: {
    code: number;
    message: string;
  };
}

export class MCPClient {
  private requestId = 0;
  private connections: Map<string, string> = new Map();
  private eventSources: Map<string, EventSource> = new Map();
  private sessionEndpoints: Map<string, string> = new Map();

  constructor() {
    console.log("CulinaryOS MCP Client Manager Initialized.");
  }

  /**
   * Connect to an external MCP server via Server-Sent Events (SSE) or WebSockets.
   */
  async connect(serverName: string, endpointUrl: string): Promise<boolean> {
    this.connections.set(serverName, endpointUrl);
    console.log(`Configuring connection to MCP Server [${serverName}] at: ${endpointUrl}`);

    if (endpointUrl.startsWith("http://") || endpointUrl.startsWith("https://")) {
      try {
        // Close existing EventSource if any
        const existing = this.eventSources.get(serverName);
        if (existing) {
          existing.close();
        }

        const eventSource = new EventSource(endpointUrl);
        this.eventSources.set(serverName, eventSource);

        eventSource.onopen = () => {
          console.log(`[MCP SSE] Connected to ${serverName}`);
        };

        eventSource.onerror = (err) => {
          console.error(`[MCP SSE Error] Server ${serverName}:`, err);
        };

        // Listen for the dynamic POST endpoint URL provided by the SSE server
        eventSource.addEventListener("endpoint", (event: MessageEvent) => {
          try {
            const rawUrl = event.data;
            const postUrl = new URL(rawUrl, endpointUrl).toString();
            this.sessionEndpoints.set(serverName, postUrl);
            console.log(`[MCP SSE] Session URL set for ${serverName}: ${postUrl}`);
          } catch (e) {
            console.error("[MCP SSE] Failed to parse session endpoint url:", e);
          }
        });

        // Listen for incoming server notifications or custom events
        eventSource.onmessage = (event) => {
          console.log(`[MCP SSE Message from ${serverName}]:`, event.data);
        };

      } catch (err) {
        console.error(`[MCP SSE] Connection initialization failed for ${serverName}:`, err);
        return false;
      }
    }
    return true;
  }

  /**
   * Call a tool on an external MCP server using standard JSON-RPC 2.0 formats.
   */
  async callTool<T = any>(
    serverName: string,
    toolName: string,
    args: any
  ): Promise<T> {
    this.requestId++;
    const currentId = this.requestId;

    // Build standard JSON-RPC envelope
    const jsonRpcEnvelope = {
      jsonrpc: "2.0",
      id: currentId,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args
      }
    };

    console.log(`[MCP Outbox ──> ${serverName}]:`, JSON.stringify(jsonRpcEnvelope, null, 2));

    const sseEndpoint = this.sessionEndpoints.get(serverName);

    if (sseEndpoint) {
      // Real SSE Transport over HTTP POST
      try {
        const response = await fetch(sseEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(jsonRpcEnvelope)
        });

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        // Standard MCP SSE replies can either come down the HTTP response, or through the event stream.
        // We handle the immediate JSON response.
        const resText = await response.text();
        if (resText) {
          const mcpResponse: MCPResponse<T> = JSON.parse(resText);
          console.log(`[MCP Inbox <── ${serverName}]:`, JSON.stringify(mcpResponse, null, 2));

          if (mcpResponse.error) {
            throw new Error(mcpResponse.error.message);
          } else if (mcpResponse.result?.isError) {
            throw new Error(mcpResponse.result.content[0].text);
          } else {
            return mcpResponse.result?.data as T;
          }
        }
      } catch (err: any) {
        console.error(`[MCP Real Transport Error] ${serverName} failed. Falling back to simulator.`, err);
      }
    }

    // Simulated local-first transport fallback for the browser demo
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const response = this.simulateServerResponse<T>(serverName, toolName, args, currentId);
        
        console.log(`[MCP Inbox (Simulated) <── ${serverName}]:`, JSON.stringify(response, null, 2));

        if (response.error) {
          reject(new Error(response.error.message));
        } else if (response.result?.isError) {
          reject(new Error(response.result.content[0].text));
        } else {
          resolve(response.result?.data as T);
        }
      }, 300); // 300ms simulated network latency
    });
  }

  /**
   * Simulates local-first MCP server tool outputs for demo execution.
   */
  private simulateServerResponse<T>(
    serverName: string,
    toolName: string,
    args: any,
    id: number
  ): MCPResponse<T> {
    const errorResponse = (msg: string) => ({
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message: msg }
    });

    switch (serverName) {
      case "pos-server":
        if (toolName === "create_order") {
          const orderId = `o-${Math.floor(100 + Math.random() * 900)}`;
          const ticketId = `t-${Math.floor(200 + Math.random() * 900)}`;
          return {
            jsonrpc: "2.0",
            id,
            result: {
              content: [{ type: "text", text: `Order created successfully.` }],
              data: { orderId, ticketId, items: args.items, tableNumber: args.tableNumber } as any
            }
          };
        }
        break;

      case "kds-server":
        if (toolName === "bump_kds_ticket") {
          return {
            jsonrpc: "2.0",
            id,
            result: {
              content: [{ type: "text", text: `Ticket ${args.ticketId} bumped.` }],
              data: { ticketId: args.ticketId, status: "bumped" } as any
            }
          };
        }
        break;

      case "inventory-server":
        if (toolName === "log_audit_count") {
          const currentQty = 12.5; // Mock bread flour qty
          const costPerUnit = 2.00;
          const variance = args.physicalQty - currentQty;
          const loss = Math.abs(variance * costPerUnit);
          return {
            jsonrpc: "2.0",
            id,
            result: {
              content: [{ type: "text", text: `Audit logged successfully.` }],
              data: { itemId: args.itemId, variance, loss, actualQty: args.physicalQty } as any
            }
          };
        }
        break;
    }

    return errorResponse(`Tool '${toolName}' or Server '${serverName}' not supported by mock simulator.`);
  }

  /**
   * Close all active event streams on teardown.
   */
  disconnectAll() {
    for (const source of this.eventSources.values()) {
      source.close();
    }
    this.eventSources.clear();
    this.sessionEndpoints.clear();
  }
}

export const mcp = new MCPClient();

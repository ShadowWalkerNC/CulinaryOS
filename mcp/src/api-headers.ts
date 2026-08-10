/** Shared auth headers for MCP → CulinaryOS API calls. */

export function culinaryOsApiHeaders(): Record<string, string> {
  const tenantId =
    process.env.VITE_TENANT_ID ||
    process.env.TENANT_ID ||
    "00000000-0000-0000-0000-000000000001";
  const token =
    process.env.DEVICE_API_KEY ||
    process.env.INTERNAL_API_KEY ||
    process.env.VITE_DEVICE_API_KEY ||
    "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tenant-Id": tenantId,
    "X-Caller-Service": "mcp",
  };
  if (token && !/change-me|your-|placeholder/i.test(token)) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function culinaryOsBaseUrl(): string {
  return (process.env.CULINARYOS_URL || "http://localhost:3000").replace(/\/$/, "");
}

export type KdsTicketAction = 'bump' | 'hold' | 'fire';

export async function requestKdsTicketAction(
  apiBase: string,
  ticketId: string,
  action: KdsTicketAction,
  headers: Record<string, string>,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  return fetchImpl(`${apiBase}/v1/kds/tickets/${encodeURIComponent(ticketId)}/${action}`, {
    method: 'PATCH',
    headers,
  });
}

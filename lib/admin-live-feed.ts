export type AdminLiveFeedEvent = {
  id: string;
  at: string;
  agent_slug: string;
  agent_name: string;
  phase: string;
  payment_request?: Record<string, unknown>;
  decision?: { status?: string; reason?: string };
  case?: { id?: string; risk_level?: string };
};

export type AdminLiveFeedResponse = {
  events: AdminLiveFeedEvent[];
  stats?: {
    total_events?: number;
    by_agent?: Record<string, { approved: number; blocked: number; pending: number; decisions?: number }>;
  };
  fallback?: string;
};

export async function fetchAdminLiveFeed(request: Request, limit = 100): Promise<AdminLiveFeedResponse> {
  const origin = new URL(request.url).origin;
  const response = await fetch(`${origin}/api/demo/live-feed?limit=${limit}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    return { events: [], stats: { total_events: 0, by_agent: {} }, fallback: "memory" };
  }

  const data = (await response.json()) as Partial<AdminLiveFeedResponse>;
  return {
    events: Array.isArray(data.events) ? data.events : [],
    stats: data.stats,
    fallback: data.fallback
  };
}

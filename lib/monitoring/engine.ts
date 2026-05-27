import { getPrisma } from "../prisma";

const VELOCITY_WINDOW_MINUTES = 10;
const VELOCITY_MAX_REQUESTS = 5;
const AMOUNT_SPIKE_MULTIPLIER = 3;
const REPEAT_MERCHANT_WINDOW_HOURS = 1;
const REPEAT_MERCHANT_MAX = 3;

interface AlertInput {
  alertType: string;
  severity: string;
  description: string;
  triggeringIds: string[];
}

export async function runMonitoringChecks(
  agentSlug: string,
  currentEventId: string,
  amountUsd: number,
  merchant: string
): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  const prisma = getPrisma();
  const alerts: AlertInput[] = [];

  const velocityWindow = new Date(Date.now() - VELOCITY_WINDOW_MINUTES * 60 * 1000);
  const merchantWindow = new Date(Date.now() - REPEAT_MERCHANT_WINDOW_HOURS * 60 * 60 * 1000);

  const [recentEvents, merchantEvents] = await Promise.all([
    prisma.kyaLiveFeedEvent.findMany({
      where: { agentSlug, at: { gte: velocityWindow }, phase: "decision" },
      select: { id: true, payment: true }
    }),
    prisma.kyaLiveFeedEvent.findMany({
      where: {
        agentSlug,
        at: { gte: merchantWindow },
        phase: "decision",
        payment: { path: ["merchant"], equals: merchant }
      },
      select: { id: true }
    })
  ]);

  // Velocity check
  if (recentEvents.length >= VELOCITY_MAX_REQUESTS) {
    alerts.push({
      alertType: "VELOCITY",
      severity: "WARNING",
      description: `Agent ${agentSlug} made ${recentEvents.length} requests in the last ${VELOCITY_WINDOW_MINUTES} minutes`,
      triggeringIds: [currentEventId, ...recentEvents.map((e) => e.id)]
    });
  }

  // Amount spike check vs recent average
  const amounts = recentEvents
    .map((e) => {
      const p = e.payment as Record<string, unknown> | null;
      return p ? parseFloat(String(p.amount_usd ?? "0")) : 0;
    })
    .filter((a) => a > 0);

  if (amounts.length >= 2) {
    const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    if (amountUsd > avg * AMOUNT_SPIKE_MULTIPLIER) {
      alerts.push({
        alertType: "AMOUNT_SPIKE",
        severity: "WARNING",
        description: `Amount $${amountUsd.toFixed(2)} is ${(amountUsd / avg).toFixed(1)}x the agent's recent average of $${avg.toFixed(2)}`,
        triggeringIds: [currentEventId]
      });
    }
  }

  // Repeat merchant check
  if (merchantEvents.length >= REPEAT_MERCHANT_MAX) {
    alerts.push({
      alertType: "REPEAT_MERCHANT",
      severity: "INFO",
      description: `Agent ${agentSlug} made ${merchantEvents.length} payments to ${merchant} in the last ${REPEAT_MERCHANT_WINDOW_HOURS}h`,
      triggeringIds: [currentEventId, ...merchantEvents.map((e) => e.id)]
    });
  }

  if (alerts.length > 0) {
    await prisma.kyaMonitoringAlert.createMany({
      data: alerts.map((a) => ({ ...a, agentSlug, triggeringIds: a.triggeringIds }))
    });
  }
}

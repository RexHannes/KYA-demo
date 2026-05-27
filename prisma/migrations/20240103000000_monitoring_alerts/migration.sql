CREATE TABLE "kya_monitoring_alerts" (
    "id" TEXT NOT NULL,
    "agent_slug" TEXT NOT NULL,
    "alert_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "triggering_ids" JSONB NOT NULL DEFAULT '[]',
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode" TEXT NOT NULL DEFAULT 'demo',

    CONSTRAINT "kya_monitoring_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "kya_monitoring_alerts_agent_slug_idx" ON "kya_monitoring_alerts"("agent_slug");
CREATE INDEX "kya_monitoring_alerts_created_at_idx" ON "kya_monitoring_alerts"("created_at" DESC);

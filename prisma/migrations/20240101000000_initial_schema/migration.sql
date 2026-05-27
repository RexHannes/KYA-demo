-- CreateTable
CREATE TABLE "kya_entities" (
    "id" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'demo',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kya_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kya_kv" (
    "namespace" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'demo',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kya_kv_pkey" PRIMARY KEY ("namespace","key")
);

-- CreateTable
CREATE TABLE "kya_counters" (
    "prefix" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "mode" TEXT NOT NULL DEFAULT 'demo',

    CONSTRAINT "kya_counters_pkey" PRIMARY KEY ("prefix")
);

-- CreateTable
CREATE TABLE "kya_audit_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "case_id" TEXT,
    "input_hash" TEXT NOT NULL,
    "output_hash" TEXT NOT NULL,
    "policy_version" TEXT,
    "previous_event_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "event_hash" TEXT NOT NULL,
    "payload" JSONB,
    "mode" TEXT NOT NULL DEFAULT 'demo',

    CONSTRAINT "kya_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kya_live_feed_events" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agent_slug" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "message" TEXT,
    "llm" JSONB,
    "payment_request" JSONB,
    "decision" JSONB,
    "receipt" JSONB,
    "case" JSONB,
    "obeyed" BOOLEAN,
    "mode" TEXT NOT NULL DEFAULT 'demo',

    CONSTRAINT "kya_live_feed_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kya_api_keys" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "scopes" JSONB NOT NULL DEFAULT '["payment:check","payment:execute_mock","evidence:read"]',
    "expires_at" TIMESTAMP(3),
    "rate_limit_per_minute" INTEGER,
    "last_used_at" TIMESTAMP(3),
    "last_used_ip" TEXT,
    "last_used_user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "mode" TEXT NOT NULL DEFAULT 'demo',

    CONSTRAINT "kya_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kya_status_snapshot" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "audit_chain_valid" BOOLEAN NOT NULL DEFAULT true,
    "total_audit_events" INTEGER NOT NULL DEFAULT 0,
    "total_decisions" INTEGER NOT NULL DEFAULT 0,
    "last_cron_at" TIMESTAMP(3),
    "last_cron_agent" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kya_status_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kya_entities_collection_id_key" ON "kya_entities"("collection", "id");

-- CreateIndex
CREATE INDEX "kya_entities_collection_idx" ON "kya_entities"("collection");

-- CreateIndex
CREATE INDEX "kya_audit_events_subject_id_idx" ON "kya_audit_events"("subject_id");

-- CreateIndex
CREATE INDEX "kya_audit_events_created_at_idx" ON "kya_audit_events"("created_at");

-- CreateIndex
CREATE INDEX "kya_live_feed_events_at_idx" ON "kya_live_feed_events"("at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "kya_api_keys_key_hash_key" ON "kya_api_keys"("key_hash");

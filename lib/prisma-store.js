import { createId } from "./vendor/agentpay/shared/schemas.js";

const COLLECTIONS = [
  "principals",
  "users",
  "agents",
  "mandates",
  "payment_requests",
  "policy_decisions",
  "payments",
  "receipts",
  "cases"
];

function wrapEntityMap(map) {
  return {
    get(id) {
      return map.get(id);
    },
    set(id, value) {
      map.set(id, value);
    },
    has(id) {
      return map.has(id);
    },
    values() {
      return map.values();
    },
    entries() {
      return map.entries();
    },
    [Symbol.iterator]() {
      return map[Symbol.iterator]();
    }
  };
}

function wrapKvMap(map) {
  return {
    get(key) {
      return map.get(key);
    },
    set(key, value) {
      map.set(key, value);
    },
    has(key) {
      return map.has(key);
    }
  };
}

export async function createPrismaStore(prisma, { mode = "demo" } = {}) {
  const entityRows = await prisma.kyaEntity.findMany({ where: { mode } });
  const maps = Object.fromEntries(COLLECTIONS.map((name) => [name, new Map()]));
  for (const row of entityRows) {
    if (maps[row.collection]) {
      maps[row.collection].set(row.id, row.data);
    }
  }

  const kvRows = await prisma.kyaKv.findMany({ where: { mode } });
  const idempotency = new Map();
  const merchantRequestIndex = new Map();
  const nonceIndex = new Map();
  for (const row of kvRows) {
    if (row.namespace === "idempotency") idempotency.set(row.key, row.value);
    if (row.namespace === "merchant_request_index") merchantRequestIndex.set(row.key, row.value);
    if (row.namespace === "nonce_index") nonceIndex.set(row.key, row.value);
  }

  const auditRows = await prisma.kyaAuditEvent.findMany({
    where: { mode },
    orderBy: { createdAt: "asc" }
  });
  const auditEvents = auditRows.map((row) => ({
    id: row.id,
    type: row.type,
    actor: row.actor,
    subject_id: row.subjectId,
    case_id: row.caseId,
    input_hash: row.inputHash,
    output_hash: row.outputHash,
    policy_version: row.policyVersion,
    previous_event_hash: row.previousEventHash,
    created_at: row.createdAt.toISOString(),
    event_hash: row.eventHash,
    ...(row.payload ?? {})
  }));

  const counters = new Map(
    (await prisma.kyaCounter.findMany({ where: { mode } })).map((row) => [row.prefix, row.value])
  );

  const dirty = {
    entities: new Set(),
    kv: new Set(),
    audit: [],
    counters: new Set()
  };

  const store = {
    kind: "postgres",
    path: "supabase",
    mode,
    principals: wrapEntityMap(maps.principals),
    users: wrapEntityMap(maps.users),
    agents: wrapEntityMap(maps.agents),
    mandates: wrapEntityMap(maps.mandates),
    paymentRequests: wrapEntityMap(maps.payment_requests),
    policyDecisions: wrapEntityMap(maps.policy_decisions),
    payments: wrapEntityMap(maps.payments),
    receipts: wrapEntityMap(maps.receipts),
    cases: wrapEntityMap(maps.cases),
    idempotency: wrapKvMap(idempotency),
    merchantRequestIndex: wrapKvMap(merchantRequestIndex),
    nonceIndex: wrapKvMap(nonceIndex),
    auditEvents: {
      get length() {
        return auditEvents.length;
      },
      at(index) {
        return auditEvents.at(index);
      },
      push(event) {
        auditEvents.push(event);
        dirty.audit.push(event);
        return auditEvents.length;
      },
      map(callback) {
        return auditEvents.map(callback);
      },
      filter(callback) {
        return auditEvents.filter(callback);
      },
      [Symbol.iterator]() {
        return auditEvents[Symbol.iterator]();
      }
    },
    nextId(prefix) {
      const next = (counters.get(prefix) ?? 0) + 1;
      counters.set(prefix, next);
      dirty.counters.add(prefix);
      return createId(prefix, next);
    },
    _trackEntity(collection, id) {
      dirty.entities.add(`${collection}:${id}`);
    },
    async persist() {
      for (const collection of COLLECTIONS) {
        const map = maps[collection];
        for (const [id, data] of map.entries()) {
          await prisma.kyaEntity.upsert({
            where: { collection_id: { collection, id } },
            create: { id, collection, data, mode },
            update: { data, mode }
          });
        }
      }

      const kvMaps = [
        ["idempotency", idempotency],
        ["merchant_request_index", merchantRequestIndex],
        ["nonce_index", nonceIndex]
      ];
      for (const [namespace, map] of kvMaps) {
        for (const [key, value] of map.entries()) {
          await prisma.kyaKv.upsert({
            where: { namespace_key: { namespace, key } },
            create: { namespace, key, value, mode },
            update: { value, mode }
          });
        }
      }

      for (const prefix of dirty.counters) {
        await prisma.kyaCounter.upsert({
          where: { prefix },
          create: { prefix, value: counters.get(prefix) ?? 0, mode },
          update: { value: counters.get(prefix) ?? 0, mode }
        });
      }

      for (const event of dirty.audit) {
        await prisma.kyaAuditEvent.create({
          data: {
            id: event.id,
            type: event.type,
            actor: event.actor,
            subjectId: event.subject_id,
            caseId: event.case_id,
            inputHash: event.input_hash,
            outputHash: event.output_hash,
            policyVersion: event.policy_version,
            previousEventHash: event.previous_event_hash,
            createdAt: new Date(event.created_at),
            eventHash: event.event_hash,
            payload: event,
            mode
          }
        });
      }

      dirty.entities.clear();
      dirty.kv.clear();
      dirty.audit.length = 0;
      dirty.counters.clear();
    }
  };

  for (const collection of COLLECTIONS) {
    const originalSet = maps[collection].set.bind(maps[collection]);
    maps[collection].set = (id, value) => {
      dirty.entities.add(`${collection}:${id}`);
      return originalSet(id, value);
    };
  }

  const trackKv = (map, namespace) => {
    const originalSet = map.set.bind(map);
    map.set = (key, value) => {
      dirty.kv.add(`${namespace}:${key}`);
      return originalSet(key, value);
    };
  };
  trackKv(idempotency, "idempotency");
  trackKv(merchantRequestIndex, "merchant_request_index");
  trackKv(nonceIndex, "nonce_index");

  return store;
}

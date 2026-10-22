import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { PostgresGameSessionStore, SessionRequestError } from "../server/gameSessionStore";
import type { GameSession } from "../shared/schema";
import * as schema from "../shared/schema";

if (!process.env.TEST_DATABASE_URL)
  throw new Error("Set TEST_DATABASE_URL to a disposable PostgreSQL database");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const { HybridStorage } = await import("../server/storage");
const { pool: defaultPool } = await import("../server/db");
const namespace = `coffeeshop_test_${randomUUID().replaceAll("-", "")}`;
const admin = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
const config = {
  connectionString: process.env.TEST_DATABASE_URL,
  options: `-c search_path=${namespace}`,
  max: 5,
};
const poolA = new pg.Pool(config);
const poolB = new pg.Pool(config);
const first = new PostgresGameSessionStore(poolA);
const second = new PostgresGameSessionStore(poolB);
const sample = (): GameSession => ({
  id: `session_${randomUUID()}`,
  scenarioId: "coffee_shop_beginner",
  currentSceneId: "arrival",
  difficulty: "beginner",
  score: { safetyPoints: 0, riskPoints: 0, decisionsCount: 0, correctDecisions: 0 },
  vpnEnabled: false,
  completedSceneIds: [],
  badges: [],
  startedAt: new Date().toISOString(),
});

before(async () => {
  await admin.query(`CREATE SCHEMA ${namespace}`);
  await Promise.all([first.initialize(), second.initialize()]);
  await poolA.query(`CREATE TABLE completed_sessions (
    id varchar PRIMARY KEY, user_id varchar NOT NULL, scenario_id varchar NOT NULL,
    difficulty varchar NOT NULL, safety_points integer NOT NULL DEFAULT 0,
    risk_points integer NOT NULL DEFAULT 0, decisions_count integer NOT NULL DEFAULT 0,
    correct_decisions integer NOT NULL DEFAULT 0, grade varchar, badges jsonb DEFAULT '[]',
    started_at timestamp NOT NULL, completed_at timestamp NOT NULL DEFAULT now()
  )`);
});
after(async () => {
  await Promise.all([poolA.end(), poolB.end(), defaultPool.end()]);
  await admin.query(`DROP SCHEMA ${namespace} CASCADE`);
  await admin.end();
});

test("state, owner, history and deadline survive switching instances and reconnecting", async () => {
  const initial = await first.create(sample(), "learner-a");
  await first.mutate(initial.id, (record) => ({
    ...record,
    session: { ...record.session, currentSceneId: "briefing", revision: 1 },
    history: [record.session],
    clock: { ...record.clock, timedOut: true },
  }));
  const record = await second.get(initial.id);
  assert.equal(record?.ownerId, "learner-a");
  assert.equal(record?.history[0].currentSceneId, "arrival");
  assert.equal(record?.clock.timedOut, true);
  const restartedPool = new pg.Pool(config);
  try {
    const restarted = new PostgresGameSessionStore(restartedPool);
    assert.deepEqual(await restarted.get(initial.id), record);
  } finally {
    await restartedPool.end();
  }
});

test("row locks serialize concurrent writers from separate pools without lost changes", async () => {
  const initial = await first.create(sample(), null);
  await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      (index % 2 ? first : second).mutate(initial.id, (record) => ({
        ...record,
        session: { ...record.session, revision: (record.session.revision ?? 0) + 1 },
      }))
    )
  );
  assert.equal((await first.get(initial.id))?.session.revision, 20);
});

test("failed transitions roll back and release locks to the next instance", async () => {
  const initial = await first.create(sample(), null);
  await assert.rejects(
    first.mutate(initial.id, (record) => {
      record.session.revision = 999;
      throw new SessionRequestError(409, "Stale update");
    }),
    /Stale update/
  );
  assert.equal((await second.get(initial.id))?.session.revision, 0);
  await second.mutate(initial.id, (record) => ({
    ...record,
    session: { ...record.session, revision: 1 },
  }));
  assert.equal((await first.get(initial.id))?.session.revision, 1);
});

test("completed state has a save grace period; expired records fail reads and writes before cleanup", async () => {
  const completed = await first.create(
    { ...sample(), completedAt: new Date().toISOString() },
    null
  );
  await first.cleanup();
  assert.ok(await second.get(completed.id));
  const expired = await first.create(
    { ...sample(), startedAt: new Date(Date.now() - 3 * 3600000).toISOString() },
    null
  );
  assert.equal(await second.get(expired.id), undefined);
  await assert.rejects(
    second.mutate(expired.id, (record) => record),
    /Session not found/
  );
  await second.cleanup();
  assert.equal(
    (await poolA.query("SELECT id FROM active_game_sessions WHERE id = $1", [expired.id])).rowCount,
    0
  );
});

test("creation limits are atomic across instances and reset after expiry", async () => {
  const key = `test:${randomUUID()}`;
  const limits = await Promise.all(
    Array.from({ length: 35 }, (_, index) => (index % 2 ? first : second).checkRateLimit(key))
  );
  assert.equal(limits.filter((limit) => limit.allowed).length, 30);
  assert.ok(limits.every((limit) => limit.retryAfterSeconds >= 1 && limit.retryAfterSeconds <= 60));
  assert.equal(
    (await poolA.query("SELECT key_hash FROM game_session_limits")).rows.some(
      (row) => row.key_hash === key
    ),
    false
  );
  await poolA.query("UPDATE game_session_limits SET expires_at = now() - interval '1 second'");
  assert.equal((await second.checkRateLimit(key)).allowed, true);
});

test("completion is durable and deduplicated across processes; another owner cannot claim it", async () => {
  const a = new HybridStorage(first, drizzle(poolA, { schema }));
  const b = new HybridStorage(second, drizzle(poolB, { schema }));
  const id = `session_${randomUUID()}`;
  const data = {
    userId: "learner-a",
    scenarioId: "coffee_shop_beginner",
    difficulty: "beginner",
    startedAt: new Date(),
    grade: "A",
    badges: [],
  };
  const saved = await Promise.all([
    a.saveCompletedSession(data, id),
    b.saveCompletedSession(data, id),
  ]);
  assert.equal(saved[0].id, saved[1].id);
  assert.equal((await b.getCompletedSession(id))?.userId, "learner-a");
  assert.equal(
    (await poolA.query("SELECT id FROM completed_sessions WHERE id = $1", [id])).rowCount,
    1
  );
  await assert.rejects(b.saveCompletedSession({ ...data, userId: "learner-b" }, id));
});

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { test, after, mock } from "node:test";
import { MemoryGameSessionStore } from "./memoryGameSessionStore";
import type { Express, RequestHandler } from "express";
import type { Server } from "node:http";
import { allowedHosts, authOriginForHost, isTrustedRequestOrigin } from "../server/requestSecurity";
import { isSupportedRuntime } from "../scripts/check-runtime.js";
import { advanceSession, processAction, processNetworkSelection } from "../shared/gameEngine";

// No real database, OIDC discovery, listener, or external network calls in these tests.
process.env.DATABASE_URL = "postgresql://test:test@localhost:1/test";
const { registerRoutes } = await import("../server/routes");
const { storage } = await import("../server/storage");
const { db } = await import("../server/db");
const { initializeContent } = await import("../server/scenarioLoader");
const { getAllScenarios } = await import("../shared/scenarios");
initializeContent();
storage.gameSessionStore = new MemoryGameSessionStore();
const routes = new Map<string, RequestHandler[]>();
const app = Object.fromEntries(
  ["get", "post", "patch"].map((method) => [
    method,
    (path: string, ...handlers: RequestHandler[]) => routes.set(`${method} ${path}`, handlers),
  ])
) as unknown as Express;
await registerRoutes({} as Server, app);
after(() => storage.stopCleanup());

async function request(
  method: string,
  path: string,
  body = {},
  userId = "learner-a",
  id?: string,
  origin = "https://learn.example",
  expiresIn = 3600
) {
  const headers: Record<string, string> = { host: "learn.example", origin };
  const req = {
    body,
    params: { id },
    headers,
    protocol: "https",
    ip: "127.0.0.1",
    socket: {},
    get: (name: string) => headers[name.toLowerCase()],
    isAuthenticated: () => true,
    user: { claims: { sub: userId }, expires_at: Math.floor(Date.now() / 1000) + expiresIn },
  };
  const res = {
    statusCode: 200,
    data: undefined as any,
    sent: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader() {},
    json(data: unknown) {
      this.data = data;
      this.sent = true;
      return this;
    },
  };
  for (const handler of routes.get(`${method} ${path}`) ?? []) {
    await handler(req as any, res as any, () => {});
    if (res.sent) break;
  }
  return res;
}

test("runtime gate rejects unpatched and unsupported versions", () => {
  for (const v of [
    "20.16.0",
    "22.12.0",
    "22.23.3",
    "24.22.0",
    "26.12.0",
    "23.99.0",
    "22.23.4-beta.1",
  ]) {
    assert.equal(isSupportedRuntime(v), false, v);
  }
  for (const v of ["22.23.4", "22.24.0", "24.22.1", "26.12.1"])
    assert.equal(isSupportedRuntime(v), true, v);
});

test("runtime wrapper preserves explicit CA configuration and resolves the Linux system bundle", () => {
  const run = (env: NodeJS.ProcessEnv) =>
    execFileSync(
      "sh",
      ["scripts/with-runtime.sh", "node", "-p", "process.env.SSL_CERT_FILE ?? '<unset>'"],
      { env, encoding: "utf8" }
    ).trim();
  assert.equal(
    run({ ...process.env, SSL_CERT_FILE: "/explicit/operator-ca.pem" }),
    "/explicit/operator-ca.pem"
  );
  const env = { ...process.env };
  delete env.SSL_CERT_FILE;
  const expected =
    process.platform === "linux" && existsSync("/etc/ssl/certs/ca-certificates.crt")
      ? "/etc/ssl/certs/ca-certificates.crt"
      : "<unset>";
  assert.equal(run(env), expected);
});

test("auth host policy fails closed and preserves local callback ports", () => {
  assert.throws(() => authOriginForHost("unconfigured.example", true, []));
  assert.throws(() => authOriginForHost("other.example", true, ["learn.example"]));
  assert.throws(() => authOriginForHost("127.attacker.example", false, []));
  assert.equal(
    authOriginForHost("learn.example", true, ["learn.example"]),
    "https://learn.example"
  );
  assert.equal(authOriginForHost("localhost:5000", false, []), "http://localhost:5000");
  assert.equal(authOriginForHost("[::1]:5000", false, []), "http://[::1]:5000");
  assert.deepEqual(allowedHosts("learn.example, https://bad.example, *.example"), [
    "learn.example",
  ]);
});

test("origin policy checks scheme, port, cross-site context and missing headers", () => {
  const req = (headers: Record<string, string>) =>
    ({ protocol: "https", get: (key: string) => headers[key] }) as any;
  assert.equal(
    isTrustedRequestOrigin(req({ host: "learn.example", origin: "https://learn.example" })),
    true
  );
  for (const origin of [
    "http://learn.example",
    "https://learn.example:444",
    "https://other.example",
    "null",
  ]) {
    assert.equal(isTrustedRequestOrigin(req({ host: "learn.example", origin })), false, origin);
  }
  assert.equal(isTrustedRequestOrigin(req({ host: "learn.example" })), false);
  assert.equal(
    isTrustedRequestOrigin(
      req({
        host: "learn.example",
        origin: "https://learn.example",
        "sec-fetch-site": "cross-site",
      })
    ),
    false
  );
});

test("session routes reject tampering, cross-user access, and cross-origin writes", async () => {
  const scenario = getAllScenarios()[0];
  const created = await request("post", "/api/sessions", {
    scenarioId: scenario.id,
    difficulty: scenario.difficulty,
  });
  assert.equal(created.statusCode, 201);
  const session = created.data;
  assert.equal(
    (
      await request(
        "get",
        "/api/sessions/:id",
        {},
        "learner-a",
        session.id,
        "https://learn.example",
        -1
      )
    ).statusCode,
    401
  );
  assert.equal(
    (await request("get", "/api/sessions/:id", {}, "learner-b", session.id)).statusCode,
    403
  );
  assert.equal(
    (
      await request(
        "patch",
        "/api/sessions/:id",
        { ...session, score: { ...session.score, safetyPoints: 999 } },
        "learner-a",
        session.id
      )
    ).statusCode,
    400
  );
  assert.equal(
    (
      await request(
        "patch",
        "/api/sessions/:id",
        advanceSession(session, scenario),
        "learner-a",
        session.id,
        "https://other.example"
      )
    ).statusCode,
    403
  );
  const next = await request(
    "patch",
    "/api/sessions/:id",
    advanceSession(session, scenario),
    "learner-a",
    session.id
  );
  assert.equal(next.statusCode, 200);
  assert.equal(
    (
      await request(
        "patch",
        "/api/sessions/:id",
        { ...session, revision: next.data.revision },
        "learner-a",
        session.id
      )
    ).statusCode,
    200,
    "legitimate backtracking works"
  );
});

test("complete a real challenge, retry exactly once, and isolate cached results by owner", async () => {
  const scenario = getAllScenarios()[0];
  let session = (
    await request("post", "/api/sessions", {
      scenarioId: scenario.id,
      difficulty: scenario.difficulty,
    })
  ).data;
  const initial = structuredClone(session);
  for (let step = 0; step < 40 && !session.completedAt; step++) {
    const scene = scenario.scenes.find((s) => s.id === session.currentSceneId)!;
    const next = scene.networks?.length
      ? processNetworkSelection(session, scene.networks[0], scenario).updatedSession
      : scene.actions?.length
        ? processAction(session, scene.actions[0].id, scenario).updatedSession
        : advanceSession(session, scenario);
    const result = await request("patch", "/api/sessions/:id", next, "learner-a", session.id);
    assert.equal(result.statusCode, 200, scene.id);
    session = result.data;
  }
  assert.ok(session.completedAt);
  let writes = 0;
  let saved: any;
  const getSaved = mock.method(storage, "getCompletedSession", async () => saved);
  const save = mock.method(storage, "saveCompletedSession", async (data: any) => {
    writes++;
    saved = { ...data, id: session.id, completedAt: new Date() };
    return saved;
  });
  try {
    const body = {
      sessionId: session.id,
      scenarioId: session.scenarioId,
      difficulty: session.difficulty,
      score: session.score,
      badges: session.badges,
      grade: "F",
    };
    assert.equal((await request("post", "/api/progress/complete", body)).statusCode, 201);
    assert.equal((await request("post", "/api/progress/complete", body)).statusCode, 200);
    const denied = await request("post", "/api/progress/complete", body, "learner-b");
    assert.equal(denied.statusCode, 403);
    assert.equal(denied.data.userId, undefined);
    assert.equal(writes, 1);
    assert.equal(
      (
        await request(
          "patch",
          "/api/sessions/:id",
          { ...initial, revision: session.revision },
          "learner-a",
          session.id
        )
      ).statusCode,
      400
    );
  } finally {
    save.mock.restore();
    getSaved.mock.restore();
  }
});

test("advanced timeout is accepted only after the server deadline and once per visit", async () => {
  const scenario = getAllScenarios().find((s) => s.difficulty === "advanced")!;
  let session = (
    await request("post", "/api/sessions", {
      scenarioId: scenario.id,
      difficulty: scenario.difficulty,
    })
  ).data;
  while (
    !["network_selection", "task_prompt", "captive_portal"].includes(
      scenario.scenes.find((s) => s.id === session.currentSceneId)!.type
    )
  ) {
    session = (
      await request(
        "patch",
        "/api/sessions/:id",
        advanceSession(session, scenario),
        "learner-a",
        session.id
      )
    ).data;
  }
  const penalty = {
    ...session,
    score: { ...session.score, riskPoints: session.score.riskPoints + 15 },
  };
  assert.equal(
    (await request("patch", "/api/sessions/:id", penalty, "learner-a", session.id)).statusCode,
    400
  );
  const now = Date.now();
  const clock = mock.method(Date, "now", () => now + (scenario.timerSeconds ?? 120) * 1000 + 1000);
  try {
    assert.equal(
      (await request("patch", "/api/sessions/:id", penalty, "learner-a", session.id)).statusCode,
      200
    );
    const twice = {
      ...penalty,
      revision: (session.revision ?? 0) + 1,
      score: { ...penalty.score, riskPoints: penalty.score.riskPoints + 15 },
    };
    assert.equal(
      (await request("patch", "/api/sessions/:id", twice, "learner-a", session.id)).statusCode,
      400
    );
  } finally {
    clock.mock.restore();
  }
});

test("database primary key deduplicates completion beyond the in-memory cache", async () => {
  const record = {
    id: "session_test",
    userId: "learner-a",
    startedAt: new Date(),
    scenarioId: "coffee_shop_beginner",
    difficulty: "beginner",
    grade: "A",
    badges: [],
  };
  let persisted: any;
  const insert = mock.method(db, "insert", (() => ({
    values: (data: any) => {
      assert.equal(data.id, record.id);
      return {
        onConflictDoNothing: () => ({
          returning: async () => {
            if (persisted) return [];
            persisted = data;
            return [data];
          },
        }),
      };
    },
  })) as any);
  const select = mock.method(db, "select", (() => ({
    from: () => ({ where: () => ({ limit: async () => [persisted] }) }),
  })) as any);
  try {
    assert.equal((await storage.saveCompletedSession(record, record.id)).id, record.id);
    assert.equal((await storage.saveCompletedSession(record, record.id)).id, record.id);
    await assert.rejects(
      storage.saveCompletedSession({ ...record, userId: "learner-b" }, record.id)
    );
  } finally {
    insert.mock.restore();
    select.mock.restore();
  }
});

test("stale revisions cannot roll back a newer update, while lost-response retries are idempotent", async () => {
  const scenario = getAllScenarios()[0];
  const session = (
    await request("post", "/api/sessions", {
      scenarioId: scenario.id,
      difficulty: scenario.difficulty,
    })
  ).data;
  const next = advanceSession(session, scenario);
  assert.equal(
    (await request("patch", "/api/sessions/:id", next, "learner-a", session.id)).statusCode,
    200
  );
  assert.equal(
    (await request("patch", "/api/sessions/:id", next, "learner-a", session.id)).statusCode,
    200
  );
  assert.equal(
    (await request("patch", "/api/sessions/:id", session, "learner-a", session.id)).statusCode,
    409
  );
});

test("error logging does not include request body or database error details", async () => {
  const { logError } = await import("../server/errorLogging");
  const output: unknown[][] = [];
  const logger = mock.method(console, "error", (...args: unknown[]) => {
    output.push(args);
  });
  try {
    logError("Request failed", new SyntaxError("sensitive-request-marker"));
    logError("Database failed", new Error("sensitive-connection-marker"));
    assert.equal(output.length, 2);
    assert.doesNotMatch(JSON.stringify(output), /sensitive-/);
  } finally {
    logger.mock.restore();
  }
});

test("every scenario completes through multiple decision paths using the real update route", async () => {
  for (const scenario of getAllScenarios()) {
    for (let branch = 0; branch < 4; branch++) {
      const visits = new Map<string, number>();
      let session = (
        await request("post", "/api/sessions", {
          scenarioId: scenario.id,
          difficulty: scenario.difficulty,
        })
      ).data;
      for (let step = 0; step < 50 && !session.completedAt; step++) {
        const scene = scenario.scenes.find((item) => item.id === session.currentSceneId)!;
        const choiceIndex = branch + (visits.get(scene.id) ?? 0);
        visits.set(scene.id, (visits.get(scene.id) ?? 0) + 1);
        const next = scene.networks?.length
          ? processNetworkSelection(
              session,
              scene.networks[choiceIndex % scene.networks.length],
              scenario
            ).updatedSession
          : scene.actions?.length
            ? processAction(session, scene.actions[choiceIndex % scene.actions.length].id, scenario)
                .updatedSession
            : advanceSession(session, scenario);
        const result = await request("patch", "/api/sessions/:id", next, "learner-a", session.id);
        assert.equal(result.statusCode, 200, `${scenario.id}/${scene.id}/branch${branch}`);
        session = result.data;
      }
      assert.ok(session.completedAt, `${scenario.id}/branch${branch} must terminate`);
    }
  }
});

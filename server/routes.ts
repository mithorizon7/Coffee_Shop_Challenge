import type { Express, Request, RequestHandler } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { getAllScenarios, getAvailableBadges } from "../shared/scenarios";
import { z } from "zod";
import { randomUUID } from "crypto";
import { isAuthenticated } from "./replit_integrations/auth";
import { db } from "./db";
import { type GameSession, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { isTrustedRequestOrigin } from "./requestSecurity";
import { logError } from "./errorLogging";
import { SessionRequestError, type SessionRecord } from "./gameSessionStore";
import { pool } from "./db";
import {
  advanceSession,
  getCurrentSceneFromScenario,
  processAction,
  processNetworkSelection,
} from "@shared/gameEngine";

const SIMPLE_ID_PATTERN = /^[a-z0-9_-]+$/i;
const simpleIdSchema = z.string().max(120).regex(SIMPLE_ID_PATTERN, "Invalid identifier format");

const createSessionSchema = z.object({
  scenarioId: simpleIdSchema,
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
});

// Session ID validation - must match expected format
const SESSION_ID_PATTERN = /^session_[a-f0-9-]{36}$/;
function isValidSessionId(id: string): boolean {
  return SESSION_ID_PATTERN.test(id);
}

const MAX_SESSION_HISTORY = 50;

const authenticateIfSignedIn: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) return isAuthenticated(req, res, next);
  next();
};

function getClientIp(req: Request): string {
  return (req.ip || req.socket.remoteAddress || "unknown").toString();
}

function getRequesterUserId(req: Request): string | null {
  const userId = (req as any).user?.claims?.sub;
  if (typeof userId !== "string" || userId.length === 0) return null;
  return userId;
}

function getSessionRateLimitKey(req: Request): string {
  const userId = getRequesterUserId(req);
  if (userId) {
    return `user:${userId}`;
  }
  return `ip:${getClientIp(req)}`;
}

const scoreSchema = z
  .object({
    safetyPoints: z.number().int().min(0).max(1000),
    riskPoints: z.number().int().min(0).max(1000),
    decisionsCount: z.number().int().min(0).max(200),
    correctDecisions: z.number().int().min(0).max(200),
  })
  .refine((data) => data.correctDecisions <= data.decisionsCount, {
    message: "correctDecisions cannot exceed decisionsCount",
  });

const badgePayloadSchema = z.object({
  id: simpleIdSchema,
  name: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(100).optional(),
  earnedAt: z.string().datetime().optional(),
});

const sessionBadgeSchema = z.object({
  id: simpleIdSchema,
  name: z.string().max(200),
  description: z.string().max(500),
  icon: z.string().max(100),
  earnedAt: z.string().datetime().optional(),
});

const completeSessionSchema = z.object({
  sessionId: z.string().regex(SESSION_ID_PATTERN, "Invalid session ID format"),
  scenarioId: simpleIdSchema,
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  score: scoreSchema,
  badges: z.array(badgePayloadSchema).max(20).optional(),
  grade: z.enum(["A", "B", "C", "D", "F"]),
});

const updateSessionSchema = z.object({
  revision: z.number().int().nonnegative(),
  currentSceneId: simpleIdSchema.optional(),
  selectedNetworkId: simpleIdSchema.optional(),
  vpnEnabled: z.boolean().optional(),
  score: scoreSchema.optional(),
  completedSceneIds: z.array(simpleIdSchema).max(200).optional(),
  badges: z.array(sessionBadgeSchema).max(20).optional(),
  completedAt: z.string().datetime().optional(),
});

function arraysMatchIgnoringOrder(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

function calculateGradeFromScore(score: z.infer<typeof scoreSchema>): "A" | "B" | "C" | "D" | "F" {
  const denominator = Math.max(1, score.safetyPoints + score.riskPoints);
  const ratio = score.safetyPoints / denominator;

  if (ratio >= 0.9) return "A";
  if (ratio >= 0.75) return "B";
  if (ratio >= 0.6) return "C";
  if (ratio >= 0.4) return "D";
  return "F";
}

function getSessionOwnerViolation(req: Request, record: SessionRecord): string | null {
  if (record.ownerId === null || record.ownerId === getRequesterUserId(req)) return null;
  return "Session belongs to a different authenticated user";
}

function validateUpdateAgainstScenario(
  scenarioId: string,
  updates: z.infer<typeof updateSessionSchema>
): string | null {
  const scenario = getAllScenarios().find((item) => item.id === scenarioId);
  if (!scenario) return "Scenario not found for active session";

  if (updates.currentSceneId) {
    const sceneExists = scenario.scenes.some((scene) => scene.id === updates.currentSceneId);
    if (!sceneExists) return "Invalid scene ID for this scenario";
  }

  if (updates.selectedNetworkId) {
    const networkExists = scenario.scenes
      .flatMap((scene) => scene.networks ?? [])
      .some((network) => network.id === updates.selectedNetworkId);
    if (!networkExists) return "Invalid network ID for this scenario";
  }

  if (updates.completedSceneIds) {
    const validSceneIds = new Set(scenario.scenes.map((scene) => scene.id));
    const hasInvalidSceneId = updates.completedSceneIds.some((id) => !validSceneIds.has(id));
    if (hasInvalidSceneId) return "completedSceneIds contains scenes outside this scenario";
  }

  if (updates.badges && updates.badges.length > 0) {
    const validBadgeIds = new Set(getAvailableBadges().map((badge) => badge.id));
    const hasInvalidBadge = updates.badges.some((badge) => !validBadgeIds.has(badge.id));
    if (hasInvalidBadge) return "Invalid badge ID provided";
  }

  return null;
}

function cloneSession(session: GameSession): GameSession {
  return {
    ...session,
    score: { ...session.score },
    completedSceneIds: [...session.completedSceneIds],
    badges: session.badges.map((badge) => ({ ...badge })),
  };
}

function toSessionUpdatePayload(session: GameSession): z.infer<typeof updateSessionSchema> {
  const payload: z.infer<typeof updateSessionSchema> = {
    revision: session.revision ?? 0,
    currentSceneId: session.currentSceneId,
    vpnEnabled: session.vpnEnabled,
    score: { ...session.score },
    completedSceneIds: [...session.completedSceneIds],
    badges: session.badges.map((badge) => ({ ...badge })),
  };

  if (session.selectedNetworkId) {
    payload.selectedNetworkId = session.selectedNetworkId;
  }
  if (session.completedAt) {
    payload.completedAt = session.completedAt;
  }

  return payload;
}

function arraysMatchInOrder(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function scoresMatch(
  a: z.infer<typeof scoreSchema> | undefined,
  b: z.infer<typeof scoreSchema> | undefined
): boolean {
  if (!a || !b) return a === b;
  return (
    a.safetyPoints === b.safetyPoints &&
    a.riskPoints === b.riskPoints &&
    a.decisionsCount === b.decisionsCount &&
    a.correctDecisions === b.correctDecisions
  );
}

function sessionUpdateMatchesState(
  updates: z.infer<typeof updateSessionSchema>,
  candidate: GameSession
): boolean {
  const candidatePayload = toSessionUpdatePayload(candidate);
  const updateBadgeIds = (updates.badges ?? []).map((badge) => badge.id);
  const candidateBadgeIds = candidatePayload.badges?.map((badge) => badge.id) ?? [];

  return (
    updates.currentSceneId === candidatePayload.currentSceneId &&
    updates.selectedNetworkId === candidatePayload.selectedNetworkId &&
    updates.vpnEnabled === candidatePayload.vpnEnabled &&
    scoresMatch(updates.score, candidatePayload.score) &&
    arraysMatchInOrder(updates.completedSceneIds ?? [], candidatePayload.completedSceneIds ?? []) &&
    arraysMatchIgnoringOrder(updateBadgeIds, candidateBadgeIds) &&
    Boolean(updates.completedAt) === Boolean(candidatePayload.completedAt)
  );
}

function getForwardSessionCandidates(
  session: GameSession,
  scenario: import("@shared/schema").Scenario
) {
  if (session.completedAt) return [];
  const currentScene = getCurrentSceneFromScenario(scenario, session.currentSceneId);
  if (!currentScene) {
    return [];
  }

  const candidates: GameSession[] = [];

  if (currentScene.networks) {
    for (const network of currentScene.networks) {
      candidates.push(processNetworkSelection(session, network, scenario).updatedSession);
    }
  }

  if (currentScene.actions) {
    for (const action of currentScene.actions) {
      candidates.push(processAction(session, action.id, scenario).updatedSession);
    }
  }

  if (["arrival", "briefing", "consequence", "debrief", "completion"].includes(currentScene.type)) {
    candidates.push(advanceSession(session, scenario));
  }

  const uniqueCandidates = new Map<string, GameSession>();
  for (const candidate of candidates) {
    uniqueCandidates.set(
      JSON.stringify(toSessionUpdatePayload(candidate)),
      cloneSession(candidate)
    );
  }

  return Array.from(uniqueCandidates.values());
}

function resolveSessionUpdate(
  record: SessionRecord,
  existingSession: GameSession,
  updates: z.infer<typeof updateSessionSchema>
): { session: GameSession; nextHistory: GameSession[] } | null {
  if (sessionUpdateMatchesState(updates, existingSession)) {
    return {
      session: cloneSession(existingSession),
      nextHistory: record.history,
    };
  }

  if (existingSession.completedAt) return null;

  const history = record.history;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (sessionUpdateMatchesState(updates, history[index])) {
      return {
        session: cloneSession(history[index]),
        nextHistory: history.slice(0, index),
      };
    }
  }

  const scenario = getAllScenarios().find((item) => item.id === existingSession.scenarioId);
  if (!scenario) {
    return null;
  }

  const candidates = getForwardSessionCandidates(existingSession, scenario);
  const clock = record.clock;
  const scene = getCurrentSceneFromScenario(scenario, existingSession.currentSceneId);
  if (
    existingSession.difficulty === "advanced" &&
    clock &&
    !clock.timedOut &&
    clock.sceneId === existingSession.currentSceneId &&
    ["network_selection", "task_prompt", "captive_portal"].includes(scene?.type ?? "") &&
    Date.now() - clock.enteredAt >= (scenario.timerSeconds ?? 120) * 1000
  ) {
    candidates.push({
      ...existingSession,
      score: {
        ...existingSession.score,
        riskPoints: existingSession.score.riskPoints + 15,
      },
    });
  }
  const matchingCandidate = candidates.find((candidate) =>
    sessionUpdateMatchesState(updates, candidate)
  );
  if (!matchingCandidate) {
    return null;
  }

  return {
    session: matchingCandidate,
    nextHistory: [...history, cloneSession(existingSession)].slice(-MAX_SESSION_HISTORY),
  };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.get("/api/scenarios", (req, res) => {
    const scenarios = getAllScenarios();
    const scenarioList = scenarios.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      location: s.location,
      difficulty: s.difficulty,
      estimatedTime: s.estimatedTime,
    }));
    res.json(scenarioList);
  });

  app.get("/api/scenarios/:id", (req, res) => {
    const scenarios = getAllScenarios();
    const scenario = scenarios.find((s) => s.id === req.params.id);
    if (!scenario) {
      return res.status(404).json({ error: "Scenario not found" });
    }
    res.json(scenario);
  });

  app.get("/api/badges", (req, res) => {
    res.json(getAvailableBadges());
  });

  app.post("/api/sessions", authenticateIfSignedIn, async (req, res) => {
    try {
      if (!isTrustedRequestOrigin(req)) {
        return res.status(403).json({ error: "Untrusted request origin" });
      }
      // Rate limiting
      const limitKey = getSessionRateLimitKey(req);
      const rateLimit = await storage.gameSessionStore.checkRateLimit(limitKey);
      if (!rateLimit.allowed) {
        res.setHeader("Retry-After", rateLimit.retryAfterSeconds.toString());
        return res.status(429).json({
          error: "Too many session starts. Please try again shortly.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        });
      }

      const parseResult = createSessionSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid session data",
          details: parseResult.error.flatten(),
        });
      }

      const { scenarioId, difficulty } = parseResult.data;

      const scenarios = getAllScenarios();
      const scenario = scenarios.find((s) => s.id === scenarioId);
      if (!scenario) {
        return res.status(400).json({ error: "Invalid scenario ID" });
      }
      if (difficulty !== scenario.difficulty) {
        return res.status(400).json({ error: "Scenario difficulty mismatch" });
      }

      const session: import("@shared/schema").GameSession = {
        id: `session_${randomUUID()}`,
        scenarioId,
        currentSceneId: scenario.startSceneId,
        difficulty: scenario.difficulty,
        score: {
          safetyPoints: 0,
          riskPoints: 0,
          decisionsCount: 0,
          correctDecisions: 0,
        },
        selectedNetworkId: undefined,
        vpnEnabled: false,
        completedSceneIds: [],
        badges: [],
        startedAt: new Date().toISOString(),
        completedAt: undefined,
      };

      const createdSession = await storage.createGameSession(session, getRequesterUserId(req));
      res.status(201).json(createdSession);
    } catch (error) {
      logError("Error creating session:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.get("/api/sessions/:id", authenticateIfSignedIn, async (req, res) => {
    try {
      const sessionId = req.params.id;
      if (!isValidSessionId(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID format" });
      }

      const record = await storage.gameSessionStore.get(sessionId);
      if (!record) return res.status(404).json({ error: "Session not found" });
      const ownerViolation = getSessionOwnerViolation(req, record);
      if (ownerViolation) return res.status(403).json({ error: ownerViolation });
      const session = record.session;
      res.json(session);
    } catch (error) {
      logError("Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  app.patch("/api/sessions/:id", authenticateIfSignedIn, async (req, res) => {
    try {
      if (!isTrustedRequestOrigin(req))
        return res.status(403).json({ error: "Untrusted request origin" });
      const sessionId = req.params.id;
      if (!isValidSessionId(sessionId))
        return res.status(400).json({ error: "Invalid session ID format" });
      const parsed = updateSessionSchema.safeParse(req.body);
      if (!parsed.success)
        return res
          .status(400)
          .json({ error: "Invalid update data", details: parsed.error.flatten() });
      const session = await storage.gameSessionStore.mutate(sessionId, (record) => {
        const violation = getSessionOwnerViolation(req, record);
        if (violation) throw new SessionRequestError(403, violation);
        const existing = record.session;
        // A lost response can be retried without applying an action twice.
        if (sessionUpdateMatchesState(parsed.data, existing)) return record;
        if (parsed.data.revision !== (existing.revision ?? 0)) {
          throw new SessionRequestError(409, "Session changed. Reload before trying again.");
        }
        const validation = validateUpdateAgainstScenario(existing.scenarioId, parsed.data);
        if (validation) throw new SessionRequestError(400, validation);
        const resolved = resolveSessionUpdate(record, existing, parsed.data);
        if (!resolved) throw new SessionRequestError(400, "Invalid session transition");
        const updated = { ...resolved.session, revision: (existing.revision ?? 0) + 1 };
        const sceneChanged = updated.currentSceneId !== existing.currentSceneId;
        return {
          session: updated,
          ownerId: record.ownerId,
          history: resolved.nextHistory,
          clock: sceneChanged
            ? { sceneId: updated.currentSceneId, enteredAt: Date.now(), timedOut: false }
            : {
                ...record.clock,
                timedOut:
                  record.clock.timedOut ||
                  updated.score.riskPoints === existing.score.riskPoints + 15,
              },
        };
      });
      res.json(session);
    } catch (error) {
      if (error instanceof SessionRequestError)
        return res.status(error.status).json({ error: error.message });
      logError("Error updating session:", error);
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  app.get("/api/sessions", async (_req, res) => {
    res.json([]);
  });

  app.get("/api/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({
        status: "ok",
        release: process.env.RELEASE_SHA ?? "development",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logError("Health check failed", error);
      res.status(503).json({ status: "unavailable" });
    }
  });

  app.post("/api/progress/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      if (!isTrustedRequestOrigin(req)) {
        return res.status(403).json({ error: "Untrusted request origin" });
      }

      const parseResult = completeSessionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid session data",
          details: parseResult.error.flatten(),
        });
      }

      const { sessionId, scenarioId, difficulty, score, badges } = parseResult.data;

      const existingCompletedProgress = await storage.getCompletedSession(sessionId);
      if (existingCompletedProgress) {
        if (existingCompletedProgress.userId !== userId) {
          return res
            .status(403)
            .json({ error: "Session belongs to a different authenticated user" });
        }
        return res.status(200).json(existingCompletedProgress);
      }

      const record = await storage.gameSessionStore.get(sessionId);
      if (!record)
        return res.status(400).json({
          error: "Active session not found. Start a new challenge before saving progress.",
        });
      const activeSession = record.session;
      if (!record.ownerId || record.ownerId !== userId) {
        return res
          .status(403)
          .json({ error: "Only the authenticated session owner can save this progress." });
      }

      if (activeSession.scenarioId !== scenarioId) {
        return res.status(400).json({ error: "Scenario mismatch for active session" });
      }
      if (activeSession.difficulty !== difficulty) {
        return res.status(400).json({ error: "Difficulty mismatch for active session" });
      }
      const scenarioExists = getAllScenarios().some(
        (scenario) => scenario.id === activeSession.scenarioId
      );
      if (!scenarioExists) {
        return res.status(400).json({ error: "Scenario no longer available" });
      }
      if (
        activeSession.score.safetyPoints !== score.safetyPoints ||
        activeSession.score.riskPoints !== score.riskPoints ||
        activeSession.score.decisionsCount !== score.decisionsCount ||
        activeSession.score.correctDecisions !== score.correctDecisions
      ) {
        return res.status(400).json({ error: "Score mismatch for active session" });
      }

      const payloadBadgeIds = (badges ?? []).map((badge) => badge.id);
      const sessionBadgeIds = activeSession.badges.map((badge) => badge.id);
      if (!arraysMatchIgnoringOrder(payloadBadgeIds, sessionBadgeIds)) {
        return res.status(400).json({ error: "Badge mismatch for active session" });
      }

      if (!activeSession.completedAt) {
        return res.status(400).json({
          error: "Session is not completed yet. Complete the challenge before saving progress.",
        });
      }

      const startedAt = new Date(activeSession.startedAt);
      const safeStartedAt = Number.isNaN(startedAt.getTime()) ? new Date() : startedAt;
      const grade = calculateGradeFromScore(activeSession.score);

      const completedSession = await storage.saveCompletedSession(
        {
          userId,
          scenarioId: activeSession.scenarioId,
          difficulty: activeSession.difficulty,
          safetyPoints: activeSession.score.safetyPoints,
          riskPoints: activeSession.score.riskPoints,
          decisionsCount: activeSession.score.decisionsCount,
          correctDecisions: activeSession.score.correctDecisions,
          grade,
          badges: sessionBadgeIds,
          startedAt: safeStartedAt,
        },
        activeSession.id
      );

      res.status(201).json(completedSession);
    } catch (error) {
      logError("Error saving completed session:", error);
      res.status(500).json({ error: "Failed to save completed session" });
    }
  });

  app.get("/api/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      logError("Error fetching progress:", error);
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  app.get("/api/progress/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const sessions = await storage.getCompletedSessionsByUser(userId);
      res.json(sessions);
    } catch (error) {
      logError("Error fetching sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.get("/api/educator/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user?.isEducator) {
        return res.status(403).json({ error: "Educator access required" });
      }

      const analytics = await storage.getEducatorAnalytics();
      res.json(analytics);
    } catch (error) {
      logError("Error fetching educator analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/educator/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      res.json({ isEducator: user?.isEducator ?? false });
    } catch (error) {
      logError("Error checking educator status:", error);
      res.status(500).json({ error: "Failed to check educator status" });
    }
  });

  return httpServer;
}

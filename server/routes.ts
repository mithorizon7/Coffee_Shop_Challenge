import type { Express, Request } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { getAllScenarios, getAvailableBadges } from "../shared/scenarios";
import { z } from "zod";
import { randomUUID } from "crypto";
import { isAuthenticated } from "./replit_integrations/auth";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

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

// Simple in-memory rate limiter for session creation
const sessionCreationLimiter = new Map<string, { count: number; resetAt: number }>();
const sessionOwnerById = new Map<string, string | null>();
const completedProgressSessionIds = new Set<string>();
const processingProgressSessionIds = new Set<string>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // max 30 session starts per minute per user/IP

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

function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const record = sessionCreationLimiter.get(key);

  if (!record || now > record.resetAt) {
    sessionCreationLimiter.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  record.count++;
  return { allowed: true, retryAfterSeconds: 0 };
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

function getSessionOwnerViolation(req: Request, sessionId: string): string | null {
  const ownerId = sessionOwnerById.get(sessionId);
  if (!ownerId) return null;

  const requesterId = getRequesterUserId(req);
  if (requesterId === ownerId) return null;

  return "Session belongs to a different authenticated user";
}

function isTrustedRequestOrigin(req: Request): boolean {
  const requestHost = req.headers.host;
  if (!requestHost || typeof requestHost !== "string") return false;
  const normalizedRequestHost = requestHost.toLowerCase();

  const isSameHost = (value: string): boolean => {
    try {
      return new URL(value).host.toLowerCase() === normalizedRequestHost;
    } catch {
      return false;
    }
  };

  const originHeader = req.headers.origin;
  if (typeof originHeader === "string" && originHeader.length > 0) {
    return isSameHost(originHeader);
  }

  const refererHeader = req.headers.referer;
  if (typeof refererHeader === "string" && refererHeader.length > 0) {
    return isSameHost(refererHeader);
  }

  return false;
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

// Clean up old rate limit entries periodically
const limiterCleanupInterval = setInterval(
  () => {
    const now = Date.now();
    sessionCreationLimiter.forEach((record, key) => {
      if (now > record.resetAt) {
        sessionCreationLimiter.delete(key);
      }
    });
  },
  5 * 60 * 1000
); // Every 5 minutes
limiterCleanupInterval.unref?.();

const sessionMetadataCleanupInterval = setInterval(
  () => {
    void (async () => {
      const sessionIds = new Set<string>([
        ...Array.from(sessionOwnerById.keys()),
        ...Array.from(completedProgressSessionIds.values()),
        ...Array.from(processingProgressSessionIds.values()),
      ]);

      for (const sessionId of Array.from(sessionIds)) {
        const session = await storage.getGameSession(sessionId);
        if (!session) {
          sessionOwnerById.delete(sessionId);
          completedProgressSessionIds.delete(sessionId);
          processingProgressSessionIds.delete(sessionId);
        }
      }
    })();
  },
  15 * 60 * 1000
);
sessionMetadataCleanupInterval.unref?.();

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

  app.post("/api/sessions", async (req, res) => {
    try {
      // Rate limiting
      const limitKey = getSessionRateLimitKey(req);
      const rateLimit = checkRateLimit(limitKey);
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

      const createdSession = await storage.createGameSession(session);
      sessionOwnerById.set(createdSession.id, getRequesterUserId(req));
      completedProgressSessionIds.delete(createdSession.id);
      res.status(201).json(createdSession);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const sessionId = req.params.id;
      if (!isValidSessionId(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID format" });
      }

      const session = await storage.getGameSession(sessionId);
      if (!session) {
        sessionOwnerById.delete(sessionId);
        completedProgressSessionIds.delete(sessionId);
        return res.status(404).json({ error: "Session not found" });
      }

      const ownerViolation = getSessionOwnerViolation(req, sessionId);
      if (ownerViolation) {
        return res.status(403).json({ error: ownerViolation });
      }

      res.json(session);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  app.patch("/api/sessions/:id", async (req, res) => {
    try {
      const sessionId = req.params.id;
      if (!isValidSessionId(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID format" });
      }

      const parseResult = updateSessionSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid update data",
          details: parseResult.error.flatten(),
        });
      }

      const existingSession = await storage.getGameSession(sessionId);
      if (!existingSession) {
        sessionOwnerById.delete(sessionId);
        completedProgressSessionIds.delete(sessionId);
        return res.status(404).json({ error: "Session not found" });
      }

      const ownerViolation = getSessionOwnerViolation(req, sessionId);
      if (ownerViolation) {
        return res.status(403).json({ error: ownerViolation });
      }

      const scenarioValidationError = validateUpdateAgainstScenario(
        existingSession.scenarioId,
        parseResult.data
      );
      if (scenarioValidationError) {
        return res.status(400).json({ error: scenarioValidationError });
      }

      const session = await storage.updateGameSession(sessionId, parseResult.data);

      if (!session) {
        sessionOwnerById.delete(sessionId);
        completedProgressSessionIds.delete(sessionId);
        return res.status(404).json({ error: "Session not found" });
      }

      res.json(session);
    } catch (error) {
      console.error("Error updating session:", error);
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  app.get("/api/sessions", async (_req, res) => {
    res.json([]);
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
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

      if (
        completedProgressSessionIds.has(sessionId) ||
        processingProgressSessionIds.has(sessionId)
      ) {
        return res.status(409).json({ error: "Progress for this session was already saved" });
      }

      processingProgressSessionIds.add(sessionId);
      try {
        const activeSession = await storage.getGameSession(sessionId);
        if (!activeSession) {
          sessionOwnerById.delete(sessionId);
          completedProgressSessionIds.delete(sessionId);
          return res.status(400).json({
            error: "Active session not found. Start a new challenge before saving progress.",
          });
        }

        const ownerId = sessionOwnerById.get(sessionId);
        if (!ownerId || ownerId !== userId) {
          return res.status(403).json({
            error: "Only the authenticated session owner can save this progress.",
          });
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

        const completedSession = await storage.saveCompletedSession({
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
        });

        completedProgressSessionIds.add(sessionId);
        res.status(201).json(completedSession);
      } finally {
        processingProgressSessionIds.delete(sessionId);
      }
    } catch (error) {
      console.error("Error saving completed session:", error);
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
      console.error("Error fetching progress:", error);
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
      console.error("Error fetching sessions:", error);
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
      console.error("Error fetching educator analytics:", error);
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
      console.error("Error checking educator status:", error);
      res.status(500).json({ error: "Failed to check educator status" });
    }
  });

  return httpServer;
}

import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { getAllScenarios, getAvailableBadges } from "../shared/scenarios";
import { z } from "zod";
import { randomUUID } from "crypto";
import { isAuthenticated } from "./replit_integrations/auth";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const createSessionSchema = z.object({
  scenarioId: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
});

const completeSessionSchema = z.object({
  sessionId: z.string(),
  scenarioId: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  score: z.object({
    safetyPoints: z.number().min(0).max(100),
    riskPoints: z.number().min(0).max(100),
    decisionsCount: z.number().min(0).max(50),
    correctDecisions: z.number().min(0).max(50),
  }).refine(data => data.correctDecisions <= data.decisionsCount, {
    message: "correctDecisions cannot exceed decisionsCount",
  }),
  badges: z.array(z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    earnedAt: z.string().optional(),
  })).max(10).optional(),
  grade: z.enum(["A", "B", "C", "D", "F"]),
});

const updateSessionSchema = z.object({
  currentSceneId: z.string().optional(),
  selectedNetworkId: z.string().optional(),
  vpnEnabled: z.boolean().optional(),
  score: z.object({
    safetyPoints: z.number(),
    riskPoints: z.number(),
    decisionsCount: z.number(),
    correctDecisions: z.number(),
  }).optional(),
  completedSceneIds: z.array(z.string()).optional(),
  badges: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    icon: z.string(),
    earnedAt: z.string().optional(),
  })).optional(),
  completedAt: z.string().optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/scenarios", (req, res) => {
    const scenarios = getAllScenarios();
    const scenarioList = scenarios.map(s => ({
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
    const scenario = scenarios.find(s => s.id === req.params.id);
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
      const parseResult = createSessionSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid session data", 
          details: parseResult.error.flatten() 
        });
      }

      const { scenarioId, difficulty } = parseResult.data;
      
      const scenarios = getAllScenarios();
      const scenario = scenarios.find(s => s.id === scenarioId);
      if (!scenario) {
        return res.status(400).json({ error: "Invalid scenario ID" });
      }

      const session = {
        id: `session_${randomUUID()}`,
        scenarioId,
        currentSceneId: scenario.startSceneId,
        difficulty,
        score: {
          safetyPoints: 0,
          riskPoints: 0,
          decisionsCount: 0,
          correctDecisions: 0,
        },
        selectedNetworkId: undefined,
        vpnEnabled: false,
        completedSceneIds: [] as string[],
        badges: [] as any[],
        startedAt: new Date().toISOString(),
        completedAt: undefined,
      };

      const createdSession = await storage.createGameSession(session);
      res.status(201).json(createdSession);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getGameSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  app.patch("/api/sessions/:id", async (req, res) => {
    try {
      const parseResult = updateSessionSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid update data", 
          details: parseResult.error.flatten() 
        });
      }

      const session = await storage.updateGameSession(req.params.id, parseResult.data);
      
      if (!session) {
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

      const parseResult = completeSessionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid session data", 
          details: parseResult.error.flatten() 
        });
      }

      const { scenarioId, difficulty, score, badges, grade } = parseResult.data;

      const scenarios = getAllScenarios();
      const scenario = scenarios.find(s => s.id === scenarioId);
      if (!scenario) {
        return res.status(400).json({ error: "Invalid scenario ID" });
      }

      if (badges && badges.length > 0) {
        const validBadgeIds = getAvailableBadges().map(b => b.id);
        const invalidBadges = badges.filter(b => !validBadgeIds.includes(b.id));
        if (invalidBadges.length > 0) {
          return res.status(400).json({ error: "Invalid badge IDs provided" });
        }
      }

      const completedSession = await storage.saveCompletedSession({
        userId,
        scenarioId,
        difficulty,
        safetyPoints: score.safetyPoints,
        riskPoints: score.riskPoints,
        decisionsCount: score.decisionsCount,
        correctDecisions: score.correctDecisions,
        grade,
        badges: badges?.map((b) => b.id) || [],
        startedAt: new Date(),
      });

      res.status(201).json(completedSession);
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

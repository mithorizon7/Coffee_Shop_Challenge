import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scenarios, availableBadges } from "../shared/scenarios";
import { z } from "zod";
import { randomUUID } from "crypto";

const createSessionSchema = z.object({
  scenarioId: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
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
    const scenario = scenarios.find(s => s.id === req.params.id);
    if (!scenario) {
      return res.status(404).json({ error: "Scenario not found" });
    }
    res.json(scenario);
  });

  app.get("/api/badges", (req, res) => {
    res.json(availableBadges);
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

  app.get("/api/sessions", async (req, res) => {
    try {
      const completed = req.query.completed === "true";
      
      if (completed) {
        const sessions = await storage.getCompletedSessions();
        res.json(sessions);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return httpServer;
}

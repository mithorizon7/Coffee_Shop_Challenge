import { 
  type GameSession, 
  type CompletedSession, 
  type InsertCompletedSession,
  type UserProgress,
  type EducatorAnalytics,
  type LearnerStats,
  type ScenarioStats,
  type CommonMistake,
  completedSessions,
  users 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, count, avg } from "drizzle-orm";
import { scenarios } from "@shared/scenarios";

export interface IStorage {
  getGameSession(id: string): Promise<GameSession | undefined>;
  createGameSession(session: GameSession): Promise<GameSession>;
  updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession | undefined>;
  
  saveCompletedSession(session: InsertCompletedSession): Promise<CompletedSession>;
  getCompletedSessionsByUser(userId: string): Promise<CompletedSession[]>;
  getUserProgress(userId: string): Promise<UserProgress>;
  
  getEducatorAnalytics(): Promise<EducatorAnalytics>;
  setUserEducatorStatus(userId: string, isEducator: boolean): Promise<void>;
}

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export class HybridStorage implements IStorage {
  private gameSessions: Map<string, GameSession>;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.gameSessions = new Map();
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSessions();
    }, CLEANUP_INTERVAL_MS);
  }

  private cleanupStaleSessions(): void {
    const now = Date.now();
    let cleaned = 0;
    const entries = Array.from(this.gameSessions.entries());
    
    for (const [id, session] of entries) {
      const sessionAge = now - new Date(session.startedAt).getTime();
      const isCompleted = !!session.completedAt;
      const isStale = sessionAge > SESSION_TTL_MS;
      
      if (isCompleted || isStale) {
        this.gameSessions.delete(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[Storage] Cleaned up ${cleaned} stale game sessions`);
    }
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  async getGameSession(id: string): Promise<GameSession | undefined> {
    return this.gameSessions.get(id);
  }

  async createGameSession(session: GameSession): Promise<GameSession> {
    this.gameSessions.set(session.id, session);
    return session;
  }

  async updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession | undefined> {
    const existing = this.gameSessions.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.gameSessions.set(id, updated);
    return updated;
  }

  async saveCompletedSession(session: InsertCompletedSession): Promise<CompletedSession> {
    const insertData = {
      userId: session.userId,
      scenarioId: session.scenarioId,
      difficulty: session.difficulty,
      safetyPoints: session.safetyPoints ?? 0,
      riskPoints: session.riskPoints ?? 0,
      decisionsCount: session.decisionsCount ?? 0,
      correctDecisions: session.correctDecisions ?? 0,
      grade: session.grade,
      badges: (session.badges ?? []) as string[],
      startedAt: session.startedAt,
    };
    const [result] = await db
      .insert(completedSessions)
      .values(insertData)
      .returning();
    return result;
  }

  async getCompletedSessionsByUser(userId: string): Promise<CompletedSession[]> {
    return await db
      .select()
      .from(completedSessions)
      .where(eq(completedSessions.userId, userId))
      .orderBy(desc(completedSessions.completedAt));
  }

  async getUserProgress(userId: string): Promise<UserProgress> {
    const sessions = await this.getCompletedSessionsByUser(userId);
    
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        averageSafetyScore: 0,
        averageRiskScore: 0,
        totalCorrectDecisions: 0,
        totalDecisions: 0,
        accuracyRate: 0,
        badgesEarned: [],
        completedScenarios: [],
        recentSessions: [],
        improvementTrend: "stable",
      };
    }

    const totalSessions = sessions.length;
    const totalSafetyPoints = sessions.reduce((sum, s) => sum + s.safetyPoints, 0);
    const totalRiskPoints = sessions.reduce((sum, s) => sum + s.riskPoints, 0);
    const totalCorrectDecisions = sessions.reduce((sum, s) => sum + s.correctDecisions, 0);
    const totalDecisions = sessions.reduce((sum, s) => sum + s.decisionsCount, 0);

    const allBadges = sessions.flatMap(s => (s.badges as string[]) || []);
    const uniqueBadges = Array.from(new Set(allBadges));
    const completedScenarios = Array.from(new Set(sessions.map(s => s.scenarioId)));

    let improvementTrend: "improving" | "stable" | "declining" = "stable";
    if (sessions.length >= 3) {
      const recentAvg = sessions.slice(0, 3).reduce((sum, s) => sum + s.correctDecisions / Math.max(1, s.decisionsCount), 0) / 3;
      const olderAvg = sessions.slice(-3).reduce((sum, s) => sum + s.correctDecisions / Math.max(1, s.decisionsCount), 0) / 3;
      
      if (recentAvg > olderAvg + 0.1) {
        improvementTrend = "improving";
      } else if (recentAvg < olderAvg - 0.1) {
        improvementTrend = "declining";
      }
    }

    return {
      totalSessions,
      averageSafetyScore: Math.round(totalSafetyPoints / totalSessions),
      averageRiskScore: Math.round(totalRiskPoints / totalSessions),
      totalCorrectDecisions,
      totalDecisions,
      accuracyRate: totalDecisions > 0 ? Math.round((totalCorrectDecisions / totalDecisions) * 100) : 0,
      badgesEarned: uniqueBadges,
      completedScenarios,
      recentSessions: sessions.slice(0, 10),
      improvementTrend,
    };
  }

  async getEducatorAnalytics(): Promise<EducatorAnalytics> {
    const allSessions = await db
      .select()
      .from(completedSessions)
      .orderBy(desc(completedSessions.completedAt));

    const allUsers = await db.select().from(users);

    if (allSessions.length === 0) {
      return {
        totalLearners: allUsers.length,
        totalSessions: 0,
        overallAccuracyRate: 0,
        averageSafetyScore: 0,
        averageRiskScore: 0,
        scenarioStats: [],
        recentLearners: [],
        commonMistakes: [],
      };
    }

    const totalLearners = new Set(allSessions.map(s => s.userId)).size;
    const totalSessionCount = allSessions.length;
    
    const totalCorrect = allSessions.reduce((sum, s) => sum + s.correctDecisions, 0);
    const totalDecisions = allSessions.reduce((sum, s) => sum + s.decisionsCount, 0);
    const overallAccuracyRate = totalDecisions > 0 ? Math.round((totalCorrect / totalDecisions) * 100) : 0;
    
    const totalSafety = allSessions.reduce((sum, s) => sum + s.safetyPoints, 0);
    const totalRisk = allSessions.reduce((sum, s) => sum + s.riskPoints, 0);

    const scenarioGroups = new Map<string, CompletedSession[]>();
    for (const session of allSessions) {
      const existing = scenarioGroups.get(session.scenarioId) || [];
      existing.push(session);
      scenarioGroups.set(session.scenarioId, existing);
    }

    const scenarioStats: ScenarioStats[] = Array.from(scenarioGroups.entries()).map(([scenarioId, sessions]) => {
      const scenario = scenarios.find(s => s.id === scenarioId);
      const correct = sessions.reduce((sum, s) => sum + s.correctDecisions, 0);
      const decisions = sessions.reduce((sum, s) => sum + s.decisionsCount, 0);
      const safety = sessions.reduce((sum, s) => sum + s.safetyPoints, 0);
      const risk = sessions.reduce((sum, s) => sum + s.riskPoints, 0);
      
      return {
        scenarioId,
        title: scenario?.title || scenarioId,
        difficulty: scenario?.difficulty || "unknown",
        completionCount: sessions.length,
        averageAccuracy: decisions > 0 ? Math.round((correct / decisions) * 100) : 0,
        averageSafetyScore: Math.round(safety / sessions.length),
        averageRiskScore: Math.round(risk / sessions.length),
      };
    });

    const userSessionMap = new Map<string, CompletedSession[]>();
    for (const session of allSessions) {
      const existing = userSessionMap.get(session.userId) || [];
      existing.push(session);
      userSessionMap.set(session.userId, existing);
    }

    const recentLearners: LearnerStats[] = Array.from(userSessionMap.entries())
      .map(([userId, sessions]) => {
        const user = allUsers.find(u => u.id === userId);
        const correct = sessions.reduce((sum, s) => sum + s.correctDecisions, 0);
        const decisions = sessions.reduce((sum, s) => sum + s.decisionsCount, 0);
        const lastSession = sessions[0];
        
        return {
          id: userId,
          email: user?.email || null,
          firstName: user?.firstName || null,
          lastName: user?.lastName || null,
          profileImageUrl: user?.profileImageUrl || null,
          sessionsCompleted: sessions.length,
          averageAccuracy: decisions > 0 ? Math.round((correct / decisions) * 100) : 0,
          lastActive: lastSession?.completedAt || null,
        };
      })
      .sort((a, b) => {
        if (!a.lastActive || !b.lastActive) return 0;
        return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
      })
      .slice(0, 20);

    const commonMistakes: CommonMistake[] = scenarioStats
      .filter(s => s.averageRiskScore > 10)
      .map(s => ({
        scenarioId: s.scenarioId,
        badDecisionRate: 100 - s.averageAccuracy,
        averageRiskPoints: s.averageRiskScore,
      }))
      .sort((a, b) => b.averageRiskPoints - a.averageRiskPoints);

    return {
      totalLearners,
      totalSessions: totalSessionCount,
      overallAccuracyRate,
      averageSafetyScore: Math.round(totalSafety / totalSessionCount),
      averageRiskScore: Math.round(totalRisk / totalSessionCount),
      scenarioStats,
      recentLearners,
      commonMistakes,
    };
  }

  async setUserEducatorStatus(userId: string, isEducator: boolean): Promise<void> {
    await db
      .update(users)
      .set({ isEducator, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}

export const storage = new HybridStorage();

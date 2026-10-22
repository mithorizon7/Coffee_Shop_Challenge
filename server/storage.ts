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
  users,
} from "@shared/schema";
import { db, pool } from "./db";
import { PostgresGameSessionStore, type GameSessionStore } from "./gameSessionStore";
import { logError } from "./errorLogging";
import { eq, desc } from "drizzle-orm";
import { scenarios } from "@shared/scenarios";

// Constants for analytics
const MAX_ANALYTICS_SESSIONS = 1000; // Limit analytics queries for performance
const IMPROVEMENT_THRESHOLD = 0.1; // 10% difference to detect improvement/decline
const RISK_THRESHOLD = 10; // Risk points threshold for identifying common mistakes

export interface IStorage {
  createGameSession(session: GameSession, ownerId: string | null): Promise<GameSession>;

  saveCompletedSession(
    session: InsertCompletedSession,
    sourceSessionId?: string
  ): Promise<CompletedSession>;
  getCompletedSessionsByUser(userId: string): Promise<CompletedSession[]>;
  getUserProgress(userId: string): Promise<UserProgress>;

  getEducatorAnalytics(): Promise<EducatorAnalytics>;
  setUserEducatorStatus(userId: string, isEducator: boolean): Promise<void>;
}

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

export class HybridStorage implements IStorage {
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    public gameSessionStore: GameSessionStore = new PostgresGameSessionStore(pool),
    private database: typeof db = db
  ) {}

  async initialize(): Promise<void> {
    await this.gameSessionStore.initialize();
    this.cleanupInterval = setInterval(() => {
      void this.gameSessionStore
        .cleanup()
        .catch((error) => logError("Session cleanup failed", error));
    }, CLEANUP_INTERVAL_MS);
    this.cleanupInterval.unref?.();
  }

  stopCleanup(): void {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.cleanupInterval = null;
  }

  async createGameSession(session: GameSession, ownerId: string | null): Promise<GameSession> {
    return this.gameSessionStore.create(session, ownerId);
  }

  async getCompletedSession(id: string): Promise<CompletedSession | undefined> {
    const [session] = await this.database
      .select()
      .from(completedSessions)
      .where(eq(completedSessions.id, id))
      .limit(1);
    return session;
  }

  async saveCompletedSession(
    session: InsertCompletedSession,
    sourceSessionId?: string
  ): Promise<CompletedSession> {
    const insertData = {
      // Reuse the existing primary key for durable deduplication across retries,
      // process restarts, and cache eviction. No schema migration is required.
      ...(sourceSessionId ? { id: sourceSessionId } : {}),
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
    const [result] = await this.database
      .insert(completedSessions)
      .values(insertData)
      .onConflictDoNothing({ target: completedSessions.id })
      .returning();
    if (result) return result;
    if (sourceSessionId) {
      const [existing] = await this.database
        .select()
        .from(completedSessions)
        .where(eq(completedSessions.id, sourceSessionId))
        .limit(1);
      if (existing?.userId === session.userId) return existing;
    }
    throw new Error("Completed session could not be persisted");
  }

  async getCompletedSessionsByUser(userId: string): Promise<CompletedSession[]> {
    return await this.database
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

    const allBadges = sessions.flatMap((s) => (s.badges as string[]) || []);
    const uniqueBadges = Array.from(new Set(allBadges));
    const completedScenarios = Array.from(new Set(sessions.map((s) => s.scenarioId)));

    let improvementTrend: "improving" | "stable" | "declining" = "stable";
    if (sessions.length >= 3) {
      const recentAvg =
        sessions
          .slice(0, 3)
          .reduce((sum, s) => sum + s.correctDecisions / Math.max(1, s.decisionsCount), 0) / 3;
      const olderAvg =
        sessions
          .slice(-3)
          .reduce((sum, s) => sum + s.correctDecisions / Math.max(1, s.decisionsCount), 0) / 3;

      if (recentAvg > olderAvg + IMPROVEMENT_THRESHOLD) {
        improvementTrend = "improving";
      } else if (recentAvg < olderAvg - IMPROVEMENT_THRESHOLD) {
        improvementTrend = "declining";
      }
    }

    return {
      totalSessions,
      averageSafetyScore: Math.round(totalSafetyPoints / totalSessions),
      averageRiskScore: Math.round(totalRiskPoints / totalSessions),
      totalCorrectDecisions,
      totalDecisions,
      accuracyRate:
        totalDecisions > 0 ? Math.round((totalCorrectDecisions / totalDecisions) * 100) : 0,
      badgesEarned: uniqueBadges,
      completedScenarios,
      recentSessions: sessions.slice(0, 10),
      improvementTrend,
    };
  }

  async getEducatorAnalytics(): Promise<EducatorAnalytics> {
    // Limit query results for performance at scale
    const allSessions = await this.database
      .select()
      .from(completedSessions)
      .orderBy(desc(completedSessions.completedAt))
      .limit(MAX_ANALYTICS_SESSIONS);

    const allUsers = await this.database.select().from(users);

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

    const totalLearners = new Set(allSessions.map((s) => s.userId)).size;
    const totalSessionCount = allSessions.length;

    const totalCorrect = allSessions.reduce((sum, s) => sum + s.correctDecisions, 0);
    const totalDecisions = allSessions.reduce((sum, s) => sum + s.decisionsCount, 0);
    const overallAccuracyRate =
      totalDecisions > 0 ? Math.round((totalCorrect / totalDecisions) * 100) : 0;

    const totalSafety = allSessions.reduce((sum, s) => sum + s.safetyPoints, 0);
    const totalRisk = allSessions.reduce((sum, s) => sum + s.riskPoints, 0);

    const scenarioGroups = new Map<string, CompletedSession[]>();
    for (const session of allSessions) {
      const existing = scenarioGroups.get(session.scenarioId) || [];
      existing.push(session);
      scenarioGroups.set(session.scenarioId, existing);
    }

    const scenarioStats: ScenarioStats[] = Array.from(scenarioGroups.entries()).map(
      ([scenarioId, sessions]) => {
        const scenario = scenarios.find((s) => s.id === scenarioId);
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
      }
    );

    const userSessionMap = new Map<string, CompletedSession[]>();
    for (const session of allSessions) {
      const existing = userSessionMap.get(session.userId) || [];
      existing.push(session);
      userSessionMap.set(session.userId, existing);
    }

    const recentLearners: LearnerStats[] = Array.from(userSessionMap.entries())
      .map(([userId, sessions]) => {
        const user = allUsers.find((u) => u.id === userId);
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
      .filter((s) => s.averageRiskScore > RISK_THRESHOLD)
      .map((s) => ({
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
    await this.database
      .update(users)
      .set({ isEducator, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}

export const storage = new HybridStorage();

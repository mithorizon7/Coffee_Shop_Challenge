import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import users from auth model for relations
import { users } from "./models/auth";

// Re-export auth models (includes sessions table)
export * from "./models/auth";

// ============ PROGRESS TRACKING TABLES ============

// Completed game sessions stored in database for progress tracking
export const completedSessions = pgTable("completed_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  userId: varchar("user_id").notNull(),
  scenarioId: varchar("scenario_id").notNull(),
  difficulty: varchar("difficulty").notNull(),
  
  safetyPoints: integer("safety_points").notNull().default(0),
  riskPoints: integer("risk_points").notNull().default(0),
  decisionsCount: integer("decisions_count").notNull().default(0),
  correctDecisions: integer("correct_decisions").notNull().default(0),
  
  grade: varchar("grade"),
  badges: jsonb("badges").$type<string[]>().default([]),
  
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_completed_sessions_user_id").on(table.userId),
  index("IDX_completed_sessions_completed_at").on(table.completedAt),
]);

// Relations for completed sessions
export const completedSessionsRelations = relations(completedSessions, ({ one }) => ({
  user: one(users, {
    fields: [completedSessions.userId],
    references: [users.id],
  }),
}));

// Zod schemas for completed sessions
export const insertCompletedSessionSchema = createInsertSchema(completedSessions).omit({
  id: true,
  completedAt: true,
});

export type InsertCompletedSession = z.infer<typeof insertCompletedSessionSchema>;
export type CompletedSession = typeof completedSessions.$inferSelect;

// ============ GAME DATA TYPES ============

// Difficulty levels
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

// Network security types
export type SecurityType = "open" | "wpa2" | "wpa3" | "wep";

// Wi-Fi network in the game
export const networkSchema = z.object({
  id: z.string(),
  ssid: z.string(),
  signalStrength: z.number().min(1).max(5),
  isSecured: z.boolean(),
  securityType: z.enum(["open", "wpa2", "wpa3", "wep"]),
  isLegitimate: z.boolean(),
  isTrap: z.boolean(),
  verifiedByStaff: z.boolean().optional(),
  isMobileData: z.boolean().optional(),
  riskLevel: z.enum(["safe", "suspicious", "dangerous"]),
  description: z.string().optional(),
  actionId: z.string().optional(),
});

export type Network = z.infer<typeof networkSchema>;

// Task types the player must complete
export type TaskType = "email" | "banking" | "download" | "payment" | "browse" | "social";

// Task prompt in the game
export const taskSchema = z.object({
  id: z.string(),
  type: z.enum(["email", "banking", "download", "payment", "browse", "social"]),
  title: z.string(),
  titleKey: z.string().optional(),
  description: z.string(),
  descriptionKey: z.string().optional(),
  sensitivityLevel: z.enum(["low", "medium", "high", "critical"]),
  riskHint: z.string().optional(),
  riskHintKey: z.string().optional(),
});

export type Task = z.infer<typeof taskSchema>;

// Player action choices
export type ActionType = "connect" | "proceed" | "use_vpn" | "postpone" | "switch_network" | "verify_staff" | "install_profile" | "override_warning" | "decline";

// Action choice for the player
export const actionSchema = z.object({
  id: z.string(),
  type: z.enum(["connect", "proceed", "use_vpn", "postpone", "switch_network", "verify_staff", "install_profile", "override_warning", "decline"]),
  label: z.string(),
  labelKey: z.string().optional(),
  description: z.string().optional(),
  descriptionKey: z.string().optional(),
  isPrimary: z.boolean().optional(),
  isDanger: z.boolean().optional(),
});

export type Action = z.infer<typeof actionSchema>;

// Consequence types
export type ConsequenceType = 
  | "credential_harvested"
  | "session_compromised" 
  | "malware_installed"
  | "account_locked"
  | "privacy_leaked"
  | "safe_browsing"
  | "vpn_protected"
  | "action_postponed"
  | "network_verified";

// Consequence after player action
export const consequenceSchema = z.object({
  id: z.string(),
  type: z.enum([
    "credential_harvested",
    "session_compromised",
    "malware_installed",
    "account_locked",
    "privacy_leaked",
    "safe_browsing",
    "vpn_protected",
    "action_postponed",
    "network_verified",
    "missed_verification"
  ]),
  severity: z.enum(["success", "warning", "danger"]),
  title: z.string(),
  titleKey: z.string().optional(),
  whatHappened: z.string(),
  whatHappenedKey: z.string().optional(),
  whyRisky: z.string(),
  whyRiskyKey: z.string().optional(),
  saferAlternative: z.string(),
  saferAlternativeKey: z.string().optional(),
  technicalExplanation: z.string().optional(),
  technicalExplanationKey: z.string().optional(),
  safetyPointsChange: z.number(),
  riskPointsChange: z.number(),
  cascadingEffects: z.array(z.object({
    order: z.number(),
    effect: z.string(),
    icon: z.enum(["credential", "account", "money", "identity", "privacy", "malware"]).optional(),
  })).optional(),
});

export type Consequence = z.infer<typeof consequenceSchema>;

// Scene in the branching narrative
export const sceneSchema = z.object({
  id: z.string(),
  type: z.enum(["arrival", "briefing", "network_selection", "captive_portal", "task_prompt", "consequence", "debrief", "completion"]),
  title: z.string(),
  titleKey: z.string().optional(),
  description: z.string(),
  descriptionKey: z.string().optional(),
  location: z.string(),
  networks: z.array(networkSchema).optional(),
  task: taskSchema.optional(),
  actions: z.array(actionSchema).optional(),
  consequence: consequenceSchema.optional(),
  sections: z.array(z.object({
    title: z.string().optional(),
    titleKey: z.string().optional(),
    body: z.string().optional(),
    bodyKey: z.string().optional(),
  })).optional(),
  nextSceneId: z.string().optional(),
  choices: z.array(z.object({
    actionId: z.string(),
    nextSceneId: z.string(),
    condition: z.string().optional(),
  })).optional(),
});

export type Scene = z.infer<typeof sceneSchema>;

// Complete scenario
export const scenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  location: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  estimatedTime: z.string(),
  scenes: z.array(sceneSchema),
  startSceneId: z.string(),
  timerEnabled: z.boolean().optional(),
  timerSeconds: z.number().optional(),
});

export type Scenario = z.infer<typeof scenarioSchema>;

// Player score tracking
export const scoreSchema = z.object({
  safetyPoints: z.number(),
  riskPoints: z.number(),
  decisionsCount: z.number(),
  correctDecisions: z.number(),
});

export type Score = z.infer<typeof scoreSchema>;

// Badge/achievement
export const badgeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  earnedAt: z.string().optional(),
});

export type Badge = z.infer<typeof badgeSchema>;

// Game session state (in-memory, used during gameplay)
export const gameSessionSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  currentSceneId: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  score: scoreSchema,
  selectedNetworkId: z.string().optional(),
  vpnEnabled: z.boolean(),
  completedSceneIds: z.array(z.string()),
  badges: z.array(badgeSchema),
  startedAt: z.string(),
  completedAt: z.string().optional(),
});

export type GameSession = z.infer<typeof gameSessionSchema>;

// API response types
export const scenarioListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  location: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  estimatedTime: z.string(),
});

export type ScenarioListItem = z.infer<typeof scenarioListItemSchema>;

// Progress statistics for a user
export interface UserProgress {
  totalSessions: number;
  averageSafetyScore: number;
  averageRiskScore: number;
  totalCorrectDecisions: number;
  totalDecisions: number;
  accuracyRate: number;
  badgesEarned: string[];
  completedScenarios: string[];
  recentSessions: CompletedSession[];
  improvementTrend: "improving" | "stable" | "declining";
}

// Educator analytics types
export interface LearnerStats {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  sessionsCompleted: number;
  averageAccuracy: number;
  lastActive: Date | null;
}

export interface ScenarioStats {
  scenarioId: string;
  title: string;
  difficulty: string;
  completionCount: number;
  averageAccuracy: number;
  averageSafetyScore: number;
  averageRiskScore: number;
}

export interface CommonMistake {
  scenarioId: string;
  badDecisionRate: number;
  averageRiskPoints: number;
}

export interface EducatorAnalytics {
  totalLearners: number;
  totalSessions: number;
  overallAccuracyRate: number;
  averageSafetyScore: number;
  averageRiskScore: number;
  scenarioStats: ScenarioStats[];
  recentLearners: LearnerStats[];
  commonMistakes: CommonMistake[];
}

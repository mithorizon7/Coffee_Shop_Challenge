import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table (kept for compatibility)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
  riskLevel: z.enum(["safe", "suspicious", "dangerous"]),
  description: z.string().optional(),
});

export type Network = z.infer<typeof networkSchema>;

// Task types the player must complete
export type TaskType = "email" | "banking" | "download" | "payment" | "browse" | "social";

// Task prompt in the game
export const taskSchema = z.object({
  id: z.string(),
  type: z.enum(["email", "banking", "download", "payment", "browse", "social"]),
  title: z.string(),
  description: z.string(),
  sensitivityLevel: z.enum(["low", "medium", "high", "critical"]),
  riskHint: z.string().optional(),
});

export type Task = z.infer<typeof taskSchema>;

// Player action choices
export type ActionType = "connect" | "proceed" | "use_vpn" | "postpone" | "switch_network" | "verify_staff" | "install_profile" | "override_warning" | "decline";

// Action choice for the player
export const actionSchema = z.object({
  id: z.string(),
  type: z.enum(["connect", "proceed", "use_vpn", "postpone", "switch_network", "verify_staff", "install_profile", "override_warning", "decline"]),
  label: z.string(),
  description: z.string().optional(),
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
    "network_verified"
  ]),
  severity: z.enum(["success", "warning", "danger"]),
  title: z.string(),
  whatHappened: z.string(),
  whyRisky: z.string(),
  saferAlternative: z.string(),
  technicalExplanation: z.string().optional(),
  safetyPointsChange: z.number(),
  riskPointsChange: z.number(),
});

export type Consequence = z.infer<typeof consequenceSchema>;

// Scene in the branching narrative
export const sceneSchema = z.object({
  id: z.string(),
  type: z.enum(["arrival", "network_selection", "captive_portal", "task_prompt", "consequence", "debrief", "completion"]),
  title: z.string(),
  description: z.string(),
  location: z.string(),
  networks: z.array(networkSchema).optional(),
  task: taskSchema.optional(),
  actions: z.array(actionSchema).optional(),
  consequence: consequenceSchema.optional(),
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

// Game session state
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

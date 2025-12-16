import type { Scenario, Badge } from "./schema";

// Default badge definitions - overridden by content/badges.json when loaded
const defaultBadges: Badge[] = [
  {
    id: "security_aware",
    name: "Security Aware",
    description: "Completed your first scenario without major security incidents",
    icon: "shield",
  },
  {
    id: "vpn_master",
    name: "VPN Master",
    description: "Consistently used VPN protection on public networks",
    icon: "lock",
  },
  {
    id: "network_detective",
    name: "Network Detective",
    description: "Successfully identified a trap network",
    icon: "search",
  },
  {
    id: "patient_professional",
    name: "Patient Professional",
    description: "Postponed sensitive tasks until reaching a secure network",
    icon: "clock",
  },
  {
    id: "perfect_score",
    name: "Perfect Score",
    description: "Completed a scenario with zero risk points",
    icon: "star",
  },
  {
    id: "https_hero",
    name: "HTTPS Hero",
    description: "Always verified site security before entering sensitive data",
    icon: "shield-check",
  },
];

// Badges storage - populated from JSON on server, uses defaults otherwise
let badges: Badge[] = [...defaultBadges];

// Scenarios storage - populated by loadScenariosFromJSON on server
let scenarios: Scenario[] = [];

// Function to set badges (called by server after loading JSON)
export function setBadges(loadedBadges: Badge[]): void {
  badges = loadedBadges;
}

// Function to get all badges - preferred way to access badges
export function getAvailableBadges(): Badge[] {
  return badges;
}

// NOTE: The legacy `availableBadges` array export has been removed.
// Use getAvailableBadges() to access badge data at runtime.
// This ensures you always get the current badges loaded from JSON files.

// Function to set scenarios (called by server after loading JSON)
export function setScenarios(loadedScenarios: Scenario[]): void {
  scenarios = loadedScenarios;
}

// Function to get all scenarios
export function getAllScenarios(): Scenario[] {
  return scenarios;
}

export function getScenarioById(id: string): Scenario | undefined {
  return scenarios.find(s => s.id === id);
}

export function getScenariosByDifficulty(difficulty: string): Scenario[] {
  return scenarios.filter(s => s.difficulty === difficulty);
}

// For backward compatibility - returns the scenarios array directly
// Note: This should only be used after scenarios are loaded
export { scenarios };

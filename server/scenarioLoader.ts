import * as fs from "fs";
import * as path from "path";
import { badgeSchema, scenarioSchema, type Scenario, type Badge } from "@shared/schema";
import { setScenarios, setBadges, getAvailableBadges } from "@shared/scenarios";

const CONTENT_DIR = path.join(process.cwd(), "content");
const SCENARIOS_DIR = path.join(CONTENT_DIR, "scenarios");

/**
 * Load all scenarios from JSON files in the content/scenarios directory.
 * This allows educators to edit scenarios without touching code.
 */
export function loadScenariosFromJSON(): Scenario[] {
  const scenarios: Scenario[] = [];

  try {
    // Check if scenarios directory exists
    if (!fs.existsSync(SCENARIOS_DIR)) {
      console.warn(`Scenarios directory not found at ${SCENARIOS_DIR}`);
      return scenarios;
    }

    // Read all JSON files in the scenarios directory
    const files = fs.readdirSync(SCENARIOS_DIR).filter((f) => f.endsWith(".json"));

    for (const file of files) {
      const filePath = path.join(SCENARIOS_DIR, file);
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const parsedScenario = JSON.parse(content);
        const validation = scenarioSchema.safeParse(parsedScenario);

        if (!validation.success) {
          const details = validation.error.issues
            .slice(0, 3)
            .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
            .join("; ");
          console.warn(`Invalid scenario format in ${file}: ${details}`);
          continue;
        }

        const scenario = validation.data;
        scenarios.push(scenario);
        console.log(`Loaded scenario: ${scenario.id} (${scenario.title})`);
      } catch (err) {
        console.error(`Error loading scenario from ${file}:`, err);
      }
    }

    // Sort by difficulty order
    const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
    scenarios.sort(
      (a, b) => (difficultyOrder[a.difficulty] || 0) - (difficultyOrder[b.difficulty] || 0)
    );

    console.log(`Loaded ${scenarios.length} scenarios from JSON files`);
  } catch (err) {
    console.error("Error reading scenarios directory:", err);
  }

  return scenarios;
}

/**
 * Load badges from JSON file.
 */
export function loadBadgesFromJSON(): Badge[] {
  const badgesPath = path.join(CONTENT_DIR, "badges.json");

  try {
    if (fs.existsSync(badgesPath)) {
      const content = fs.readFileSync(badgesPath, "utf-8");
      const parsedBadges = JSON.parse(content);
      if (!Array.isArray(parsedBadges)) {
        console.warn("Invalid badges.json format: expected an array");
        return getAvailableBadges();
      }

      const validBadges: Badge[] = [];
      parsedBadges.forEach((badge, index) => {
        const validation = badgeSchema.safeParse(badge);
        if (validation.success) {
          validBadges.push(validation.data);
          return;
        }

        const details = validation.error.issues
          .slice(0, 2)
          .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
          .join("; ");
        console.warn(`Invalid badge at index ${index}: ${details}`);
      });

      console.log(`Loaded ${validBadges.length} badges from JSON`);
      return validBadges;
    }
  } catch (err) {
    console.error("Error loading badges from JSON:", err);
  }

  // Fall back to default badges
  return getAvailableBadges();
}

/**
 * Initialize scenario content from JSON files.
 * Call this during server startup.
 */
export function initializeContent(): void {
  const scenarios = loadScenariosFromJSON();
  setScenarios(scenarios);

  // Load badges from JSON and update the shared cache
  const badges = loadBadgesFromJSON();
  setBadges(badges);

  // Validate that content was loaded
  if (scenarios.length === 0) {
    console.error("WARNING: No scenarios loaded! Check content/scenarios/ directory.");
  }
  if (badges.length === 0) {
    console.error("WARNING: No badges loaded! Check content/badges.json file.");
  }

  console.log(`Content initialized: ${scenarios.length} scenarios, ${badges.length} badges`);
}

/**
 * Reload scenarios from JSON files (useful for hot-reload during development).
 */
export function reloadScenarios(): Scenario[] {
  const scenarios = loadScenariosFromJSON();
  setScenarios(scenarios);
  return scenarios;
}

/**
 * Get scenario file path for editing reference.
 */
export function getScenarioFilePath(scenarioId: string): string | null {
  if (!fs.existsSync(SCENARIOS_DIR)) {
    return null;
  }

  let files: string[] = [];
  try {
    files = fs.readdirSync(SCENARIOS_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    return null;
  }

  for (const file of files) {
    const filePath = path.join(SCENARIOS_DIR, file);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const scenario = JSON.parse(content);
      if (scenario.id === scenarioId) {
        return filePath;
      }
    } catch {
      // Skip invalid files
    }
  }

  return null;
}

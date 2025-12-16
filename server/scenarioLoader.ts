import * as fs from "fs";
import * as path from "path";
import type { Scenario, Badge } from "@shared/schema";
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
    const files = fs.readdirSync(SCENARIOS_DIR).filter(f => f.endsWith(".json"));
    
    for (const file of files) {
      const filePath = path.join(SCENARIOS_DIR, file);
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const scenario = JSON.parse(content) as Scenario;
        
        // Basic validation
        if (scenario.id && scenario.title && scenario.scenes) {
          scenarios.push(scenario);
          console.log(`Loaded scenario: ${scenario.id} (${scenario.title})`);
        } else {
          console.warn(`Invalid scenario format in ${file}: missing required fields`);
        }
      } catch (err) {
        console.error(`Error loading scenario from ${file}:`, err);
      }
    }

    // Sort by difficulty order
    const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
    scenarios.sort((a, b) => 
      (difficultyOrder[a.difficulty] || 0) - (difficultyOrder[b.difficulty] || 0)
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
      const badges = JSON.parse(content) as Badge[];
      
      // Basic validation
      const validBadges = badges.filter(b => b.id && b.name && b.description);
      if (validBadges.length !== badges.length) {
        console.warn(`Some badges in badges.json are missing required fields`);
      }
      
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
  const files = fs.readdirSync(SCENARIOS_DIR).filter(f => f.endsWith(".json"));
  
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

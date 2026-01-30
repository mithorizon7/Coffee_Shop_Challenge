#!/usr/bin/env node
/**
 * Scenario Validation Script
 *
 * Enforces:
 * - startSceneId exists
 * - nextSceneId references valid scenes
 * - choices reference valid scenes
 * - every network has a matching choice (network.actionId or connect_<network.id>)
 * - action IDs and choice actionIds are unique per scene
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCENARIOS_DIR = path.join(__dirname, "..", "content", "scenarios");

function getDuplicates(values) {
  const seen = new Set();
  const dupes = new Set();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return Array.from(dupes);
}

function validateScenarioFile(filePath) {
  const errors = [];
  const warnings = [];
  const fileName = path.basename(filePath);

  let scenario;
  try {
    scenario = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    return { errors: [`${fileName}: Failed to parse JSON (${err.message})`], warnings };
  }

  const scenes = Array.isArray(scenario.scenes) ? scenario.scenes : [];
  const sceneIds = new Set(scenes.map((s) => s.id));

  if (!sceneIds.has(scenario.startSceneId)) {
    errors.push(`${fileName}: startSceneId not found (${scenario.startSceneId})`);
  }

  for (const scene of scenes) {
    if (scene.nextSceneId && !sceneIds.has(scene.nextSceneId)) {
      errors.push(`${fileName}: scene ${scene.id} nextSceneId not found (${scene.nextSceneId})`);
    }

    const actions = Array.isArray(scene.actions) ? scene.actions : [];
    const actionIds = actions.map((a) => a.id);
    const actionDupes = getDuplicates(actionIds);
    if (actionDupes.length > 0) {
      errors.push(
        `${fileName}: scene ${scene.id} has duplicate action ids (${actionDupes.join(", ")})`
      );
    }

    const choices = Array.isArray(scene.choices) ? scene.choices : [];
    const choiceActionIds = choices.map((c) => c.actionId);
    const choiceDupes = getDuplicates(choiceActionIds);
    if (choiceDupes.length > 0) {
      errors.push(
        `${fileName}: scene ${scene.id} has duplicate choice actionIds (${choiceDupes.join(", ")})`
      );
    }

    for (const choice of choices) {
      if (!sceneIds.has(choice.nextSceneId)) {
        errors.push(
          `${fileName}: scene ${scene.id} choice ${choice.actionId} nextSceneId not found (${choice.nextSceneId})`
        );
      }
    }

    if (scene.type === "network_selection") {
      const networks = Array.isArray(scene.networks) ? scene.networks : [];
      for (const network of networks) {
        const expectedActionId = network.actionId ?? `connect_${network.id}`;
        const hasChoice = choices.some((c) => c.actionId === expectedActionId);
        if (!hasChoice) {
          errors.push(
            `${fileName}: scene ${scene.id} network ${network.id} missing choice (${expectedActionId})`
          );
        }
      }
    }
  }

  return { errors, warnings };
}

function main() {
  console.log("=== Scenario Validation ===\n");

  if (!fs.existsSync(SCENARIOS_DIR)) {
    console.error(`Scenarios directory not found: ${SCENARIOS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(SCENARIOS_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.error("No scenario JSON files found.");
    process.exit(1);
  }

  const allErrors = [];
  const allWarnings = [];

  for (const file of files) {
    const filePath = path.join(SCENARIOS_DIR, file);
    const { errors, warnings } = validateScenarioFile(filePath);
    allErrors.push(...errors);
    allWarnings.push(...warnings);
  }

  if (allWarnings.length > 0) {
    console.log("WARNINGS:");
    allWarnings.forEach((w) => console.log(`  ${w}`));
    console.log();
  }

  if (allErrors.length > 0) {
    console.log("ERRORS:");
    allErrors.forEach((e) => console.log(`  ${e}`));
    console.log(`\nValidation failed with ${allErrors.length} error(s).`);
    process.exit(1);
  }

  console.log("All scenario files are valid.");
}

main();

#!/usr/bin/env node
/**
 * Scenario Authoring Assist
 *
 * Checks for common authoring mistakes and can apply safe fixes.
 * Safe fix implemented:
 * - Add network.actionId when missing AND a matching choice for connect_<network.id> exists.
 *
 * Warnings include:
 * - Network missing choice for expected actionId
 * - Network actionId mismatch (choice uses connect_<id> but network.actionId differs)
 * - Choice actionId not tied to an action or network
 * - Missing translation keys referenced by *Key fields
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCENARIOS_DIR = path.join(__dirname, "..", "content", "scenarios");
const LOCALES_EN = path.join(__dirname, "..", "client", "src", "locales", "en.json");

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has("--write") || args.has("--fix");

function flattenKeys(obj, prefix = "") {
  const keys = new Set();
  if (!obj || typeof obj !== "object") return keys;
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const nested of flattenKeys(value, fullKey)) {
        keys.add(nested);
      }
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

function collectKeyFields(obj, found = new Set()) {
  if (Array.isArray(obj)) {
    obj.forEach((item) => collectKeyFields(item, found));
    return found;
  }
  if (!obj || typeof obj !== "object") return found;

  for (const [key, value] of Object.entries(obj)) {
    if (key.endsWith("Key") && typeof value === "string") {
      found.add(value);
    } else if (value && typeof value === "object") {
      collectKeyFields(value, found);
    }
  }
  return found;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function main() {
  console.log("=== Scenario Authoring Assist ===\n");

  if (!fs.existsSync(SCENARIOS_DIR)) {
    console.error(`Scenarios directory not found: ${SCENARIOS_DIR}`);
    process.exit(1);
  }

  let enKeys = new Set();
  try {
    const en = readJson(LOCALES_EN);
    enKeys = flattenKeys(en);
  } catch (err) {
    console.warn(`WARNING: Could not load en.json (${err.message}). Key validation skipped.`);
  }

  const files = fs.readdirSync(SCENARIOS_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.error("No scenario JSON files found.");
    process.exit(1);
  }

  let totalWarnings = 0;
  let totalFixes = 0;

  for (const file of files) {
    const filePath = path.join(SCENARIOS_DIR, file);
    let scenario;
    try {
      scenario = readJson(filePath);
    } catch (err) {
      console.error(`${file}: Failed to parse JSON (${err.message})`);
      continue;
    }

    const warnings = [];
    const fixes = [];
    let changed = false;

    const scenes = Array.isArray(scenario.scenes) ? scenario.scenes : [];

    for (const scene of scenes) {
      const actions = Array.isArray(scene.actions) ? scene.actions : [];
      const choices = Array.isArray(scene.choices) ? scene.choices : [];
      const networks = Array.isArray(scene.networks) ? scene.networks : [];

      const actionIds = new Set(actions.map((a) => a.id));
      const choiceActionIds = new Set(choices.map((c) => c.actionId));
      const networkExpected = new Set(
        networks.map((n) => (n.actionId ? n.actionId : `connect_${n.id}`))
      );
      const networkFallback = new Set(networks.map((n) => `connect_${n.id}`));

      for (const network of networks) {
        const fallbackId = `connect_${network.id}`;
        if (!network.actionId) {
          if (choiceActionIds.has(fallbackId)) {
            warnings.push(
              `${file}: scene ${scene.id} network ${network.id} missing actionId (can add ${fallbackId})`
            );
            if (shouldWrite) {
              network.actionId = fallbackId;
              changed = true;
              fixes.push(`${file}: added network.actionId=${fallbackId} in scene ${scene.id}`);
            }
          } else {
            warnings.push(
              `${file}: scene ${scene.id} network ${network.id} missing choice (${fallbackId})`
            );
          }
        } else if (!choiceActionIds.has(network.actionId)) {
          if (choiceActionIds.has(fallbackId)) {
            warnings.push(
              `${file}: scene ${scene.id} network ${network.id} actionId=${network.actionId} has no choice, but ${fallbackId} exists (mismatch)`
            );
          } else {
            warnings.push(
              `${file}: scene ${scene.id} network ${network.id} missing choice (${network.actionId})`
            );
          }
        }
      }

      for (const choice of choices) {
        if (
          !actionIds.has(choice.actionId) &&
          !networkExpected.has(choice.actionId) &&
          !networkFallback.has(choice.actionId)
        ) {
          warnings.push(
            `${file}: scene ${scene.id} choice ${choice.actionId} has no matching action or network`
          );
        }
      }
    }

    if (enKeys.size > 0) {
      const keys = collectKeyFields(scenario);
      for (const key of keys) {
        if (!enKeys.has(key)) {
          warnings.push(`${file}: missing i18n key in en.json (${key})`);
        }
      }
    }

    if (shouldWrite && changed) {
      writeJson(filePath, scenario);
    }

    if (fixes.length > 0) {
      console.log("FIXES:");
      fixes.forEach((f) => console.log(`  ${f}`));
      console.log();
      totalFixes += fixes.length;
    }

    if (warnings.length > 0) {
      console.log("WARNINGS:");
      warnings.forEach((w) => console.log(`  ${w}`));
      console.log();
      totalWarnings += warnings.length;
    }
  }

  if (totalFixes === 0 && totalWarnings === 0) {
    console.log("No issues found.");
  } else {
    console.log(`Summary: ${totalWarnings} warning(s), ${totalFixes} fix(es).`);
  }
}

main();

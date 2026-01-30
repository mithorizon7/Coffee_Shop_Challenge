#!/usr/bin/env node
/**
 * i18n Validation Script
 *
 * Validates that all locale files are complete and consistent.
 * Enforces:
 * - Key parity between en, lv, ru (all must have same keys)
 * - No empty values
 * - ICU placeholder consistency (same variables)
 * - Valid ICU syntax
 * - Consistent value types (string vs object)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, "..", "client", "src", "locales");
const BASE_LOCALE = "en";
const ALL_LOCALES = ["en", "lv", "ru"];

function flattenWithTypes(obj, prefix = "") {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenWithTypes(value, fullKey));
    } else {
      result[fullKey] = {
        value,
        type: Array.isArray(value) ? "array" : typeof value,
      };
    }
  }

  return result;
}

function extractPlaceholders(str) {
  if (typeof str !== "string") return new Set();
  const placeholders = new Set();

  // Match simple placeholders {name} and ICU variable names {name, plural, ...}
  // Skip # which is the ICU numeric placeholder
  const regex = /\{([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match;
  while ((match = regex.exec(str)) !== null) {
    const varName = match[1];
    // Skip ICU format keywords
    if (
      ![
        "plural",
        "select",
        "selectordinal",
        "number",
        "date",
        "time",
        "one",
        "other",
        "few",
        "many",
        "zero",
        "two",
      ].includes(varName)
    ) {
      placeholders.add(varName);
    }
  }

  return placeholders;
}

function validateICUSyntax(str, key, locale = null) {
  if (typeof str !== "string") return null;

  // Check for common ICU patterns
  const isPluralMsg = /\{[^}]+,\s*plural\s*,/.test(str);
  const isSelectMsg = /\{[^}]+,\s*select\s*,/.test(str);
  const isSelectOrdinal = /\{[^}]+,\s*selectordinal\s*,/.test(str);

  const hasICU = isPluralMsg || isSelectMsg || isSelectOrdinal;
  if (!hasICU) return null;

  // Basic validation: check balanced braces
  let depth = 0;
  for (const char of str) {
    if (char === "{") depth++;
    if (char === "}") depth--;
    if (depth < 0) return `Unbalanced braces (extra closing brace)`;
  }
  if (depth !== 0) return `Unbalanced braces (${depth} unclosed)`;

  // Check for required plural categories
  if (isPluralMsg) {
    // 'other' is always required
    if (!/\bother\s*\{/.test(str)) {
      return `ICU plural missing required 'other' category`;
    }

    // Russian-specific: must have one, few, many, other for proper pluralization
    if (locale === "ru") {
      const categories = ["one", "few", "many", "other"];
      const missing = categories.filter((cat) => {
        const pattern = new RegExp(`\\b${cat}\\s*\\{`);
        return !pattern.test(str);
      });

      if (missing.length > 0) {
        return `Russian plural missing categories: ${missing.join(", ")}`;
      }
    }
  }

  return null;
}

function loadLocale(locale) {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Locale file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function main() {
  console.log("=== i18n Validation ===\n");

  const errors = [];
  const warnings = [];

  // Load all locales
  const locales = {};
  const flatLocales = {};

  for (const locale of ALL_LOCALES) {
    try {
      locales[locale] = loadLocale(locale);
      flatLocales[locale] = flattenWithTypes(locales[locale]);
      console.log(`Loaded ${locale}.json: ${Object.keys(flatLocales[locale]).length} keys`);
    } catch (err) {
      errors.push(`Failed to load ${locale}.json: ${err.message}`);
    }
  }
  console.log();

  if (errors.length > 0) {
    console.log("ERRORS:");
    errors.forEach((e) => console.log(`  ${e}`));
    process.exit(1);
  }

  const baseFlat = flatLocales[BASE_LOCALE];
  const baseKeys = Object.keys(baseFlat).sort();

  // Validate each locale against base
  for (const locale of ALL_LOCALES) {
    if (locale === BASE_LOCALE) continue;

    const flat = flatLocales[locale];
    const keys = Object.keys(flat);

    // 1. Check for MISSING keys (ERROR)
    const missingKeys = baseKeys.filter((k) => !keys.includes(k));
    if (missingKeys.length > 0) {
      errors.push(`${locale}: ${missingKeys.length} missing keys`);
      missingKeys.slice(0, 10).forEach((k) => {
        errors.push(`  - ${k}`);
      });
      if (missingKeys.length > 10) {
        errors.push(`  ... and ${missingKeys.length - 10} more`);
      }
    }

    // 2. Check for EXTRA keys (WARNING)
    const extraKeys = keys.filter((k) => !baseKeys.includes(k));
    if (extraKeys.length > 0) {
      warnings.push(`${locale}: ${extraKeys.length} extra keys not in ${BASE_LOCALE}`);
    }

    // 3. Check for EMPTY values (ERROR)
    const emptyKeys = keys.filter((k) => {
      const val = flat[k]?.value;
      return val === "" || val === null || val === undefined;
    });
    if (emptyKeys.length > 0) {
      errors.push(`${locale}: ${emptyKeys.length} empty values`);
      emptyKeys.slice(0, 5).forEach((k) => {
        errors.push(`  - ${k}`);
      });
    }

    // 4. Check TYPE consistency (ERROR)
    const typeMismatches = [];
    for (const key of keys) {
      if (baseFlat[key]) {
        const baseType = baseFlat[key].type;
        const targetType = flat[key].type;
        if (baseType !== targetType) {
          typeMismatches.push({ key, baseType, targetType });
        }
      }
    }
    if (typeMismatches.length > 0) {
      errors.push(`${locale}: ${typeMismatches.length} type mismatches`);
      typeMismatches.slice(0, 3).forEach(({ key, baseType, targetType }) => {
        errors.push(`  - ${key}: ${BASE_LOCALE} is ${baseType}, ${locale} is ${targetType}`);
      });
    }

    // 5. Check PLACEHOLDER consistency (ERROR)
    const placeholderMismatches = [];
    for (const key of keys) {
      if (baseFlat[key]) {
        const basePH = extractPlaceholders(baseFlat[key].value);
        const targetPH = extractPlaceholders(flat[key].value);

        // Check if base placeholders exist in target
        const missingInTarget = [...basePH].filter((p) => !targetPH.has(p));
        const extraInTarget = [...targetPH].filter((p) => !basePH.has(p));

        if (missingInTarget.length > 0 || extraInTarget.length > 0) {
          placeholderMismatches.push({ key, missingInTarget, extraInTarget });
        }
      }
    }
    if (placeholderMismatches.length > 0) {
      errors.push(`${locale}: ${placeholderMismatches.length} placeholder mismatches`);
      placeholderMismatches.slice(0, 5).forEach(({ key, missingInTarget, extraInTarget }) => {
        if (missingInTarget.length > 0) {
          errors.push(`  - ${key}: missing {${missingInTarget.join(", ")}}`);
        }
        if (extraInTarget.length > 0) {
          errors.push(`  - ${key}: extra {${extraInTarget.join(", ")}}`);
        }
      });
    }
  }

  // 6. Validate ICU syntax in ALL locales (with locale-specific rules)
  for (const locale of ALL_LOCALES) {
    const flat = flatLocales[locale];
    const icuErrors = [];

    for (const [key, { value }] of Object.entries(flat)) {
      const error = validateICUSyntax(value, key, locale);
      if (error) {
        icuErrors.push({ key, error });
      }
    }

    if (icuErrors.length > 0) {
      errors.push(`${locale}: ${icuErrors.length} ICU syntax errors`);
      icuErrors.forEach(({ key, error }) => {
        errors.push(`  - ${key}: ${error}`);
      });
    }
  }

  // Report results
  console.log("=== Validation Results ===\n");

  if (warnings.length > 0) {
    console.log("WARNINGS:");
    warnings.forEach((w) => console.log(`  ${w}`));
    console.log();
  }

  if (errors.length > 0) {
    console.log("ERRORS:");
    errors.forEach((e) => console.log(`  ${e}`));
    console.log();
    console.log("FAILED: Fix the errors above.\n");
    process.exit(1);
  } else {
    console.log("PASSED: All translations are valid and complete.\n");
    process.exit(0);
  }
}

main();

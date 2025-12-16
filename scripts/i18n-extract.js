#!/usr/bin/env node
/**
 * i18n Key Extraction Script
 * 
 * Scans source files for translation keys used in:
 * - t('key') calls
 * - <Trans i18nKey="key"> components
 * - useTranslation with keyPrefix
 * 
 * Reports missing keys across ALL locales (en, lv, ru)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '..', 'client', 'src');
const LOCALES_DIR = path.join(SRC_DIR, 'locales');
const LOCALES = ['en', 'lv', 'ru'];

// Multiple patterns to catch different i18next usages
const PATTERNS = [
  // t('key') or t("key") or t(`key`)
  /\bt\s*\(\s*['"`]([^'"`\n]+)['"`]/g,
  // t('key', { ... })
  /\bt\s*\(\s*['"`]([^'"`\n]+)['"`]\s*,/g,
  // <Trans i18nKey="key">
  /<Trans[^>]*\si18nKey\s*=\s*['"`]([^'"`]+)['"`]/g,
  // i18nKey={'key'} or i18nKey={"key"}
  /i18nKey\s*=\s*\{?\s*['"`]([^'"`]+)['"`]\s*\}?/g,
];

// Pattern to detect keyPrefix usage (for context)
const KEY_PREFIX_PATTERN = /useTranslation\s*\([^)]*keyPrefix\s*:\s*['"`]([^'"`]+)['"`]/g;

function extractKeysFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const keys = new Set();
  const prefixes = [];
  
  // Find any keyPrefix declarations
  let prefixMatch;
  const prefixRegex = new RegExp(KEY_PREFIX_PATTERN.source, KEY_PREFIX_PATTERN.flags);
  while ((prefixMatch = prefixRegex.exec(content)) !== null) {
    prefixes.push(prefixMatch[1]);
  }
  
  // Extract keys using all patterns
  for (const pattern of PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(content)) !== null) {
      const key = match[1];
      // Skip dynamic keys (containing variables)
      if (!key.includes('${') && !key.includes('{') && key.trim()) {
        keys.add(key);
        
        // If there are prefixes in this file, also try prefixed versions
        for (const prefix of prefixes) {
          if (!key.includes('.')) {
            keys.add(`${prefix}.${key}`);
          }
        }
      }
    }
  }
  
  return keys;
}

function walkDir(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'locales') {
        walk(fullPath);
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

function flattenKeys(obj, prefix = '') {
  const keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

function loadLocaleKeys(locale) {
  const localePath = path.join(LOCALES_DIR, `${locale}.json`);
  if (fs.existsSync(localePath)) {
    const content = JSON.parse(fs.readFileSync(localePath, 'utf-8'));
    return new Set(flattenKeys(content));
  }
  return new Set();
}

function main() {
  console.log('=== i18n Key Extraction ===\n');
  
  // Get all source files
  const files = walkDir(SRC_DIR);
  console.log(`Scanning ${files.length} source files...\n`);
  
  // Extract keys from all files
  const allKeys = new Set();
  
  for (const file of files) {
    const keys = extractKeysFromFile(file);
    keys.forEach(key => allKeys.add(key));
  }
  
  const codeKeys = Array.from(allKeys).sort();
  console.log(`Found ${codeKeys.length} unique translation keys in code.\n`);
  
  // Load all locale files
  const localeKeys = {};
  for (const locale of LOCALES) {
    localeKeys[locale] = loadLocaleKeys(locale);
    console.log(`${locale}.json: ${localeKeys[locale].size} keys`);
  }
  console.log();
  
  // Check for missing keys in ALL locales
  let hasErrors = false;
  const missingReport = {};
  
  for (const locale of LOCALES) {
    const missing = codeKeys.filter(k => !localeKeys[locale].has(k));
    if (missing.length > 0) {
      hasErrors = true;
      missingReport[locale] = missing;
    }
  }
  
  // Report missing keys
  if (Object.keys(missingReport).length > 0) {
    console.log('=== MISSING KEYS ===\n');
    for (const [locale, missing] of Object.entries(missingReport)) {
      console.log(`${locale}.json is missing ${missing.length} keys:`);
      missing.slice(0, 15).forEach(k => console.log(`  - ${k}`));
      if (missing.length > 15) {
        console.log(`  ... and ${missing.length - 15} more\n`);
      }
      console.log();
    }
  }
  
  // Check for unused keys (in en.json but not in code)
  const enKeys = localeKeys['en'];
  const unusedKeys = Array.from(enKeys).filter(k => !allKeys.has(k)).sort();
  
  if (unusedKeys.length > 0) {
    console.log('=== POTENTIALLY UNUSED KEYS (in en.json but not found in code) ===\n');
    console.log('Note: Some may be dynamically constructed or from JSON content files.\n');
    unusedKeys.slice(0, 20).forEach(k => console.log(`  - ${k}`));
    if (unusedKeys.length > 20) {
      console.log(`  ... and ${unusedKeys.length - 20} more`);
    }
    console.log();
  }
  
  // Summary
  console.log('=== Summary ===');
  console.log(`Code keys found: ${codeKeys.length}`);
  for (const locale of LOCALES) {
    const missing = missingReport[locale]?.length || 0;
    const status = missing === 0 ? 'OK' : `MISSING ${missing}`;
    console.log(`${locale}.json: ${localeKeys[locale].size} keys [${status}]`);
  }
  
  if (hasErrors) {
    console.log('\nFAILED: Add missing keys to locale files.\n');
    process.exit(1);
  } else {
    console.log('\nPASSED: All code keys exist in all locale files.\n');
    process.exit(0);
  }
}

main();

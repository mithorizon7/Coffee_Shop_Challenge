import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const cwd = process.cwd();
const scenariosDir = join(cwd, "content", "scenarios");
const localeDir = join(cwd, "client", "src", "locales");

const scenarioFiles = readdirSync(scenariosDir).filter((file) => file.endsWith(".json"));
if (scenarioFiles.length === 0) {
  throw new Error("Smoke test failed: no scenario JSON files found.");
}

const locales = ["en", "lv", "ru"];
const localeData = Object.fromEntries(
  locales.map((locale) => [
    locale,
    JSON.parse(readFileSync(join(localeDir, `${locale}.json`), "utf8")),
  ])
);

for (const file of scenarioFiles) {
  const scenario = JSON.parse(readFileSync(join(scenariosDir, file), "utf8"));
  if (!scenario.id) {
    throw new Error(`Smoke test failed: scenario ${file} missing id.`);
  }
  for (const locale of locales) {
    const scenarioEntry = localeData[locale]?.scenarios?.[scenario.id];
    if (!scenarioEntry) {
      throw new Error(`Smoke test failed: locale ${locale} missing scenario ${scenario.id}.`);
    }
  }
}

console.log("Smoke test passed.");

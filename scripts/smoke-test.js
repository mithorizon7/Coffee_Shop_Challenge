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
    if (scenario.id === "coffee_shop_beginner") {
      const openNetwork = scenario.scenes
        .flatMap((scene) => scene.networks ?? [])
        .find((network) => network.ssid === "DailyGrind_Open");
      const feedback = scenarioEntry.consequences?.cons_open;
      if (!openNetwork || !feedback?.whatHappened?.includes(openNetwork.ssid)) {
        throw new Error(
          `Smoke test failed: ${locale} open-network feedback names the wrong network.`
        );
      }
      if (!feedback.saferAlternative.includes("DailyGrind_Guest")) {
        throw new Error(
          `Smoke test failed: ${locale} open-network feedback omits the safer network.`
        );
      }
    }
  }
}

console.log("Smoke test passed.");

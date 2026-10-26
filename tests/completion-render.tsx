import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { Router } from "wouter";
import { CompletionScreen } from "../client/src/components/CompletionScreen";
import en from "../client/src/locales/en.json";
import scenarioData from "../content/scenarios/coffee_shop_beginner.json";
import type { GameSession, Scenario } from "../shared/schema";

const i18n = createInstance();
void i18n.init({ lng: "en", initImmediate: false, resources: { en: { translation: en } } });
const session: GameSession = {
  id: "synthetic-completion",
  scenarioId: scenarioData.id,
  currentSceneId: "completion",
  difficulty: "beginner",
  score: { safetyPoints: 10, riskPoints: 0, decisionsCount: 1, correctDecisions: 1 },
  vpnEnabled: false,
  completedSceneIds: [],
  badges: [],
  startedAt: "2026-10-26T12:00:00Z",
  completedAt: "2026-10-26T12:05:00Z",
};

export function renderCompletion(saveState?: "guest" | "saving" | "saved", isBusy = false) {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <Router ssrPath="/">
        <CompletionScreen
          session={session}
          scenario={scenarioData as Scenario}
          onPlayAgain={() => {}}
          onSelectNewScenario={() => {}}
          saveState={saveState}
          isBusy={isBusy}
        />
      </Router>
    </I18nextProvider>
  );
}

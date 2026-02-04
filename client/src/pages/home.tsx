import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Wifi,
  AlertTriangle,
  ArrowRight,
  Loader2,
  BarChart3,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScenarioIntro } from "@/components/ScenarioIntro";
import { GameContainer } from "@/components/GameContainer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import type { GameSession, Scenario, ScenarioListItem, DifficultyLevel } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { orderedDifficulties } from "@/lib/difficultyConfig";
import { translateScenarioTitle } from "@/lib/translateContent";

type ViewState = "landing" | "scenario_intro" | "loading_scenario" | "playing";
type ExplorationPhase = "explore" | "final";

export default function Home() {
  const { t } = useTranslation();
  const [viewState, setViewState] = useState<ViewState>("landing");
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [explorationPhase, setExplorationPhase] = useState<ExplorationPhase>("explore");
  const [exploredNetworkIds, setExploredNetworkIds] = useState<string[]>([]);
  const [rootNetworkSceneId, setRootNetworkSceneId] = useState<string | null>(null);
  const [rootNetworkIds, setRootNetworkIds] = useState<string[]>([]);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [viewState]);

  const {
    data: scenarioList,
    isLoading: scenariosLoading,
    error: scenariosError,
  } = useQuery<ScenarioListItem[]>({
    queryKey: ["/api/scenarios"],
  });

  const orderedScenarios = useMemo(() => {
    if (!scenarioList) return [];
    return orderedDifficulties.flatMap((difficulty) =>
      scenarioList.filter((scenario) => scenario.difficulty === difficulty)
    );
  }, [scenarioList]);

  const currentScenarioPreview = orderedScenarios[scenarioIndex] ?? null;
  const nextScenarioPreview = orderedScenarios[scenarioIndex + 1] ?? null;

  const createSessionMutation = useMutation({
    mutationFn: async (params: { scenarioId: string; difficulty: DifficultyLevel }) => {
      const response = await apiRequest("POST", "/api/sessions", params);
      return (await response.json()) as GameSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    },
  });

  const handleStartChallenge = () => {
    setScenarioIndex(0);
    setViewState("scenario_intro");
  };

  const startScenarioSession = async (scenario: Scenario, startAtSceneId?: string) => {
    const session = await createSessionMutation.mutateAsync({
      scenarioId: scenario.id,
      difficulty: scenario.difficulty,
    });

    if (!startAtSceneId) {
      return session;
    }

    try {
      const response = await apiRequest("PATCH", `/api/sessions/${session.id}`, {
        currentSceneId: startAtSceneId,
      });
      if (response.ok) {
        return (await response.json()) as GameSession;
      }
    } catch (error) {
      console.error("Failed to jump to network selection:", error);
    }

    return session;
  };

  const handleStartScenario = async (scenarioId: string) => {
    setViewState("loading_scenario");
    setExplorationPhase("explore");
    setExploredNetworkIds([]);

    try {
      const scenarioResponse = await fetch(`/api/scenarios/${scenarioId}`);
      if (!scenarioResponse.ok) {
        throw new Error("Failed to load scenario");
      }
      const scenario: Scenario = await scenarioResponse.json();

      const rootNetworkScene =
        scenario.scenes.find(
          (scene) => scene.type === "network_selection" && (scene.networks?.length ?? 0) > 1
        ) ?? scenario.scenes.find((scene) => scene.type === "network_selection");

      setRootNetworkSceneId(rootNetworkScene?.id ?? null);
      setRootNetworkIds(rootNetworkScene?.networks?.map((network) => network.id) ?? []);

      const session = await startScenarioSession(scenario);

      setSelectedScenario(scenario);
      setCurrentSession(session);
      setViewState("playing");
    } catch (error) {
      console.error("Failed to start scenario:", error);
      setViewState("scenario_intro");
    }
  };

  const handleStartFinalRun = async () => {
    if (!selectedScenario) return;

    setExplorationPhase("final");
    setExploredNetworkIds([]);

    try {
      const session = await startScenarioSession(selectedScenario);
      setCurrentSession(session);
    } catch (error) {
      console.error("Failed to start final run:", error);
    }
  };

  const handleExitGame = () => {
    setCurrentSession(null);
    setSelectedScenario(null);
    setViewState("scenario_intro");
  };

  const handleRestartGame = async () => {
    if (!currentSession || !selectedScenario) return;

    try {
      const session = await startScenarioSession(selectedScenario);
      setCurrentSession(session);
    } catch (error) {
      console.error("Failed to restart game:", error);
    }
  };

  const handleAdvanceScenario = () => {
    const nextIndex = scenarioIndex + 1;
    setCurrentSession(null);
    setSelectedScenario(null);
    setRootNetworkSceneId(null);
    setRootNetworkIds([]);
    setExploredNetworkIds([]);
    setExplorationPhase("explore");

    if (nextIndex >= orderedScenarios.length) {
      setScenarioIndex(0);
      setViewState("landing");
      return;
    }

    setScenarioIndex(nextIndex);
    setViewState("scenario_intro");
  };

  if (viewState === "loading_scenario") {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="app-surface text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t("home.loadingScenario")}</p>
        </div>
      </div>
    );
  }

  if (viewState === "playing" && currentSession && selectedScenario) {
    return (
      <GameContainer
        key={currentSession.id}
        initialSession={currentSession}
        scenario={selectedScenario}
        onExit={handleExitGame}
        onRestart={handleRestartGame}
        onAdvance={handleAdvanceScenario}
        isLastScenario={scenarioIndex >= orderedScenarios.length - 1}
        exploration={{
          phase: explorationPhase,
          rootNetworkSceneId,
          rootNetworkIds,
          exploredNetworkIds,
          onNetworkExplored: (networkId: string) => {
            setExploredNetworkIds((prev) =>
              prev.includes(networkId) ? prev : [...prev, networkId]
            );
          },
          onStartFinalRun: handleStartFinalRun,
        }}
      />
    );
  }

  if (viewState === "scenario_intro") {
    return (
      <div className="app-shell">
        <header className="app-surface border-b border-border/60 bg-background/70 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
            <button
              onClick={() => setViewState("landing")}
              className="flex items-center gap-3 rounded-full border border-transparent px-3 py-1.5 text-sm font-medium transition hover:border-border/70 hover:bg-background/60"
              data-testid="button-back-landing"
            >
              <div className="w-9 h-9 rounded-2xl bg-primary/15 flex items-center justify-center shadow-[0_12px_30px_-20px_hsl(var(--primary)/0.8)]">
                <Wifi className="w-4 h-4 text-primary" />
              </div>
              <span className="font-display font-semibold tracking-tight text-foreground">
                {t("home.appName")}
              </span>
            </button>
            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <>
                  <Link href="/progress">
                    <Button variant="ghost" size="sm" data-testid="button-progress">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      {t("home.progress")}
                    </Button>
                  </Link>
                  <Link href="/educator">
                    <Button variant="ghost" size="sm" data-testid="button-educator">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      {t("home.educator")}
                    </Button>
                  </Link>
                </>
              )}
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="app-surface max-w-6xl mx-auto px-4 py-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {scenariosLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">{t("home.loadingScenarios")}</span>
              </div>
            )}

            {scenariosError && (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-6 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
                <h3 className="font-medium text-foreground mb-2">
                  {t("home.failedToLoadScenarios")}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">{t("errors.loadingFailed")}</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  {t("home.refreshPage")}
                </Button>
              </div>
            )}

            {currentScenarioPreview && (
              <ScenarioIntro
                scenario={currentScenarioPreview}
                index={scenarioIndex}
                total={orderedScenarios.length}
                onStart={() => handleStartScenario(currentScenarioPreview.id)}
                onBack={() => setViewState("landing")}
                nextScenarioTitle={
                  nextScenarioPreview
                    ? translateScenarioTitle(t, nextScenarioPreview.id, nextScenarioPreview.title)
                    : undefined
                }
              />
            )}
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-surface border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center shadow-[0_12px_30px_-20px_hsl(var(--primary)/0.8)]">
              <Wifi className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-semibold tracking-tight text-foreground">
              {t("home.appName")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                <Link href="/progress">
                  <Button variant="ghost" size="sm" data-testid="button-progress">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    {t("home.progress")}
                  </Button>
                </Link>
                <Link href="/educator">
                  <Button variant="ghost" size="sm" data-testid="button-educator">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    {t("home.educator")}
                  </Button>
                </Link>
              </>
            )}
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="app-surface max-w-6xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-stretch">
            <Card className="p-8 md:p-10 lg:p-12 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-background/70 via-transparent to-background/30 pointer-events-none" />
              <div className="absolute -top-24 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-28 -left-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
              <div className="relative flex h-full flex-col justify-between gap-10">
                <div className="space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center shadow-[0_18px_40px_-26px_hsl(var(--primary)/0.8)]">
                    <Wifi className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-3">
                    <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">
                      {t("home.title")}
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-xl">
                      {t("home.description")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <Button
                    size="lg"
                    onClick={handleStartChallenge}
                    data-testid="button-start-challenge"
                  >
                    {t("home.startLearning")}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <p className="text-sm text-muted-foreground">{t("home.difficultyLevels")}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 md:p-8 bg-muted/40 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-background/60 via-transparent to-background/20 pointer-events-none" />
              <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
              <div className="relative space-y-4">
                <h3 className="font-display font-semibold text-foreground">
                  {t("home.whatYouWillLearn")}
                </h3>
                <ul className="grid md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span>{t("home.learn1")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span>{t("home.learn2")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span>{t("home.learn3")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span>{t("home.learn4")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span>{t("home.learn5")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span>{t("home.learn6")}</span>
                  </li>
                </ul>
              </div>
            </Card>
          </div>
        </motion.div>
      </main>

      <footer className="app-surface border-t border-border/60 bg-background/70 backdrop-blur mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>{t("home.footer")}</p>
          {!isAuthenticated && (
            <div className="mt-3 flex justify-center">
              <Link href="/progress">
                <Button variant="ghost" size="sm" data-testid="button-progress-cta">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {t("home.progress")}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

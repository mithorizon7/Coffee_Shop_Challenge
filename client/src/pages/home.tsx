import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Wifi,
  Shield,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  Loader2,
  BarChart3,
  LogIn,
  LogOut,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DifficultySelector } from "@/components/DifficultySelector";
import { GameContainer } from "@/components/GameContainer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import type { GameSession, Scenario, ScenarioListItem, DifficultyLevel } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";

type ViewState = "landing" | "scenario_select" | "loading_scenario" | "playing";

export default function Home() {
  const { t } = useTranslation();
  const [viewState, setViewState] = useState<ViewState>("landing");
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const {
    data: scenarioList,
    isLoading: scenariosLoading,
    error: scenariosError,
  } = useQuery<ScenarioListItem[]>({
    queryKey: ["/api/scenarios"],
  });

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
    setViewState("scenario_select");
  };

  const handleSelectScenario = async (scenarioId: string) => {
    setViewState("loading_scenario");

    try {
      const scenarioResponse = await fetch(`/api/scenarios/${scenarioId}`);
      if (!scenarioResponse.ok) {
        throw new Error("Failed to load scenario");
      }
      const scenario: Scenario = await scenarioResponse.json();

      const session = await createSessionMutation.mutateAsync({
        scenarioId: scenario.id,
        difficulty: scenario.difficulty,
      });

      setSelectedScenario(scenario);
      setCurrentSession(session);
      setViewState("playing");
    } catch (error) {
      console.error("Failed to start scenario:", error);
      setViewState("scenario_select");
    }
  };

  const handleExitGame = () => {
    setCurrentSession(null);
    setSelectedScenario(null);
    setViewState("scenario_select");
  };

  const handleRestartGame = async () => {
    if (!currentSession || !selectedScenario) return;

    try {
      const session = await createSessionMutation.mutateAsync({
        scenarioId: selectedScenario.id,
        difficulty: selectedScenario.difficulty,
      });
      setCurrentSession(session);
    } catch (error) {
      console.error("Failed to restart game:", error);
    }
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
      />
    );
  }

  if (viewState === "scenario_select") {
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                {t("home.chooseScenario")}
              </h1>
              <p className="text-muted-foreground max-w-2xl">{t("home.chooseScenarioSubtitle")}</p>
            </div>

            <Card className="p-6 md:p-8">
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

              {scenarioList && (
                <DifficultySelector scenarios={scenarioList} onSelect={handleSelectScenario} />
              )}
            </Card>
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
            {authLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-2">
                {user?.profileImageUrl && (
                  <img
                    src={user.profileImageUrl}
                    alt={t("aria.profileImageAlt")}
                    className="w-7 h-7 rounded-full"
                    data-testid="img-user-profile"
                  />
                )}
                <Button variant="ghost" size="sm" asChild data-testid="button-logout">
                  <a href="/api/logout" aria-label={t("home.signOut")}>
                    <LogOut className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" asChild data-testid="button-login">
                <a href="/api/login">
                  <LogIn className="w-4 h-4 mr-2" />
                  {t("home.signIn")}
                </a>
              </Button>
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
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] items-start">
            <Card className="p-8 md:p-10 overflow-hidden">
              <div className="absolute -top-24 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-28 -left-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
              <div className="relative space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center shadow-[0_18px_40px_-26px_hsl(var(--primary)/0.8)]">
                  <Wifi className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-3">
                  <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">
                    {t("home.title")}
                  </h1>
                  <p className="text-lg text-muted-foreground max-w-xl">{t("home.description")}</p>
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

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <Card className="p-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 dark:bg-emerald-950/40 flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-emerald-700 dark:text-emerald-300" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    {t("home.zeroRisk")}
                  </h3>
                  <p className="text-sm text-muted-foreground">{t("home.zeroRiskDesc")}</p>
                </Card>

                <Card className="p-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100/70 dark:bg-amber-950/40 flex items-center justify-center mb-4">
                    <AlertTriangle className="w-6 h-6 text-amber-700 dark:text-amber-300" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    {t("home.realisticConsequences")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("home.realisticConsequencesDesc")}
                  </p>
                </Card>

                <Card className="p-6 sm:col-span-2 lg:col-span-1">
                  <div className="w-12 h-12 rounded-2xl bg-sky-100/70 dark:bg-sky-950/40 flex items-center justify-center mb-4">
                    <BookOpen className="w-6 h-6 text-sky-700 dark:text-sky-300" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    {t("home.educationalDebriefs")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("home.educationalDebriefsDesc")}
                  </p>
                </Card>
              </div>

              <Card className="p-6 bg-muted/40">
                <h3 className="font-display font-semibold text-foreground mb-3">
                  {t("home.whatYouWillLearn")}
                </h3>
                <ul className="grid md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span>{t("home.learn1")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span>{t("home.learn2")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span>{t("home.learn3")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span>{t("home.learn4")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span>{t("home.learn5")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span>{t("home.learn6")}</span>
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="app-surface border-t border-border/60 bg-background/70 backdrop-blur mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>{t("home.footer")}</p>
        </div>
      </footer>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Wifi, Shield, AlertTriangle, BookOpen, ArrowRight, Loader2, BarChart3, LogIn, LogOut, User, GraduationCap } from "lucide-react";
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

  const { data: scenarioList, isLoading: scenariosLoading, error: scenariosError } = useQuery<ScenarioListItem[]>({
    queryKey: ["/api/scenarios"],
  });

  const createSessionMutation = useMutation({
    mutationFn: async (params: { scenarioId: string; difficulty: DifficultyLevel }) => {
      const response = await apiRequest("POST", "/api/sessions", params);
      return await response.json() as GameSession;
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t('home.loadingScenario')}</p>
        </div>
      </div>
    );
  }

  if (viewState === "playing" && currentSession && selectedScenario) {
    return (
      <GameContainer
        initialSession={currentSession}
        scenario={selectedScenario}
        onExit={handleExitGame}
        onRestart={handleRestartGame}
      />
    );
  }

  if (viewState === "scenario_select") {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
            <button
              onClick={() => setViewState("landing")}
              className="flex items-center gap-2 hover-elevate active-elevate-2 px-2 py-1 rounded-md -ml-2"
              data-testid="button-back-landing"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wifi className="w-4 h-4 text-primary" />
              </div>
              <span className="font-display font-semibold text-foreground">
                Coffee Shop Challenge
              </span>
            </button>
            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <>
                  <Link href="/progress">
                    <Button variant="ghost" size="sm" data-testid="button-progress">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Progress
                    </Button>
                  </Link>
                  <Link href="/educator">
                    <Button variant="ghost" size="sm" data-testid="button-educator">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Educator
                    </Button>
                  </Link>
                </>
              )}
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                {t('home.chooseScenario')}
              </h1>
              <p className="text-muted-foreground">
                {t('home.chooseScenarioSubtitle')}
              </p>
            </div>

            {scenariosLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">{t('home.loadingScenarios')}</span>
              </div>
            )}

            {scenariosError && (
              <Card className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
                <h3 className="font-medium text-foreground mb-2">{t('home.failedToLoadScenarios')}</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {t('errors.loadingFailed')}
                </p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  {t('home.refreshPage')}
                </Button>
              </Card>
            )}

            {scenarioList && (
              <DifficultySelector
                scenarios={scenarioList}
                onSelect={handleSelectScenario}
              />
            )}
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wifi className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display font-semibold text-foreground">
              Coffee Shop Challenge
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                <Link href="/progress">
                  <Button variant="ghost" size="sm" data-testid="button-progress">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Progress
                  </Button>
                </Link>
                <Link href="/educator">
                  <Button variant="ghost" size="sm" data-testid="button-educator">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Educator
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
                    alt="Profile" 
                    className="w-7 h-7 rounded-full"
                    data-testid="img-user-profile"
                  />
                )}
                <Button variant="ghost" size="sm" asChild data-testid="button-logout">
                  <a href="/api/logout">
                    <LogOut className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" asChild data-testid="button-login">
                <a href="/api/login">
                  <LogIn className="w-4 h-4 mr-2" />
                  {t('home.signIn')}
                </a>
              </Button>
            )}
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Wifi className="w-10 h-10 text-primary" />
            </div>
            <h1 className="font-display text-4xl font-bold text-foreground">
              {t('home.title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('home.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">
                {t('home.zeroRisk')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('home.zeroRiskDesc')}
              </p>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">
                {t('home.realisticConsequences')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('home.realisticConsequencesDesc')}
              </p>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">
                {t('home.educationalDebriefs')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('home.educationalDebriefsDesc')}
              </p>
            </Card>
          </div>

          <div className="text-center space-y-4">
            <Button 
              size="lg" 
              onClick={handleStartChallenge}
              data-testid="button-start-challenge"
            >
              {t('home.startLearning')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-sm text-muted-foreground">
              {t('home.difficultyLevels')}
            </p>
          </div>

          <Card className="p-6 bg-muted/50">
            <h3 className="font-display font-semibold text-foreground mb-3">
              {t('home.whatYouWillLearn')}
            </h3>
            <ul className="grid md:grid-cols-2 gap-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>{t('home.learn1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>{t('home.learn2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>{t('home.learn3')}</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>{t('home.learn4')}</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>{t('home.learn5')}</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>{t('home.learn6')}</span>
              </li>
            </ul>
          </Card>
        </motion.div>
      </main>

      <footer className="border-t border-border mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>
            {t('home.footer')}
          </p>
        </div>
      </footer>
    </div>
  );
}

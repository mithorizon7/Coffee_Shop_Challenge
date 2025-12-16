import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Wifi, Shield, AlertTriangle, BookOpen, ArrowRight, Loader2, BarChart3, LogIn, LogOut, User, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DifficultySelector } from "@/components/DifficultySelector";
import { GameContainer } from "@/components/GameContainer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import type { GameSession, Scenario, ScenarioListItem, DifficultyLevel } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";

type ViewState = "landing" | "scenario_select" | "loading_scenario" | "playing";

export default function Home() {
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
          <p className="text-muted-foreground">Loading scenario...</p>
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
                Choose Your Challenge
              </h1>
              <p className="text-muted-foreground">
                Select a scenario to practice your public Wi-Fi security judgment
              </p>
            </div>

            {scenariosLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Loading scenarios...</span>
              </div>
            )}

            {scenariosError && (
              <Card className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
                <h3 className="font-medium text-foreground mb-2">Failed to load scenarios</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Please try refreshing the page.
                </p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Refresh Page
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
                  Sign In
                </a>
              </Button>
            )}
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
              The Coffee Shop Challenge
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Learn to recognize public Wi-Fi security risks through realistic scenarios. 
              Practice making smart decisions when connecting in cafes, hotels, and airports.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">
                Zero Risk Learning
              </h3>
              <p className="text-sm text-muted-foreground">
                Practice in safe, fictional scenarios. No real networks or data involved.
              </p>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">
                Realistic Consequences
              </h3>
              <p className="text-sm text-muted-foreground">
                Experience plausible outcomes like credential theft, not cartoon hacking.
              </p>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">
                Educational Debriefs
              </h3>
              <p className="text-sm text-muted-foreground">
                Every choice explained with technical context and safer alternatives.
              </p>
            </Card>
          </div>

          <div className="text-center space-y-4">
            <Button 
              size="lg" 
              onClick={handleStartChallenge}
              data-testid="button-start-challenge"
            >
              Start the Challenge
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-sm text-muted-foreground">
              Three difficulty levels from beginner to advanced
            </p>
          </div>

          <Card className="p-6 bg-muted/50">
            <h3 className="font-display font-semibold text-foreground mb-3">
              What You'll Learn
            </h3>
            <ul className="grid md:grid-cols-2 gap-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>How to identify legitimate vs. fake Wi-Fi networks</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>When to use VPN protection on public networks</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>Which tasks are safe vs. risky on public Wi-Fi</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>How to verify network authenticity with staff</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>Why installing apps from captive portals is dangerous</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>How attackers use "evil twin" networks</span>
              </li>
            </ul>
          </Card>
        </motion.div>
      </main>

      <footer className="border-t border-border mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>
            Part of the Network Security Literacy Lab. 
            All scenarios are fictional but based on real-world attack patterns.
          </p>
        </div>
      </footer>
    </div>
  );
}

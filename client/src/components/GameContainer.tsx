import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { MapPin, Wifi, ArrowLeft, Shield, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import captivePortalImage from "@assets/ChatGPT_Image_Dec_17,_2025,_04_26_45_PM_1766006848813.png";
import { NetworkCard } from "./NetworkCard";
import { TaskPromptCard } from "./TaskPromptCard";
import { ConsequenceScreen } from "./ConsequenceScreen";
import { CompletionScreen } from "./CompletionScreen";
import { ProgressIndicator } from "./ProgressIndicator";
import { BadgeDisplay } from "./BadgeDisplay";
import { CountdownTimer } from "./CountdownTimer";
import { useAuth } from "@/hooks/use-auth";
import type { GameSession, Scenario, Network } from "@shared/schema";
import {
  getCurrentSceneFromScenario,
  processNetworkSelection,
  processAction,
  completeSession,
  calculateGrade,
} from "@/lib/gameEngine";
import {
  translateActionDescription,
  translateActionLabel,
  translateNetworkDescription,
  translateScenarioLocation,
  translateSceneDescription,
  translateSceneLocation,
  translateSceneTitle,
} from "@/lib/translateContent";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

interface GameContainerProps {
  initialSession: GameSession;
  scenario: Scenario;
  onExit: () => void;
  onRestart: () => void;
}

export function GameContainer({ initialSession, scenario, onExit, onRestart }: GameContainerProps) {
  const { t } = useTranslation();
  const [session, setSession] = useState<GameSession>(initialSession);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sessionSnapshots, setSessionSnapshots] = useState<GameSession[]>([]);
  const { isAuthenticated } = useAuth();
  const progressSavedRef = useRef(false);
  const completionHandledRef = useRef(false);
  const timeoutNotifiedRef = useRef<Record<string, boolean>>({});
  const { toast } = useToast();

  const updateSessionMutation = useMutation({
    mutationFn: async (updates: Partial<GameSession>) => {
      const response = await apiRequest("PATCH", `/api/sessions/${session.id}`, updates);
      return (await response.json()) as GameSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    },
  });

  const saveProgressMutation = useMutation({
    mutationFn: async (completedSession: GameSession) => {
      const grade = calculateGrade(completedSession.score);
      const response = await apiRequest("POST", "/api/progress/complete", {
        sessionId: completedSession.id,
        scenarioId: completedSession.scenarioId,
        difficulty: completedSession.difficulty,
        score: completedSession.score,
        badges: completedSession.badges,
        grade: grade.grade,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
    },
  });

  const currentScene = getCurrentSceneFromScenario(scenario, session.currentSceneId);
  const currentSceneId = currentScene?.id;
  const showWarnings = session.difficulty === "beginner";
  const isAdvanced = session.difficulty === "advanced";

  const sceneTitle = currentScene
    ? currentScene.titleKey
      ? t(currentScene.titleKey)
      : translateSceneTitle(t, scenario.id, currentScene.id, currentScene.title)
    : "";
  const sceneDescription = currentScene
    ? currentScene.descriptionKey
      ? t(currentScene.descriptionKey)
      : translateSceneDescription(t, scenario.id, currentScene.id, currentScene.description)
    : "";
  const sceneLocation = currentScene
    ? translateSceneLocation(
        t,
        scenario.id,
        currentScene.id,
        translateScenarioLocation(t, scenario.id, currentScene.location || scenario.location)
      )
    : "";

  const isDecisionScene = useMemo(() => {
    return (
      currentScene?.type === "network_selection" ||
      currentScene?.type === "task_prompt" ||
      currentScene?.type === "captive_portal"
    );
  }, [currentScene?.type]);

  const syncSession = useCallback(
    (updatedSession: GameSession) => {
      setSession(updatedSession);
      updateSessionMutation.mutate({
        currentSceneId: updatedSession.currentSceneId,
        selectedNetworkId: updatedSession.selectedNetworkId,
        vpnEnabled: updatedSession.vpnEnabled,
        score: updatedSession.score,
        completedSceneIds: updatedSession.completedSceneIds,
        badges: updatedSession.badges,
        completedAt: updatedSession.completedAt,
      });
    },
    [updateSessionMutation]
  );

  useEffect(() => {
    if (currentScene?.type !== "completion") return;
    if (session.completedAt || completionHandledRef.current) return;

    completionHandledRef.current = true;
    const completedSession = completeSession(session);
    syncSession(completedSession);

    if (isAuthenticated && !progressSavedRef.current) {
      progressSavedRef.current = true;
      saveProgressMutation.mutate(completedSession);
    }
  }, [currentScene, session, isAuthenticated, syncSession, saveProgressMutation]);

  useEffect(() => {
    if (!currentSceneId) return;
    timeoutNotifiedRef.current[currentSceneId] = false;
  }, [currentSceneId]);

  const handleTimeUp = useCallback(() => {
    const updatedSession = {
      ...session,
      score: {
        ...session.score,
        riskPoints: session.score.riskPoints + 15,
      },
    };
    syncSession(updatedSession);

    if (currentScene && !timeoutNotifiedRef.current[currentScene.id]) {
      timeoutNotifiedRef.current[currentScene.id] = true;
      toast({
        title: t("timer.penaltyTitle"),
        description: t("timer.penaltyBody", { points: 15 }),
        variant: "destructive",
      });
    }
  }, [session, syncSession, currentScene, toast, t]);

  const handleNetworkSelect = useCallback(
    (network: Network) => {
      if (isTransitioning) return;

      setIsTransitioning(true);
      const currentSceneType = currentScene?.type;

      if (
        currentSceneType === "network_selection" ||
        currentSceneType === "captive_portal" ||
        currentSceneType === "task_prompt"
      ) {
        setSessionSnapshots((prev) => [...prev, JSON.parse(JSON.stringify(session))]);
      }

      const { updatedSession } = processNetworkSelection(session, network, scenario);

      setTimeout(() => {
        syncSession(updatedSession);
        setIsTransitioning(false);
      }, 300);
    },
    [session, scenario, isTransitioning, syncSession, currentScene?.type]
  );

  const handleAction = useCallback(
    (actionId: string) => {
      if (isTransitioning) return;

      setIsTransitioning(true);
      const currentSceneType = currentScene?.type;

      if (
        currentSceneType === "network_selection" ||
        currentSceneType === "captive_portal" ||
        currentSceneType === "task_prompt"
      ) {
        setSessionSnapshots((prev) => [...prev, JSON.parse(JSON.stringify(session))]);
      }

      const { updatedSession } = processAction(session, actionId, scenario);

      setTimeout(() => {
        syncSession(updatedSession);
        setIsTransitioning(false);
      }, 300);
    },
    [session, scenario, isTransitioning, syncSession, currentScene?.type]
  );

  const handleTryAnother = useCallback(() => {
    if (isTransitioning || sessionSnapshots.length === 0) return;

    setIsTransitioning(true);
    const previousSession = sessionSnapshots[sessionSnapshots.length - 1];

    setTimeout(() => {
      setSessionSnapshots((prev) => prev.slice(0, -1));
      syncSession(previousSession);
      setIsTransitioning(false);
    }, 300);
  }, [sessionSnapshots, isTransitioning, syncSession]);

  const handleContinue = useCallback(() => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    const scene = getCurrentSceneFromScenario(scenario, session.currentSceneId);

    if (scene?.nextSceneId) {
      setTimeout(() => {
        const completedSceneIds = session.completedSceneIds.includes(session.currentSceneId)
          ? session.completedSceneIds
          : [...session.completedSceneIds, session.currentSceneId];
        const updatedSession = {
          ...session,
          completedSceneIds,
          currentSceneId: scene.nextSceneId!,
        };
        syncSession(updatedSession);
        setIsTransitioning(false);
      }, 300);
    } else {
      setTimeout(() => {
        const completedSession = completeSession(session);
        syncSession(completedSession);
        setIsTransitioning(false);

        if (isAuthenticated && !progressSavedRef.current) {
          progressSavedRef.current = true;
          saveProgressMutation.mutate(completedSession);
        }
      }, 300);
    }
  }, [session, scenario, isTransitioning, syncSession, isAuthenticated, saveProgressMutation]);

  if (!currentScene) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="app-surface text-center py-12">
          <p className="text-muted-foreground">{t("game.sceneNotFound")}</p>
          <Button onClick={onExit} className="mt-4">
            {t("game.returnToMenu")}
          </Button>
        </div>
      </div>
    );
  }

  if (currentScene.type === "completion" || session.completedAt) {
    return (
      <CompletionScreen
        session={session}
        scenario={scenario}
        onPlayAgain={onRestart}
        onSelectNewScenario={onExit}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="app-surface sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Button variant="ghost" size="sm" onClick={onExit} data-testid="button-exit">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("game.exit")}
            </Button>

            <div className="flex-1 flex justify-center">
              <ProgressIndicator
                scenes={scenario.scenes}
                currentSceneId={session.currentSceneId}
                completedSceneIds={session.completedSceneIds}
              />
            </div>

            <div className="flex items-center gap-3">
              {isAdvanced && isDecisionScene && currentScene && (
                <CountdownTimer
                  totalSeconds={scenario.timerSeconds || 120}
                  isActive={isDecisionScene && !isTransitioning}
                  sceneId={currentScene.id}
                  onTimeUp={handleTimeUp}
                />
              )}
              <BadgeDisplay badges={session.badges} compact />
            </div>
          </div>
        </div>
      </header>

      <main className="app-surface max-w-5xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScene.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
                <MapPin className="w-3.5 h-3.5" />
                <span>{sceneLocation}</span>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                {sceneTitle}
              </h1>
              <p className="text-muted-foreground leading-relaxed" data-testid="scene-description">
                {sceneDescription}
              </p>
            </div>

            {currentScene.type === "arrival" && (
              <Card className="p-6 text-center">
                <Wifi className="w-12 h-12 mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground mb-4">{t("game.readyToStart")}</p>
                <Button onClick={handleContinue} data-testid="button-start-scenario">
                  {t("game.findNetworks")}
                </Button>
              </Card>
            )}

            {(currentScene.type === "briefing" || currentScene.type === "debrief") && (
              <Card className="p-6 space-y-5">
                <div className="space-y-4">
                  {currentScene.sections?.map((section, index) => {
                    const sectionTitle = section.titleKey ? t(section.titleKey) : section.title;
                    const sectionBody = section.bodyKey ? t(section.bodyKey) : section.body;
                    return (
                      <div key={index} className="space-y-1">
                        <h3 className="font-medium text-foreground">{sectionTitle}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {sectionBody}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2 border-t border-border">
                  <Button onClick={handleContinue} data-testid="button-briefing-continue">
                    {t("common.continue")}
                  </Button>
                </div>
              </Card>
            )}

            {(currentScene.type === "network_selection" ||
              currentScene.type === "captive_portal") &&
              currentScene.networks && (
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
                    <Wifi className="w-4 h-4" />
                    <span>{t("network.availableNetworks")}</span>
                  </div>
                  <div className="space-y-3">
                    {currentScene.networks.map((network) => (
                      <NetworkCard
                        key={network.id}
                        network={network}
                        onSelect={handleNetworkSelect}
                        showWarnings={showWarnings}
                        isSelected={session.selectedNetworkId === network.id}
                        description={translateNetworkDescription(
                          t,
                          scenario.id,
                          network.id,
                          network.description ?? ""
                        )}
                      />
                    ))}
                  </div>

                  {currentScene.actions && currentScene.actions.length > 0 && (
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-border/60">
                      {currentScene.actions.map((action) => {
                        const actionLabel = action.labelKey ? t(action.labelKey) : action.label;
                        const actionDescription = action.descriptionKey
                          ? t(action.descriptionKey)
                          : action.description;
                        return (
                          <Button
                            key={action.id}
                            variant="outline"
                            onClick={() => handleAction(action.id)}
                            data-testid={`action-${action.id}`}
                            title={actionDescription}
                          >
                            {action.type === "verify_staff" && <Shield className="w-4 h-4 mr-2" />}
                            {actionLabel}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            {currentScene.type === "captive_portal" &&
              !currentScene.networks &&
              currentScene.actions && (
                <div className="space-y-6">
                  <Card className="p-6 bg-muted/40">
                    <div className="flex items-start gap-3 mb-4">
                      <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-medium text-foreground mb-2">
                          {t("captivePortal.whatIs")}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {t("captivePortal.explanation")}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-md overflow-hidden border border-border shadow-sm max-w-md mx-auto">
                      <img
                        src={captivePortalImage}
                        alt={t("captivePortal.imageAlt")}
                        className="w-full h-auto"
                        data-testid="captive-portal-example-image"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-3 italic">
                      {t("captivePortal.imageCaption")}
                    </p>
                  </Card>

                  <Card className="p-6">
                    <h3 className="font-medium text-foreground mb-4">{t("game.portalOptions")}</h3>
                    <div className="flex flex-wrap gap-3">
                      {currentScene.actions.map((action) => {
                        const actionLabel = action.labelKey
                          ? t(action.labelKey)
                          : translateActionLabel(t, scenario.id, action.id, action.label);
                        const actionDescription = action.descriptionKey
                          ? t(action.descriptionKey)
                          : translateActionDescription(
                              t,
                              scenario.id,
                              action.id,
                              action.description || ""
                            );
                        return (
                          <Button
                            key={action.id}
                            variant="outline"
                            onClick={() => handleAction(action.id)}
                            data-testid={`action-${action.id}`}
                            title={actionDescription}
                          >
                            {actionLabel}
                          </Button>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              )}

            {currentScene.type === "task_prompt" && currentScene.task && currentScene.actions && (
              <TaskPromptCard
                task={currentScene.task}
                actions={currentScene.actions}
                scenarioId={scenario.id}
                onAction={handleAction}
                showHints={showWarnings}
              />
            )}

            {currentScene.type === "consequence" && currentScene.consequence && (
              <ConsequenceScreen
                consequence={currentScene.consequence}
                scenarioId={scenario.id}
                sceneId={currentScene.id}
                onContinue={handleContinue}
                onTryAnother={sessionSnapshots.length > 0 ? handleTryAnother : undefined}
              />
            )}

            {session.vpnEnabled && (
              <div className="fixed bottom-4 right-4 bg-emerald-600/90 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-[0_18px_40px_-26px_rgba(16,185,129,0.7)] border border-emerald-300/40 backdrop-blur pointer-events-none">
                <Shield className="w-4 h-4" />
                {t("game.vpnActive")}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

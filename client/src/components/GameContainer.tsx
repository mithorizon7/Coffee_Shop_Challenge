import { useState, useCallback, useRef, useMemo } from "react";
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
  calculateGrade 
} from "@/lib/gameEngine";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface GameContainerProps {
  initialSession: GameSession;
  scenario: Scenario;
  onExit: () => void;
  onRestart: () => void;
}

export function GameContainer({ 
  initialSession, 
  scenario, 
  onExit, 
  onRestart 
}: GameContainerProps) {
  const { t, i18n } = useTranslation();
  const [session, setSession] = useState<GameSession>(initialSession);
  
  const tryTranslate = useCallback((key: string, fallback: string | undefined) => {
    if (!fallback) return fallback;
    return i18n.exists(key) ? t(key) : fallback;
  }, [t, i18n]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sessionSnapshots, setSessionSnapshots] = useState<GameSession[]>([]);
  const { isAuthenticated } = useAuth();
  const progressSavedRef = useRef(false);

  const updateSessionMutation = useMutation({
    mutationFn: async (updates: Partial<GameSession>) => {
      const response = await apiRequest("PATCH", `/api/sessions/${session.id}`, updates);
      return await response.json() as GameSession;
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
        grade,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
    },
  });

  const currentScene = getCurrentSceneFromScenario(scenario, session.currentSceneId);
  const showWarnings = session.difficulty === "beginner";
  const isAdvanced = session.difficulty === "advanced";
  
  const isDecisionScene = useMemo(() => {
    return currentScene?.type === "network_selection" || 
           currentScene?.type === "task_prompt" || 
           currentScene?.type === "captive_portal";
  }, [currentScene?.type]);

  const handleTimeUp = useCallback(() => {
    const updatedSession = {
      ...session,
      score: {
        ...session.score,
        riskPoints: session.score.riskPoints + 15,
      }
    };
    setSession(updatedSession);
  }, [session]);

  const syncSession = useCallback((updatedSession: GameSession) => {
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
  }, [updateSessionMutation]);

  const handleNetworkSelect = useCallback((network: Network) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    const currentSceneType = currentScene?.type;
    
    if (currentSceneType === "network_selection" || currentSceneType === "captive_portal" || currentSceneType === "task_prompt") {
      setSessionSnapshots(prev => [...prev, JSON.parse(JSON.stringify(session))]);
    }
    
    const { updatedSession } = processNetworkSelection(session, network, scenario);
    
    setTimeout(() => {
      syncSession(updatedSession);
      setIsTransitioning(false);
    }, 300);
  }, [session, scenario, isTransitioning, syncSession, currentScene?.type]);

  const handleAction = useCallback((actionId: string) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    const currentSceneType = currentScene?.type;
    
    if (currentSceneType === "network_selection" || currentSceneType === "captive_portal" || currentSceneType === "task_prompt") {
      setSessionSnapshots(prev => [...prev, JSON.parse(JSON.stringify(session))]);
    }
    
    const { updatedSession } = processAction(session, actionId, scenario);
    
    setTimeout(() => {
      syncSession(updatedSession);
      setIsTransitioning(false);
    }, 300);
  }, [session, scenario, isTransitioning, syncSession, currentScene?.type]);
  
  const handleTryAnother = useCallback(() => {
    if (isTransitioning || sessionSnapshots.length === 0) return;
    
    setIsTransitioning(true);
    const previousSession = sessionSnapshots[sessionSnapshots.length - 1];
    
    setTimeout(() => {
      setSessionSnapshots(prev => prev.slice(0, -1));
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
        const updatedSession = {
          ...session,
          completedSceneIds: [...session.completedSceneIds, session.currentSceneId],
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

  const handleComplete = useCallback(() => {
    const completedSession = completeSession(session);
    syncSession(completedSession);
    
    if (isAuthenticated && !progressSavedRef.current) {
      progressSavedRef.current = true;
      saveProgressMutation.mutate(completedSession);
    }
  }, [session, syncSession, isAuthenticated, saveProgressMutation]);

  if (!currentScene) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('game.sceneNotFound')}</p>
        <Button onClick={onExit} className="mt-4">{t('game.returnToMenu')}</Button>
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={onExit}
              data-testid="button-exit"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('game.exit')}
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

      <main className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScene.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <MapPin className="w-4 h-4" />
                <span>{tryTranslate(`scenarios.${scenario.id}.location`, currentScene.location)}</span>
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                {tryTranslate(`scenarios.${scenario.id}.scenes.${currentScene.id}.title`, currentScene.title)}
              </h1>
              <p className="text-muted-foreground leading-relaxed" data-testid="scene-description">
                {tryTranslate(`scenarios.${scenario.id}.scenes.${currentScene.id}.description`, currentScene.description)}
              </p>
            </div>

            {currentScene.type === "arrival" && (
              <Card className="p-6 text-center">
                <Wifi className="w-12 h-12 mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground mb-4">
                  {t('game.readyToStart')}
                </p>
                <Button onClick={handleContinue} data-testid="button-start-scenario">
                  {t('game.findNetworks')}
                </Button>
              </Card>
            )}

            {(currentScene.type === "network_selection" || currentScene.type === "captive_portal") && currentScene.networks && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wifi className="w-4 h-4" />
                  <span>{t('network.availableNetworks')}</span>
                </div>
                <div className="space-y-3">
                  {currentScene.networks.map((network) => (
                    <NetworkCard
                      key={network.id}
                      network={network}
                      onSelect={handleNetworkSelect}
                      showWarnings={showWarnings}
                      isSelected={session.selectedNetworkId === network.id}
                      scenarioId={scenario.id}
                    />
                  ))}
                </div>
                
                {currentScene.actions && currentScene.actions.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                    {currentScene.actions.map((action) => (
                      <Button
                        key={action.id}
                        variant="outline"
                        onClick={() => handleAction(action.id)}
                        data-testid={`action-${action.id}`}
                      >
                        {action.type === "verify_staff" && <Shield className="w-4 h-4 mr-2" />}
                        {tryTranslate(`scenarios.${scenario.id}.actions.${action.id}.label`, action.label)}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentScene.type === "captive_portal" && !currentScene.networks && currentScene.actions && (
              <div className="space-y-6">
                <Card className="p-6 bg-muted/30">
                  <div className="flex items-start gap-3 mb-4">
                    <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-foreground mb-2">{t('captivePortal.whatIs')}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {t('captivePortal.explanation')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-md overflow-hidden border border-border shadow-sm max-w-md mx-auto">
                    <img 
                      src={captivePortalImage} 
                      alt={t('captivePortal.imageAlt')} 
                      className="w-full h-auto"
                      data-testid="captive-portal-example-image"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-3 italic">
                    {t('captivePortal.imageCaption')}
                  </p>
                </Card>

                <Card className="p-6">
                  <h3 className="font-medium text-foreground mb-4">{t('game.portalOptions')}</h3>
                  <div className="flex flex-wrap gap-3">
                    {currentScene.actions.map((action) => (
                      <Button
                        key={action.id}
                        variant="outline"
                        onClick={() => handleAction(action.id)}
                        data-testid={`action-${action.id}`}
                      >
                        {tryTranslate(`scenarios.${scenario.id}.actions.${action.id}.label`, action.label)}
                      </Button>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {currentScene.type === "task_prompt" && currentScene.task && currentScene.actions && (
              <TaskPromptCard
                task={currentScene.task}
                actions={currentScene.actions}
                onAction={handleAction}
                showHints={showWarnings}
                scenarioId={scenario.id}
              />
            )}

            {currentScene.type === "consequence" && currentScene.consequence && (
              <ConsequenceScreen
                consequence={currentScene.consequence}
                onContinue={handleContinue}
                onTryAnother={sessionSnapshots.length > 0 ? handleTryAnother : undefined}
                scenarioId={scenario.id}
              />
            )}

            {session.vpnEnabled && (
              <div className="fixed bottom-4 right-4 bg-green-600 text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg pointer-events-none">
                <Shield className="w-4 h-4" />
                {t('game.vpnActive')}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

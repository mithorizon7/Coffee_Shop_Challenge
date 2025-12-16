import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { MapPin, Wifi, ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NetworkCard } from "./NetworkCard";
import { TaskPromptCard } from "./TaskPromptCard";
import { ConsequenceScreen } from "./ConsequenceScreen";
import { CompletionScreen } from "./CompletionScreen";
import { ScoreTracker } from "./ScoreTracker";
import { ProgressIndicator } from "./ProgressIndicator";
import { BadgeDisplay } from "./BadgeDisplay";
import type { GameSession, Scenario, Network } from "@shared/schema";
import { 
  getCurrentSceneFromScenario, 
  processNetworkSelection, 
  processAction, 
  completeSession 
} from "@/lib/gameEngine";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
  const [session, setSession] = useState<GameSession>(initialSession);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const updateSessionMutation = useMutation({
    mutationFn: async (updates: Partial<GameSession>) => {
      const response = await apiRequest("PATCH", `/api/sessions/${session.id}`, updates);
      return await response.json() as GameSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    },
  });

  const currentScene = getCurrentSceneFromScenario(scenario, session.currentSceneId);
  const showWarnings = session.difficulty === "beginner";

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
    const { updatedSession } = processNetworkSelection(session, network, scenario);
    
    setTimeout(() => {
      syncSession(updatedSession);
      setIsTransitioning(false);
    }, 300);
  }, [session, scenario, isTransitioning, syncSession]);

  const handleAction = useCallback((actionId: string) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    const { updatedSession } = processAction(session, actionId, scenario);
    
    setTimeout(() => {
      syncSession(updatedSession);
      setIsTransitioning(false);
    }, 300);
  }, [session, scenario, isTransitioning, syncSession]);

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
      }, 300);
    }
  }, [session, scenario, isTransitioning, syncSession]);

  const handleComplete = useCallback(() => {
    const completedSession = completeSession(session);
    syncSession(completedSession);
  }, [session, syncSession]);

  if (!currentScene) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Scene not found</p>
        <Button onClick={onExit} className="mt-4">Return to Menu</Button>
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
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onExit}
              data-testid="button-exit"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Exit
            </Button>
            
            <div className="flex-1 flex justify-center">
              <ProgressIndicator
                scenes={scenario.scenes}
                currentSceneId={session.currentSceneId}
                completedSceneIds={session.completedSceneIds}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <BadgeDisplay badges={session.badges} compact />
              <ScoreTracker score={session.score} compact />
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
                <span>{currentScene.location}</span>
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                {currentScene.title}
              </h1>
              <p className="text-muted-foreground leading-relaxed" data-testid="scene-description">
                {currentScene.description}
              </p>
            </div>

            {currentScene.type === "arrival" && (
              <Card className="p-6 text-center">
                <Wifi className="w-12 h-12 mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground mb-4">
                  Ready to start the scenario?
                </p>
                <Button onClick={handleContinue} data-testid="button-start-scenario">
                  Find Networks
                </Button>
              </Card>
            )}

            {(currentScene.type === "network_selection" || currentScene.type === "captive_portal") && currentScene.networks && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wifi className="w-4 h-4" />
                  <span>Available Networks</span>
                </div>
                <div className="space-y-3">
                  {currentScene.networks.map((network) => (
                    <NetworkCard
                      key={network.id}
                      network={network}
                      onSelect={handleNetworkSelect}
                      showWarnings={showWarnings}
                      isSelected={session.selectedNetworkId === network.id}
                    />
                  ))}
                </div>
                
                {currentScene.actions && currentScene.actions.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                    {currentScene.actions.map((action) => (
                      <Button
                        key={action.id}
                        variant={action.isPrimary ? "default" : "outline"}
                        onClick={() => handleAction(action.id)}
                        data-testid={`action-${action.id}`}
                      >
                        {action.type === "verify_staff" && <Shield className="w-4 h-4 mr-2" />}
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentScene.type === "captive_portal" && !currentScene.networks && currentScene.actions && (
              <Card className="p-6">
                <h3 className="font-medium text-foreground mb-4">Portal Options</h3>
                <div className="flex flex-wrap gap-3">
                  {currentScene.actions.map((action) => (
                    <Button
                      key={action.id}
                      variant={action.isDanger ? "destructive" : action.isPrimary ? "default" : "outline"}
                      onClick={() => handleAction(action.id)}
                      data-testid={`action-${action.id}`}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </Card>
            )}

            {currentScene.type === "task_prompt" && currentScene.task && currentScene.actions && (
              <TaskPromptCard
                task={currentScene.task}
                actions={currentScene.actions}
                onAction={handleAction}
                showHints={showWarnings}
              />
            )}

            {currentScene.type === "consequence" && currentScene.consequence && (
              <ConsequenceScreen
                consequence={currentScene.consequence}
                onContinue={handleContinue}
              />
            )}

            {session.vpnEnabled && (
              <div className="fixed bottom-4 right-4 bg-green-600 text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg">
                <Shield className="w-4 h-4" />
                VPN Active
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

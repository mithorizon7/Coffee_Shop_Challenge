import type { 
  GameSession, 
  Score, 
  Scenario, 
  Scene, 
  Network, 
  Badge,
  DifficultyLevel 
} from "@shared/schema";
import { scenarios, availableBadges } from "@shared/scenarios";

export function createGameSession(
  scenarioId: string, 
  difficulty: DifficultyLevel
): GameSession {
  const scenario = scenarios.find(s => s.id === scenarioId);
  if (!scenario) {
    throw new Error(`Scenario not found: ${scenarioId}`);
  }

  return {
    id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    scenarioId,
    currentSceneId: scenario.startSceneId,
    difficulty,
    score: {
      safetyPoints: 0,
      riskPoints: 0,
      decisionsCount: 0,
      correctDecisions: 0,
    },
    selectedNetworkId: undefined,
    vpnEnabled: false,
    completedSceneIds: [],
    badges: [],
    startedAt: new Date().toISOString(),
  };
}

export function getCurrentScene(session: GameSession): Scene | undefined {
  const scenario = scenarios.find(s => s.id === session.scenarioId);
  if (!scenario) return undefined;
  return scenario.scenes.find(s => s.id === session.currentSceneId);
}

export function getCurrentSceneFromScenario(scenario: Scenario, sceneId: string): Scene | undefined {
  return scenario.scenes.find(s => s.id === sceneId);
}

export function getScenario(scenarioId: string): Scenario | undefined {
  return scenarios.find(s => s.id === scenarioId);
}

export function processNetworkSelection(
  session: GameSession,
  network: Network,
  scenario: Scenario
): { updatedSession: GameSession; nextSceneId: string } {
  const currentScene = getCurrentSceneFromScenario(scenario, session.currentSceneId);
  
  if (!currentScene) {
    throw new Error("Invalid game state");
  }

  let safetyChange = 0;
  let riskChange = 0;
  let nextSceneId = "";

  if (network.isTrap) {
    riskChange = 25;
    const trapScene = scenario.scenes.find(s => s.id.includes("trap") || s.id.includes("fake"));
    nextSceneId = trapScene?.id || session.currentSceneId;
  } else if (network.riskLevel === "safe" && network.verifiedByStaff) {
    safetyChange = 15;
    const safeScene = currentScene.choices?.find(c => 
      c.actionId.includes("verified") || c.actionId.includes("official")
    );
    nextSceneId = safeScene?.nextSceneId || session.currentSceneId;
  } else if (network.riskLevel === "safe") {
    safetyChange = 10;
    const choice = currentScene.choices?.find(c => c.actionId.includes("official"));
    nextSceneId = choice?.nextSceneId || session.currentSceneId;
  } else {
    riskChange = 10;
    const choice = currentScene.choices?.find(c => 
      c.actionId.includes(network.id.split("_").pop() || "")
    );
    nextSceneId = choice?.nextSceneId || session.currentSceneId;
  }

  return {
    updatedSession: {
      ...session,
      selectedNetworkId: network.id,
      score: {
        ...session.score,
        safetyPoints: session.score.safetyPoints + safetyChange,
        riskPoints: session.score.riskPoints + riskChange,
        decisionsCount: session.score.decisionsCount + 1,
        correctDecisions: session.score.correctDecisions + (safetyChange > 0 ? 1 : 0),
      },
      completedSceneIds: [...session.completedSceneIds, session.currentSceneId],
      currentSceneId: nextSceneId,
    },
    nextSceneId,
  };
}

export function processAction(
  session: GameSession,
  actionId: string,
  scenario: Scenario
): { updatedSession: GameSession; nextSceneId: string } {
  const currentScene = getCurrentSceneFromScenario(scenario, session.currentSceneId);
  
  if (!currentScene) {
    throw new Error("Invalid game state");
  }

  const choice = currentScene.choices?.find(c => c.actionId === actionId);
  const nextSceneId = choice?.nextSceneId || session.currentSceneId;
  const nextScene = scenario.scenes.find(s => s.id === nextSceneId);

  let safetyChange = 0;
  let riskChange = 0;
  let vpnEnabled = session.vpnEnabled;
  let newBadges = [...session.badges];

  if (actionId.includes("vpn")) {
    vpnEnabled = true;
    safetyChange = 5;
    
    if (!newBadges.find(b => b.id === "vpn_master")) {
      const vpnBadge = availableBadges.find(b => b.id === "vpn_master");
      if (vpnBadge) {
        newBadges.push({ ...vpnBadge, earnedAt: new Date().toISOString() });
      }
    }
  }

  if (actionId.includes("verify") || actionId.includes("staff")) {
    safetyChange = 10;
    if (!newBadges.find(b => b.id === "network_detective")) {
      const detectiveBadge = availableBadges.find(b => b.id === "network_detective");
      if (detectiveBadge) {
        newBadges.push({ ...detectiveBadge, earnedAt: new Date().toISOString() });
      }
    }
  }

  if (actionId.includes("postpone")) {
    safetyChange = 8;
    if (!newBadges.find(b => b.id === "patient_professional")) {
      const patientBadge = availableBadges.find(b => b.id === "patient_professional");
      if (patientBadge) {
        newBadges.push({ ...patientBadge, earnedAt: new Date().toISOString() });
      }
    }
  }

  if (actionId.includes("install") || actionId.includes("profile")) {
    riskChange = 30;
  }

  if (actionId.includes("proceed") && !vpnEnabled && currentScene.task?.sensitivityLevel === "critical") {
    riskChange = 20;
  }

  if (nextScene?.consequence) {
    safetyChange += nextScene.consequence.safetyPointsChange;
    riskChange += nextScene.consequence.riskPointsChange;
  }

  return {
    updatedSession: {
      ...session,
      vpnEnabled,
      score: {
        ...session.score,
        safetyPoints: session.score.safetyPoints + safetyChange,
        riskPoints: session.score.riskPoints + riskChange,
        decisionsCount: session.score.decisionsCount + 1,
        correctDecisions: session.score.correctDecisions + (safetyChange > riskChange ? 1 : 0),
      },
      completedSceneIds: [...session.completedSceneIds, session.currentSceneId],
      currentSceneId: nextSceneId,
      badges: newBadges,
    },
    nextSceneId,
  };
}

export function completeSession(session: GameSession): GameSession {
  let newBadges = [...session.badges];

  if (session.score.riskPoints === 0) {
    const perfectBadge = availableBadges.find(b => b.id === "perfect_score");
    if (perfectBadge && !newBadges.find(b => b.id === "perfect_score")) {
      newBadges.push({ ...perfectBadge, earnedAt: new Date().toISOString() });
    }
  }

  if (session.score.riskPoints < 20) {
    const awareBadge = availableBadges.find(b => b.id === "security_aware");
    if (awareBadge && !newBadges.find(b => b.id === "security_aware")) {
      newBadges.push({ ...awareBadge, earnedAt: new Date().toISOString() });
    }
  }

  return {
    ...session,
    completedAt: new Date().toISOString(),
    badges: newBadges,
  };
}

export function calculateGrade(score: Score): { 
  grade: string; 
  labelKey: string; 
  color: string;
} {
  const ratio = score.safetyPoints / Math.max(1, score.safetyPoints + score.riskPoints);
  
  if (ratio >= 0.9) {
    return { grade: "A", labelKey: "grades.A", color: "text-green-600 dark:text-green-400" };
  } else if (ratio >= 0.75) {
    return { grade: "B", labelKey: "grades.B", color: "text-blue-600 dark:text-blue-400" };
  } else if (ratio >= 0.6) {
    return { grade: "C", labelKey: "grades.C", color: "text-yellow-600 dark:text-yellow-400" };
  } else if (ratio >= 0.4) {
    return { grade: "D", labelKey: "grades.D", color: "text-orange-600 dark:text-orange-400" };
  } else {
    return { grade: "F", labelKey: "grades.F", color: "text-red-600 dark:text-red-400" };
  }
}

export function getSecurityTipKeys(session: GameSession): string[] {
  const tipKeys: string[] = [];
  
  if (!session.vpnEnabled) {
    tipKeys.push("tips.useVpn");
  }
  
  if (session.score.riskPoints > 0) {
    tipKeys.push("tips.verifyNetworks");
    tipKeys.push("tips.neverInstall");
    tipKeys.push("tips.postponeSensitive");
  }
  
  if (session.score.riskPoints > 30) {
    tipKeys.push("tips.useMobileData");
    tipKeys.push("tips.cautionHighTraffic");
  }

  if (tipKeys.length === 0) {
    tipKeys.push("tips.greatJob");
    tipKeys.push("tips.sharePractices");
  }
  
  return tipKeys;
}

export function getDecisionProcessKeys(): { step: number; titleKey: string; descriptionKey: string }[] {
  return [
    {
      step: 1,
      titleKey: "decisionProcess.step1Title",
      descriptionKey: "decisionProcess.step1Desc"
    },
    {
      step: 2,
      titleKey: "decisionProcess.step2Title",
      descriptionKey: "decisionProcess.step2Desc"
    },
    {
      step: 3,
      titleKey: "decisionProcess.step3Title",
      descriptionKey: "decisionProcess.step3Desc"
    },
    {
      step: 4,
      titleKey: "decisionProcess.step4Title",
      descriptionKey: "decisionProcess.step4Desc"
    },
    {
      step: 5,
      titleKey: "decisionProcess.step5Title",
      descriptionKey: "decisionProcess.step5Desc"
    }
  ];
}

export function getRogueHotspotKeys(): { titleKey: string; descriptionKey: string; howToSpotKeys: string[] } {
  return {
    titleKey: "rogueHotspot.title",
    descriptionKey: "rogueHotspot.description",
    howToSpotKeys: [
      "rogueHotspot.spot1",
      "rogueHotspot.spot2",
      "rogueHotspot.spot3",
      "rogueHotspot.spot4"
    ]
  };
}

import type { 
  GameSession, 
  Score, 
  Scenario, 
  Scene, 
  Network, 
  Badge,
  DifficultyLevel 
} from "@shared/schema";
import { scenarios, getAvailableBadges } from "@shared/scenarios";

export function createGameSession(
  scenarioId: string, 
  difficulty: DifficultyLevel
): GameSession {
  const scenario = scenarios.find(s => s.id === scenarioId);
  if (!scenario) {
    throw new Error(`Scenario not found: ${scenarioId}`);
  }

  const uuid = (() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }

    if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
      return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
    }

    const randomHex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
    return `${randomHex()}${randomHex()}-${randomHex()}-${randomHex()}-${randomHex()}-${randomHex()}${randomHex()}${randomHex()}`;
  })();

  return {
    id: `session_${uuid}`,
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

  const alreadyCompleted = session.completedSceneIds.includes(session.currentSceneId);
  let safetyChange = 0;
  let riskChange = 0;
  const connectActionId = `connect_${network.id}`;
  const expectedActionId = network.actionId ?? connectActionId;
  const fallbackActionId = network.actionId ? connectActionId : undefined;
  const choice =
    currentScene.choices?.find(c => c.actionId === expectedActionId) ??
    (fallbackActionId ? currentScene.choices?.find(c => c.actionId === fallbackActionId) : undefined);
  const nextSceneId = choice?.nextSceneId || session.currentSceneId;

  if (network.isTrap) {
    riskChange = 25;
  } else if (network.riskLevel === "safe" && network.verifiedByStaff) {
    safetyChange = 15;
  } else if (network.riskLevel === "safe") {
    safetyChange = 10;
  } else {
    riskChange = 10;
  }

  const completedSceneIds = alreadyCompleted
    ? session.completedSceneIds
    : [...session.completedSceneIds, session.currentSceneId];

  const score = alreadyCompleted
    ? session.score
    : {
        ...session.score,
        safetyPoints: session.score.safetyPoints + safetyChange,
        riskPoints: session.score.riskPoints + riskChange,
        decisionsCount: session.score.decisionsCount + 1,
        correctDecisions: session.score.correctDecisions + (safetyChange > 0 ? 1 : 0),
      };

  return {
    updatedSession: {
      ...session,
      selectedNetworkId: network.id,
      score,
      completedSceneIds,
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

  const alreadyCompleted = session.completedSceneIds.includes(session.currentSceneId);
  const choice = currentScene.choices?.find(c => c.actionId === actionId);
  const action = currentScene.actions?.find(a => a.id === actionId);
  const nextSceneId = choice?.nextSceneId || session.currentSceneId;
  const nextScene = scenario.scenes.find(s => s.id === nextSceneId);

  let safetyChange = 0;
  let riskChange = 0;
  let vpnEnabled = session.vpnEnabled;
  let newBadges = [...session.badges];

  // Get current badges from getter to ensure we have latest loaded from JSON
  const currentBadges = getAvailableBadges();

  if (action?.type === "use_vpn") {
    vpnEnabled = true;
    safetyChange = 5;
    
    if (!newBadges.find(b => b.id === "vpn_master")) {
      const vpnBadge = currentBadges.find(b => b.id === "vpn_master");
      if (vpnBadge) {
        newBadges.push({ ...vpnBadge, earnedAt: new Date().toISOString() });
      }
    }
  }

  if (action?.type === "verify_staff") {
    safetyChange = 10;
    if (!newBadges.find(b => b.id === "network_detective")) {
      const detectiveBadge = currentBadges.find(b => b.id === "network_detective");
      if (detectiveBadge) {
        newBadges.push({ ...detectiveBadge, earnedAt: new Date().toISOString() });
      }
    }
  }

  if (action?.type === "postpone") {
    safetyChange = 8;
    if (!newBadges.find(b => b.id === "patient_professional")) {
      const patientBadge = currentBadges.find(b => b.id === "patient_professional");
      if (patientBadge) {
        newBadges.push({ ...patientBadge, earnedAt: new Date().toISOString() });
      }
    }
  }

  if (action?.type === "install_profile") {
    riskChange = 30;
  }

  const selectedNetwork = session.selectedNetworkId
    ? scenario.scenes.flatMap(s => s.networks ?? []).find(n => n.id === session.selectedNetworkId)
    : undefined;

  const isCriticalProceed =
    action?.type === "proceed" && currentScene.task?.sensitivityLevel === "critical";
  const hasStrongProtection = vpnEnabled || selectedNetwork?.isMobileData;

  if (nextScene?.consequence) {
    safetyChange += nextScene.consequence.safetyPointsChange;
    riskChange += nextScene.consequence.riskPointsChange;
  } else if (isCriticalProceed && !hasStrongProtection) {
    // Fall back to a modest penalty if there's no consequence to score this decision.
    riskChange = Math.max(riskChange, 10);
  }

  const isCorrectDecision =
    safetyChange > riskChange && (!isCriticalProceed || hasStrongProtection);

  const completedSceneIds = alreadyCompleted
    ? session.completedSceneIds
    : [...session.completedSceneIds, session.currentSceneId];

  const score = alreadyCompleted
    ? session.score
    : {
        ...session.score,
        safetyPoints: session.score.safetyPoints + safetyChange,
        riskPoints: session.score.riskPoints + riskChange,
        decisionsCount: session.score.decisionsCount + 1,
        correctDecisions: session.score.correctDecisions + (isCorrectDecision ? 1 : 0),
      };

  return {
    updatedSession: {
      ...session,
      vpnEnabled,
      score,
      completedSceneIds,
      currentSceneId: nextSceneId,
      badges: newBadges,
    },
    nextSceneId,
  };
}

export function completeSession(session: GameSession): GameSession {
  let newBadges = [...session.badges];
  const currentBadges = getAvailableBadges();

  if (session.score.riskPoints === 0) {
    const perfectBadge = currentBadges.find(b => b.id === "perfect_score");
    if (perfectBadge && !newBadges.find(b => b.id === "perfect_score")) {
      newBadges.push({ ...perfectBadge, earnedAt: new Date().toISOString() });
    }
  }

  if (session.score.riskPoints < 20) {
    const awareBadge = currentBadges.find(b => b.id === "security_aware");
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

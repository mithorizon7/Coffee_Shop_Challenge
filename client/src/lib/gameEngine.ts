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
  label: string; 
  color: string;
} {
  const ratio = score.safetyPoints / Math.max(1, score.safetyPoints + score.riskPoints);
  
  if (ratio >= 0.9) {
    return { grade: "A", label: "Excellent", color: "text-green-600 dark:text-green-400" };
  } else if (ratio >= 0.75) {
    return { grade: "B", label: "Good", color: "text-blue-600 dark:text-blue-400" };
  } else if (ratio >= 0.6) {
    return { grade: "C", label: "Average", color: "text-yellow-600 dark:text-yellow-400" };
  } else if (ratio >= 0.4) {
    return { grade: "D", label: "Needs Improvement", color: "text-orange-600 dark:text-orange-400" };
  } else {
    return { grade: "F", label: "Study More", color: "text-red-600 dark:text-red-400" };
  }
}

export function getSecurityTips(session: GameSession): string[] {
  const tips: string[] = [];
  
  if (!session.vpnEnabled) {
    tips.push("Use a VPN on all public networks, especially for sensitive tasks");
  }
  
  if (session.score.riskPoints > 0) {
    tips.push("Always verify network names with staff before connecting");
    tips.push("Never install apps or profiles from captive portals");
    tips.push("Postpone sensitive tasks like banking until you're on a secure network");
  }
  
  if (session.score.riskPoints > 30) {
    tips.push("Consider using mobile data instead of public Wi-Fi for critical tasks");
    tips.push("Be extra cautious in high-traffic areas like airports and hotels");
  }

  if (tips.length === 0) {
    tips.push("Great job! Keep using VPN and verifying networks");
    tips.push("Share these security practices with colleagues and family");
  }
  
  return tips;
}

export function getDecisionProcess(): { step: number; title: string; description: string }[] {
  return [
    {
      step: 1,
      title: "Verify the Network",
      description: "Ask staff for the exact network name. Don't trust similar-looking names."
    },
    {
      step: 2,
      title: "Check the Security",
      description: "Prefer networks with a lock icon (password-protected). Open networks are riskier."
    },
    {
      step: 3,
      title: "Enable Your VPN",
      description: "Before doing anything sensitive, turn on your VPN to encrypt all traffic."
    },
    {
      step: 4,
      title: "Assess the Task",
      description: "Banking or passwords? Wait for a secure network. Just browsing? Proceed with caution."
    },
    {
      step: 5,
      title: "Never Install",
      description: "Decline any prompts to install apps, profiles, or certificates from portals."
    }
  ];
}

export function getRogueHotspotExplanation(): { title: string; description: string; howToSpot: string[] } {
  return {
    title: "What is a Rogue Hotspot?",
    description: "A rogue hotspot (also called an 'evil twin') is a fake Wi-Fi network set up by an attacker to look like a legitimate one. When you connect, they can see your traffic, steal passwords, or redirect you to fake websites.",
    howToSpot: [
      "Names that look almost right but have small differences (hyphens, underscores, extra words)",
      "Networks claiming to be 'FREE' versions of business networks",
      "Open networks with unusually strong signals",
      "Multiple networks with very similar names"
    ]
  };
}

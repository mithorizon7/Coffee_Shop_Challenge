import {
  Trophy,
  ArrowRight,
  RotateCcw,
  Lightbulb,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeDisplay } from "./BadgeDisplay";
import { ScoreTracker } from "./ScoreTracker";
import type { GameSession, Scenario } from "@shared/schema";
import {
  calculateGrade,
  getSecurityTipKeys,
  getDecisionProcessKeys,
  getRogueHotspotKeys,
} from "@/lib/gameEngine";
import { translateScenarioTitle } from "@/lib/translateContent";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface CompletionScreenProps {
  session: GameSession;
  scenario: Scenario;
  onPlayAgain: () => void;
  onSelectNewScenario: () => void;
}

export function CompletionScreen({
  session,
  scenario,
  onPlayAgain,
  onSelectNewScenario,
}: CompletionScreenProps) {
  const { t } = useTranslation();
  const grade = calculateGrade(session.score);
  const tipKeys = getSecurityTipKeys(session);
  const decisionProcessKeys = getDecisionProcessKeys();
  const rogueKeys = getRogueHotspotKeys();
  const scenarioTitle = translateScenarioTitle(t, scenario.id, scenario.title);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="app-shell py-10 px-4">
      <div className="app-surface space-y-6 max-w-3xl mx-auto">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
            className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4 shadow-[0_18px_40px_-26px_hsl(var(--primary)/0.8)]"
          >
            <Trophy className="w-10 h-10 text-primary" />
          </motion.div>

          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            {t("completion.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("completion.finishedScenario", { title: scenarioTitle })}
          </p>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.4 }}
                className={cn("text-6xl font-display font-bold", grade.color)}
                data-testid="final-grade"
              >
                {grade.grade}
              </motion.div>
              <p className={cn("text-sm font-medium", grade.color)}>{t(grade.labelKey)}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <ScoreTracker score={session.score} />

            {session.badges.length > 0 && <BadgeDisplay badges={session.badges} />}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            {t("completion.whatToRemember")}
          </h3>
          <ul className="space-y-2">
            {tipKeys.map((tipKey, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <TrendingUp className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>{t(tipKey)}</span>
              </motion.li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            {t("decisionProcess.title")}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">{t("decisionProcess.subtitle")}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {decisionProcessKeys.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="p-3 rounded-2xl bg-muted/40"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                  <span className="text-sm font-medium text-foreground">{t(item.titleKey)}</span>
                </div>
                <p className="text-xs text-muted-foreground pl-7">{t(item.descriptionKey)}</p>
              </motion.div>
            ))}
          </div>
        </Card>

        <Card className="p-6 border-amber-200/70 dark:border-amber-800/60 bg-amber-100/50 dark:bg-amber-950/30">
          <h3 className="font-medium text-foreground flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {t(rogueKeys.titleKey)}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">{t(rogueKeys.descriptionKey)}</p>
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">{t("rogueHotspot.howToSpot")}</p>
            <ul className="space-y-1">
              {rogueKeys.howToSpotKeys.map((spotKey, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-amber-500 mt-0.5">-</span>
                  <span>{t(spotKey)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={onPlayAgain} data-testid="button-play-again">
            <RotateCcw className="w-4 h-4 mr-2" />
            {t("scenario.playAgain")}
          </Button>
          <Button onClick={onSelectNewScenario} data-testid="button-new-scenario">
            {t("completion.tryAnotherScenario")}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

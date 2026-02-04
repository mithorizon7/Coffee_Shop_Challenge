import { Shield, AlertTriangle, Target, CheckCircle, HelpCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Score } from "@shared/schema";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface ScoreTrackerProps {
  score: Score;
  compact?: boolean;
}

export function ScoreTracker({ score, compact = false }: ScoreTrackerProps) {
  const { t } = useTranslation();
  const totalPoints = score.safetyPoints + score.riskPoints;
  const safetyPercentage = totalPoints > 0 ? (score.safetyPoints / totalPoints) * 100 : 50;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-4 cursor-help" data-testid="score-tracker-compact">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <motion.span
                key={score.safetyPoints}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
                data-testid="score-safety-compact"
              >
                {score.safetyPoints}
              </motion.span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <motion.span
                key={score.riskPoints}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-sm font-medium text-rose-600 dark:text-rose-400"
                data-testid="score-risk-compact"
              >
                {score.riskPoints}
              </motion.span>
            </div>
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs p-3">
          <div className="space-y-2 text-sm">
            <p className="font-medium">{t("scoring.howItWorks")}</p>
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <p>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {t("game.safetyPoints")}:
                </span>{" "}
                {t("scoring.safetyExplain")}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <p>
                <span className="font-medium text-rose-600 dark:text-rose-400">
                  {t("game.riskPoints")}:
                </span>{" "}
                {t("scoring.riskExplain")}
              </p>
            </div>
            <p className="text-muted-foreground text-xs pt-1 border-t border-border">
              {t("scoring.lowerRiskBetter")}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="space-y-4 p-5 rounded-2xl bg-card/70 border border-card-border/70 shadow-[0_18px_40px_-32px_hsl(var(--foreground)/0.45)]">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground flex items-center gap-2">
          <Target className="w-4 h-4" />
          {t("game.score")}
        </h3>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <CheckCircle className="w-3.5 h-3.5" />
          {t("game.correctFormat", {
            correct: score.correctDecisions,
            total: score.decisionsCount,
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Shield className="w-4 h-4" />
              {t("game.safetyPoints")}
            </span>
            <motion.span
              key={score.safetyPoints}
              initial={{ scale: 1.3, color: "rgb(5 150 105)" }}
              animate={{ scale: 1 }}
              className="font-semibold"
              data-testid="score-safety"
            >
              {score.safetyPoints}
            </motion.span>
          </div>
          <Progress value={safetyPercentage} className="h-2 bg-muted [&>div]:bg-emerald-500" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              {t("game.riskPoints")}
            </span>
            <motion.span
              key={score.riskPoints}
              initial={{ scale: 1.3, color: "rgb(225 29 72)" }}
              animate={{ scale: 1 }}
              className="font-semibold"
              data-testid="score-risk"
            >
              {score.riskPoints}
            </motion.span>
          </div>
          <Progress value={100 - safetyPercentage} className="h-2 bg-muted [&>div]:bg-rose-500" />
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("game.decisionsCount")}</span>
          <span className="font-medium">{score.decisionsCount}</span>
        </div>
      </div>
    </div>
  );
}

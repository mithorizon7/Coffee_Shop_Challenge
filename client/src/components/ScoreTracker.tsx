import { Shield, AlertTriangle, Target, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Score } from "@shared/schema";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ScoreTrackerProps {
  score: Score;
  compact?: boolean;
}

export function ScoreTracker({ score, compact = false }: ScoreTrackerProps) {
  const totalPoints = score.safetyPoints + score.riskPoints;
  const safetyPercentage = totalPoints > 0 ? (score.safetyPoints / totalPoints) * 100 : 50;

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
          <motion.span 
            key={score.safetyPoints}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-sm font-medium text-green-600 dark:text-green-400"
            data-testid="score-safety-compact"
          >
            {score.safetyPoints}
          </motion.span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <motion.span 
            key={score.riskPoints}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-sm font-medium text-red-600 dark:text-red-400"
            data-testid="score-risk-compact"
          >
            {score.riskPoints}
          </motion.span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 rounded-lg bg-card border border-card-border">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground flex items-center gap-2">
          <Target className="w-4 h-4" />
          Score
        </h3>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <CheckCircle className="w-3.5 h-3.5" />
          {score.correctDecisions}/{score.decisionsCount} correct
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <Shield className="w-4 h-4" />
              Safety Points
            </span>
            <motion.span 
              key={score.safetyPoints}
              initial={{ scale: 1.3, color: "rgb(22 163 74)" }}
              animate={{ scale: 1 }}
              className="font-semibold"
              data-testid="score-safety"
            >
              {score.safetyPoints}
            </motion.span>
          </div>
          <Progress 
            value={safetyPercentage} 
            className="h-2 bg-muted [&>div]:bg-green-500"
          />
        </div>
        
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
              Risk Points
            </span>
            <motion.span 
              key={score.riskPoints}
              initial={{ scale: 1.3, color: "rgb(220 38 38)" }}
              animate={{ scale: 1 }}
              className="font-semibold"
              data-testid="score-risk"
            >
              {score.riskPoints}
            </motion.span>
          </div>
          <Progress 
            value={100 - safetyPercentage} 
            className="h-2 bg-muted [&>div]:bg-red-500"
          />
        </div>
      </div>
      
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Decisions Made</span>
          <span className="font-medium">{score.decisionsCount}</span>
        </div>
      </div>
    </div>
  );
}

import { Trophy, ArrowRight, RotateCcw, Home, Lightbulb, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeDisplay } from "./BadgeDisplay";
import { ScoreTracker } from "./ScoreTracker";
import type { GameSession, Scenario } from "@shared/schema";
import { calculateGrade, getSecurityTips } from "@/lib/gameEngine";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
  onSelectNewScenario 
}: CompletionScreenProps) {
  const grade = calculateGrade(session.score);
  const tips = getSecurityTips(session);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 max-w-3xl mx-auto"
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
          className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
        >
          <Trophy className="w-10 h-10 text-primary" />
        </motion.div>
        
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Scenario Complete!
        </h1>
        <p className="text-muted-foreground">
          You've finished "{scenario.title}"
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="text-center">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 0.4 }}
              className={cn(
                "text-6xl font-display font-bold",
                grade.color
              )}
              data-testid="final-grade"
            >
              {grade.grade}
            </motion.div>
            <p className={cn("text-sm font-medium", grade.color)}>
              {grade.label}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <ScoreTracker score={session.score} />
          
          {session.badges.length > 0 && (
            <BadgeDisplay badges={session.badges} />
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          What To Remember Next Time
        </h3>
        <ul className="space-y-2">
          {tips.map((tip, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <TrendingUp className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span>{tip}</span>
            </motion.li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          variant="outline"
          onClick={onPlayAgain}
          data-testid="button-play-again"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Play Again
        </Button>
        <Button
          onClick={onSelectNewScenario}
          data-testid="button-new-scenario"
        >
          Try Another Scenario
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}

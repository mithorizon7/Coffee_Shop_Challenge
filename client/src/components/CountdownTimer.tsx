import { useState, useEffect, useCallback, useRef } from "react";
import { Timer, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface CountdownTimerProps {
  totalSeconds: number;
  isActive: boolean;
  sceneId: string;
  onTimeUp?: () => void;
}

export function CountdownTimer({ totalSeconds, isActive, sceneId, onTimeUp }: CountdownTimerProps) {
  const { t } = useTranslation();
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);
  const [isPulsing, setIsPulsing] = useState(false);
  const hasTriggeredTimeUp = useRef(false);
  const prevSceneId = useRef(sceneId);
  const prevIsActive = useRef(isActive);

  useEffect(() => {
    const sceneChanged = sceneId !== prevSceneId.current;
    const becameActive = isActive && !prevIsActive.current;

    if (sceneChanged || becameActive) {
      setSecondsRemaining(totalSeconds);
      hasTriggeredTimeUp.current = false;
    }

    prevSceneId.current = sceneId;
    prevIsActive.current = isActive;
  }, [sceneId, isActive, totalSeconds]);

  useEffect(() => {
    if (!isActive || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (!hasTriggeredTimeUp.current) {
            hasTriggeredTimeUp.current = true;
            setTimeout(() => onTimeUp?.(), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, secondsRemaining, onTimeUp]);

  useEffect(() => {
    setIsPulsing(secondsRemaining <= 30 && secondsRemaining > 0);
  }, [secondsRemaining]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const getTimerColor = useCallback(() => {
    if (secondsRemaining <= 15) return "text-red-600 dark:text-red-400";
    if (secondsRemaining <= 30) return "text-amber-600 dark:text-amber-400";
    return "text-foreground";
  }, [secondsRemaining]);

  const getBackgroundColor = useCallback(() => {
    if (secondsRemaining <= 15)
      return "bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-800";
    if (secondsRemaining <= 30)
      return "bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-800";
    return "bg-muted border-border";
  }, [secondsRemaining]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: 1,
          scale: isPulsing ? [1, 1.05, 1] : 1,
        }}
        transition={{
          duration: isPulsing ? 0.5 : 0.2,
          repeat: isPulsing ? Infinity : 0,
          repeatType: "loop",
        }}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md border",
          getBackgroundColor()
        )}
        data-testid="countdown-timer"
        role="timer"
        aria-live="polite"
        aria-label={t("aria.timerWithValue", { time: timeString })}
      >
        {secondsRemaining <= 30 ? (
          <AlertTriangle className={cn("w-4 h-4", getTimerColor())} />
        ) : (
          <Timer className={cn("w-4 h-4", getTimerColor())} />
        )}
        <span
          className={cn("font-mono font-semibold text-sm", getTimerColor())}
          data-testid="timer-display"
        >
          {timeString}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

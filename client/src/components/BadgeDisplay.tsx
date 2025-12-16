import { Shield, Lock, Search, Clock, Star, Award } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Badge } from "@shared/schema";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface BadgeDisplayProps {
  badges: Badge[];
  compact?: boolean;
}

const badgeIcons: Record<string, typeof Shield> = {
  shield: Shield,
  lock: Lock,
  search: Search,
  clock: Clock,
  star: Star,
};

const badgeColors: Record<string, { bg: string; text: string; border: string }> = {
  security_aware: {
    bg: "bg-blue-50 dark:bg-blue-950",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  vpn_master: {
    bg: "bg-purple-50 dark:bg-purple-950",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
  },
  network_detective: {
    bg: "bg-amber-50 dark:bg-amber-950",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  patient_professional: {
    bg: "bg-green-50 dark:bg-green-950",
    text: "text-green-600 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
  },
  perfect_score: {
    bg: "bg-yellow-50 dark:bg-yellow-950",
    text: "text-yellow-600 dark:text-yellow-400",
    border: "border-yellow-200 dark:border-yellow-800",
  },
};

export function BadgeDisplay({ badges, compact = false }: BadgeDisplayProps) {
  const { t } = useTranslation();

  if (badges.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>{t('game.noBadgesYet')}</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {badges.map((badge, index) => {
          const IconComponent = badgeIcons[badge.icon] || Shield;
          const colors = badgeColors[badge.id] || badgeColors.security_aware;
          
          return (
            <Tooltip key={badge.id}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1, type: "spring", stiffness: 500 }}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center",
                    colors.bg
                  )}>
                    <IconComponent className={cn("w-4 h-4", colors.text)} />
                  </div>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{badge.name}</p>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-foreground flex items-center gap-2">
        <Award className="w-4 h-4" />
        {t('game.badgesEarned')}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {badges.map((badge, index) => {
          const IconComponent = badgeIcons[badge.icon] || Shield;
          const colors = badgeColors[badge.id] || badgeColors.security_aware;
          
          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                colors.bg,
                colors.border
              )}
              data-testid={`badge-${badge.id}`}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center bg-background/50"
              )}>
                <IconComponent className={cn("w-5 h-5", colors.text)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  {badge.name}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {badge.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

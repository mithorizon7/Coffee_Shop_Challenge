import { Shield, Lock, Search, Clock, Star, Award } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Badge } from "@shared/schema";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { translateBadgeDescription, translateBadgeName } from "@/lib/translateContent";

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
    bg: "bg-sky-100/70 dark:bg-sky-950/40",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200/70 dark:border-sky-800/60",
  },
  vpn_master: {
    bg: "bg-teal-100/70 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200/70 dark:border-teal-800/60",
  },
  network_detective: {
    bg: "bg-amber-100/70 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200/70 dark:border-amber-800/60",
  },
  patient_professional: {
    bg: "bg-emerald-100/70 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200/70 dark:border-emerald-800/60",
  },
  perfect_score: {
    bg: "bg-amber-100/70 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200/70 dark:border-amber-800/60",
  },
};

export function BadgeDisplay({ badges, compact = false }: BadgeDisplayProps) {
  const { t } = useTranslation();

  if (badges.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>{t("game.noBadgesYet")}</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {badges.map((badge, index) => {
          const IconComponent = badgeIcons[badge.icon] || Shield;
          const colors = badgeColors[badge.id] || badgeColors.security_aware;
          const badgeName = translateBadgeName(t, badge.id, badge.name);
          const badgeDescription = translateBadgeDescription(t, badge.id, badge.description);

          return (
            <Tooltip key={badge.id}>
              <TooltipTrigger asChild>
                <motion.button
                  type="button"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1, type: "spring", stiffness: 500 }}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full transition-transform duration-200 hover:-translate-y-0.5"
                  aria-label={`${badgeName}. ${badgeDescription}`}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shadow-[0_10px_26px_-20px_hsl(var(--foreground)/0.4)]",
                      colors.bg
                    )}
                  >
                    <IconComponent className={cn("w-4 h-4", colors.text)} />
                  </div>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{badgeName}</p>
                <p className="text-xs text-muted-foreground">{badgeDescription}</p>
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
        {t("game.badgesEarned")}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {badges.map((badge, index) => {
          const IconComponent = badgeIcons[badge.icon] || Shield;
          const colors = badgeColors[badge.id] || badgeColors.security_aware;
          const badgeName = translateBadgeName(t, badge.id, badge.name);
          const badgeDescription = translateBadgeDescription(t, badge.id, badge.description);

          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border",
                colors.bg,
                colors.border
              )}
              data-testid={`badge-${badge.id}`}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center bg-background/60"
                )}
              >
                <IconComponent className={cn("w-5 h-5", colors.text)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{badgeName}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{badgeDescription}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

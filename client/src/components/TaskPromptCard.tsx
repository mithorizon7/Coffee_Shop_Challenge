import {
  Mail,
  Landmark,
  Download,
  CreditCard,
  Globe,
  Users,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Task, Action } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  translateActionDescription,
  translateActionLabel,
  translateTaskDescription,
  translateTaskRiskHint,
  translateTaskTitle,
} from "@/lib/translateContent";

interface TaskPromptCardProps {
  task: Task;
  actions: Action[];
  scenarioId: string;
  onAction: (actionId: string) => void;
  showHints?: boolean;
}

const taskIcons: Record<string, typeof Mail> = {
  email: Mail,
  banking: Landmark,
  download: Download,
  payment: CreditCard,
  browse: Globe,
  social: Users,
};

const sensitivityColors: Record<string, { bg: string; text: string; border: string }> = {
  low: {
    bg: "bg-emerald-100/70 dark:bg-emerald-950/40",
    text: "text-emerald-800 dark:text-emerald-200",
    border: "border-emerald-200/70 dark:border-emerald-800/60",
  },
  medium: {
    bg: "bg-amber-100/70 dark:bg-amber-950/40",
    text: "text-amber-800 dark:text-amber-200",
    border: "border-amber-200/70 dark:border-amber-800/60",
  },
  high: {
    bg: "bg-orange-100/70 dark:bg-orange-950/40",
    text: "text-orange-800 dark:text-orange-200",
    border: "border-orange-200/70 dark:border-orange-800/60",
  },
  critical: {
    bg: "bg-rose-100/70 dark:bg-rose-950/40",
    text: "text-rose-800 dark:text-rose-200",
    border: "border-rose-200/70 dark:border-rose-800/60",
  },
};

export function TaskPromptCard({
  task,
  actions,
  scenarioId,
  onAction,
  showHints = false,
}: TaskPromptCardProps) {
  const { t } = useTranslation();
  const IconComponent = taskIcons[task.type] || Globe;
  const sensitivity = sensitivityColors[task.sensitivityLevel];
  const sensitivityLabel = t(`game.sensitivityLevels.${task.sensitivityLevel}`);
  const title = task.titleKey
    ? t(task.titleKey)
    : translateTaskTitle(t, scenarioId, task.id, task.title);
  const description = task.descriptionKey
    ? t(task.descriptionKey)
    : translateTaskDescription(t, scenarioId, task.id, task.description);
  const riskHint = task.riskHintKey
    ? t(task.riskHintKey)
    : translateTaskRiskHint(t, scenarioId, task.id, task.riskHint || "");

  return (
    <Card className="p-7">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-[0_14px_30px_-22px_hsl(var(--foreground)/0.4)]",
            sensitivity.bg
          )}
        >
          <IconComponent className={cn("w-6 h-6", sensitivity.text)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
            <Badge
              variant="outline"
              className={cn(sensitivity.bg, sensitivity.text, sensitivity.border)}
            >
              {task.sensitivityLevel === "critical" && <AlertTriangle className="w-3 h-3 mr-1" />}
              {t("game.sensitivity", { level: sensitivityLabel })}
            </Badge>
          </div>

          <p className="text-muted-foreground mb-4" data-testid="task-description">
            {description}
          </p>

          {showHints && riskHint && (
            <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-100/60 dark:bg-amber-950/40 mb-4">
              <Info className="w-4 h-4 text-amber-700 dark:text-amber-300 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">{riskHint}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {actions.map((action) => {
              const actionLabel = action.labelKey
                ? t(action.labelKey)
                : translateActionLabel(t, scenarioId, action.id, action.label);
              const actionDescription = action.descriptionKey
                ? t(action.descriptionKey)
                : translateActionDescription(t, scenarioId, action.id, action.description || "");
              return (
                <Tooltip key={action.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => onAction(action.id)}
                      data-testid={`action-${action.id}`}
                    >
                      {actionLabel}
                    </Button>
                  </TooltipTrigger>
                  {actionDescription && (
                    <TooltipContent>
                      <p>{actionDescription}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

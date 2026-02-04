import { Shield, Scale, Target, Clock, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DifficultyLevel, ScenarioListItem } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  translateScenarioTitle,
  translateScenarioDescription,
  translateScenarioLocation,
} from "@/lib/translateContent";

interface DifficultySelectorProps {
  scenarios: ScenarioListItem[];
  onSelect: (scenarioId: string) => void;
}

const difficultyConfig: Record<
  DifficultyLevel,
  {
    icon: typeof Shield;
    labelKey: string;
    descriptionKey: string;
    featureKeys: string[];
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  beginner: {
    icon: Shield,
    labelKey: "scenario.difficulty.beginner",
    descriptionKey: "scenario.difficultyDesc.beginner",
    featureKeys: [
      "scenario.difficultyFeatures.beginner1",
      "scenario.difficultyFeatures.beginner2",
      "scenario.difficultyFeatures.beginner3",
    ],
    color: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-100/70 dark:bg-emerald-950/40",
    borderColor: "border-emerald-200/70 dark:border-emerald-800/60",
  },
  intermediate: {
    icon: Scale,
    labelKey: "scenario.difficulty.intermediate",
    descriptionKey: "scenario.difficultyDesc.intermediate",
    featureKeys: [
      "scenario.difficultyFeatures.intermediate1",
      "scenario.difficultyFeatures.intermediate2",
      "scenario.difficultyFeatures.intermediate3",
    ],
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-100/70 dark:bg-amber-950/40",
    borderColor: "border-amber-200/70 dark:border-amber-800/60",
  },
  advanced: {
    icon: Target,
    labelKey: "scenario.difficulty.advanced",
    descriptionKey: "scenario.difficultyDesc.advanced",
    featureKeys: [
      "scenario.difficultyFeatures.advanced1",
      "scenario.difficultyFeatures.advanced2",
      "scenario.difficultyFeatures.advanced3",
    ],
    color: "text-rose-700 dark:text-rose-300",
    bgColor: "bg-rose-100/70 dark:bg-rose-950/40",
    borderColor: "border-rose-200/70 dark:border-rose-800/60",
  },
};

export function DifficultySelector({ scenarios, onSelect }: DifficultySelectorProps) {
  const { t } = useTranslation();

  const formatEstimatedTime = (estimatedTime: string) => {
    const match = estimatedTime.match(/(\\d+)/);
    if (!match) return estimatedTime;
    const minutes = Number(match[1]);
    if (!Number.isFinite(minutes)) return estimatedTime;
    return t("time.minutes", { count: minutes });
  };

  const groupedScenarios = scenarios.reduce(
    (acc, scenario) => {
      if (!acc[scenario.difficulty]) {
        acc[scenario.difficulty] = [];
      }
      acc[scenario.difficulty].push(scenario);
      return acc;
    },
    {} as Record<DifficultyLevel, ScenarioListItem[]>
  );

  const orderedDifficulties: DifficultyLevel[] = ["beginner", "intermediate", "advanced"];

  return (
    <div className="space-y-8">
      {orderedDifficulties.map((difficulty) => {
        const config = difficultyConfig[difficulty];
        const DifficultyIcon = config.icon;
        const scenariosForDifficulty = groupedScenarios[difficulty] || [];

        if (scenariosForDifficulty.length === 0) return null;

        return (
          <div key={difficulty} className="space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-[0_14px_30px_-22px_hsl(var(--foreground)/0.4)]",
                  config.bgColor
                )}
              >
                <DifficultyIcon className={cn("w-5 h-5", config.color)} />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {t(config.labelKey)}
                </h3>
                <p className="text-sm text-muted-foreground">{t(config.descriptionKey)}</p>
                <ul className="mt-2 space-y-1">
                  {config.featureKeys.map((featureKey, index) => (
                    <li
                      key={index}
                      className="text-xs text-muted-foreground flex items-center gap-1.5"
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          difficulty === "beginner" && "bg-emerald-500 dark:bg-emerald-400",
                          difficulty === "intermediate" && "bg-amber-500 dark:bg-amber-400",
                          difficulty === "advanced" && "bg-rose-500 dark:bg-rose-400"
                        )}
                      />
                      {t(featureKey)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-3 ml-0 sm:ml-[3.75rem]">
              {scenariosForDifficulty.map((scenario) => {
                const title = translateScenarioTitle(t, scenario.id, scenario.title);
                const description = translateScenarioDescription(
                  t,
                  scenario.id,
                  scenario.description
                );
                const location = translateScenarioLocation(t, scenario.id, scenario.location);
                const estimatedTime = formatEstimatedTime(scenario.estimatedTime);

                return (
                  <Card
                    key={scenario.id}
                    className={cn(
                      "p-5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-background/80 hover:shadow-[0_18px_40px_-30px_hsl(var(--foreground)/0.45)]",
                      config.borderColor
                    )}
                    data-testid={`scenario-card-${scenario.id}`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(scenario.id)}
                      className="group w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-2xl"
                      aria-describedby={`scenario-desc-${scenario.id}`}
                      aria-label={t("scenario.startScenarioWithTime", {
                        title,
                        time: estimatedTime,
                      })}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium text-foreground">{title}</h4>
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {estimatedTime}
                            </Badge>
                          </div>
                          <p
                            id={`scenario-desc-${scenario.id}`}
                            className="text-sm text-muted-foreground mt-1 line-clamp-2"
                          >
                            {description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{location}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground/70" />
                      </div>
                    </button>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

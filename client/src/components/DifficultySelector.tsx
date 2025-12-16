import { Shield, Scale, Target, Clock, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DifficultyLevel, ScenarioListItem } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface DifficultySelectorProps {
  scenarios: ScenarioListItem[];
  onSelect: (scenarioId: string) => void;
}

const difficultyConfig: Record<DifficultyLevel, {
  icon: typeof Shield;
  labelKey: string;
  descriptionKey: string;
  featureKeys: string[];
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  beginner: {
    icon: Shield,
    labelKey: "scenario.difficulty.beginner",
    descriptionKey: "scenario.difficultyDesc.beginner",
    featureKeys: [
      "scenario.difficultyFeatures.beginner1",
      "scenario.difficultyFeatures.beginner2",
      "scenario.difficultyFeatures.beginner3",
    ],
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950",
    borderColor: "border-green-200 dark:border-green-800",
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
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950",
    borderColor: "border-amber-200 dark:border-amber-800",
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
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950",
    borderColor: "border-red-200 dark:border-red-800",
  },
};

export function DifficultySelector({ scenarios, onSelect }: DifficultySelectorProps) {
  const { t } = useTranslation();
  
  const groupedScenarios = scenarios.reduce((acc, scenario) => {
    if (!acc[scenario.difficulty]) {
      acc[scenario.difficulty] = [];
    }
    acc[scenario.difficulty].push(scenario);
    return acc;
  }, {} as Record<DifficultyLevel, ScenarioListItem[]>);

  const orderedDifficulties: DifficultyLevel[] = ["beginner", "intermediate", "advanced"];

  return (
    <div className="space-y-6">
      {orderedDifficulties.map((difficulty) => {
        const config = difficultyConfig[difficulty];
        const DifficultyIcon = config.icon;
        const scenariosForDifficulty = groupedScenarios[difficulty] || [];

        if (scenariosForDifficulty.length === 0) return null;

        return (
          <div key={difficulty} className="space-y-3">
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                config.bgColor
              )}>
                <DifficultyIcon className={cn("w-5 h-5", config.color)} />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold text-foreground">
                  {t(config.labelKey)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(config.descriptionKey)}
                </p>
                <ul className="mt-2 space-y-1">
                  {config.featureKeys.map((featureKey, index) => (
                    <li key={index} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                        difficulty === 'beginner' && "bg-green-500 dark:bg-green-400",
                        difficulty === 'intermediate' && "bg-amber-500 dark:bg-amber-400",
                        difficulty === 'advanced' && "bg-red-500 dark:bg-red-400"
                      )} />
                      {t(featureKey)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-2 pl-13">
              {scenariosForDifficulty.map((scenario) => (
                <Card
                  key={scenario.id}
                  className={cn(
                    "p-4 cursor-pointer hover-elevate active-elevate-2 transition-all duration-150",
                    config.borderColor
                  )}
                  onClick={() => onSelect(scenario.id)}
                  data-testid={`scenario-card-${scenario.id}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-foreground">
                          {scenario.title}
                        </h4>
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {scenario.estimatedTime}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {scenario.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {scenario.location}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

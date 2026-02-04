import { ArrowRight, Clock, MapPin, Wifi } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ScenarioListItem } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { difficultyConfig } from "@/lib/difficultyConfig";
import {
  translateScenarioTitle,
  translateScenarioDescription,
  translateScenarioLocation,
} from "@/lib/translateContent";
import { cn } from "@/lib/utils";

interface ScenarioIntroProps {
  scenario: ScenarioListItem;
  index: number;
  total: number;
  onStart: () => void;
  onBack?: () => void;
  nextScenarioTitle?: string;
}

export function ScenarioIntro({
  scenario,
  index,
  total,
  onStart,
  onBack,
  nextScenarioTitle,
}: ScenarioIntroProps) {
  const { t } = useTranslation();
  const config = difficultyConfig[scenario.difficulty];
  const DifficultyIcon = config.icon;

  const formatEstimatedTime = (estimatedTime: string) => {
    const match = estimatedTime.match(/(\d+)/);
    if (!match) return estimatedTime;
    const minutes = Number(match[1]);
    if (!Number.isFinite(minutes)) return estimatedTime;
    return t("time.minutes", { count: minutes });
  };

  const title = translateScenarioTitle(t, scenario.id, scenario.title);
  const description = translateScenarioDescription(t, scenario.id, scenario.description);
  const location = translateScenarioLocation(t, scenario.id, scenario.location);
  const estimatedTime = formatEstimatedTime(scenario.estimatedTime);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {t("sequence.challengeProgress", { current: index + 1, total })}
        </span>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground max-w-2xl">{description}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] items-start">
        <Card className="p-6 md:p-8 relative overflow-hidden">
          <div className="absolute -top-24 -right-12 h-40 w-40 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-12 h-40 w-40 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
          <div className="relative space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center shadow-[0_18px_40px_-26px_hsl(var(--primary)/0.8)]">
              <Wifi className="w-6 h-6 text-primary" />
            </div>

            <div className="grid gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>
                  {t("scenario.estimatedTime")}: {estimatedTime}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Button size="lg" onClick={onStart} data-testid="button-start-scenario">
                {t("scenario.startScenario")}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              {onBack && (
                <Button variant="ghost" onClick={onBack} data-testid="button-back-home">
                  {t("common.back")}
                </Button>
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-[0_14px_30px_-22px_hsl(var(--foreground)/0.4)]",
                  config.bgColor
                )}
              >
                <DifficultyIcon className={cn("w-5 h-5", config.color)} />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {t(config.labelKey)}
                </h3>
                <p className="text-sm text-muted-foreground">{t(config.descriptionKey)}</p>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {config.featureKeys.map((featureKey, featureIndex) => (
                <li
                  key={featureIndex}
                  className="text-xs text-muted-foreground flex items-center gap-2"
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full flex-shrink-0",
                      scenario.difficulty === "beginner" && "bg-emerald-500 dark:bg-emerald-400",
                      scenario.difficulty === "intermediate" && "bg-amber-500 dark:bg-amber-400",
                      scenario.difficulty === "advanced" && "bg-rose-500 dark:bg-rose-400"
                    )}
                  />
                  {t(featureKey)}
                </li>
              ))}
            </ul>
          </Card>

          {nextScenarioTitle && (
            <Card className="p-4 bg-muted/40">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">
                {t("sequence.upNext")}
              </p>
              <p className="text-sm font-medium text-foreground">{nextScenarioTitle}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

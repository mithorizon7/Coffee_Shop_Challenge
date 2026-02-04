import { Check, ChevronRight } from "lucide-react";
import type { Scene } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ProgressIndicatorProps {
  scenes: Scene[];
  currentSceneId: string;
  completedSceneIds: string[];
}

const sceneTypeLabelKeys: Record<string, string> = {
  arrival: "game.sceneType.start",
  network_selection: "game.sceneType.network",
  captive_portal: "game.sceneType.portal",
  task_prompt: "game.sceneType.task",
  consequence: "game.sceneType.result",
  debrief: "game.sceneType.review",
  completion: "game.sceneType.complete",
};

export function ProgressIndicator({
  scenes,
  currentSceneId,
  completedSceneIds,
}: ProgressIndicatorProps) {
  const { t } = useTranslation();
  const mainScenes = scenes.filter((scene) =>
    ["arrival", "network_selection", "task_prompt", "completion"].includes(scene.type)
  );

  const currentIndex = mainScenes.findIndex((s) => s.id === currentSceneId);
  const displayScenes = mainScenes.slice(0, 5);

  return (
    <div className="flex items-center gap-2 overflow-x-auto rounded-full border border-border/60 bg-background/70 px-3 py-2 shadow-sm backdrop-blur">
      {displayScenes.map((scene, index) => {
        const isCompleted = completedSceneIds.includes(scene.id);
        const isCurrent =
          scene.id === currentSceneId ||
          (currentIndex === -1 && index === completedSceneIds.length);
        const isPast = isCompleted || index < currentIndex;
        const labelKey = sceneTypeLabelKeys[scene.type];

        return (
          <div key={scene.id} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors border",
                  isPast &&
                    "bg-primary text-primary-foreground border-primary/40 shadow-[0_10px_25px_-20px_hsl(var(--primary)/0.7)]",
                  isCurrent &&
                    !isPast &&
                    "bg-primary/10 text-primary border-primary/50 shadow-[0_8px_20px_-16px_hsl(var(--primary)/0.6)]",
                  !isPast && !isCurrent && "bg-muted/60 text-muted-foreground border-border/60"
                )}
              >
                {isPast ? <Check className="w-3.5 h-3.5" /> : <span>{index + 1}</span>}
              </div>
              <span
                className={cn(
                  "text-xs hidden sm:inline whitespace-nowrap",
                  isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {labelKey ? t(labelKey) : scene.type}
              </span>
            </div>

            {index < displayScenes.length - 1 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground mx-1 flex-shrink-0" />
            )}
          </div>
        );
      })}

      {mainScenes.length > 5 && (
        <span className="text-xs text-muted-foreground ml-1">
          {t("game.moreSteps", { count: mainScenes.length - 5 })}
        </span>
      )}
    </div>
  );
}

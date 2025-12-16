import { Check, Circle, ChevronRight } from "lucide-react";
import type { Scene } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  scenes: Scene[];
  currentSceneId: string;
  completedSceneIds: string[];
}

const sceneTypeLabels: Record<string, string> = {
  arrival: "Start",
  network_selection: "Network",
  captive_portal: "Portal",
  task_prompt: "Task",
  consequence: "Result",
  debrief: "Review",
  completion: "Complete",
};

export function ProgressIndicator({ scenes, currentSceneId, completedSceneIds }: ProgressIndicatorProps) {
  const mainScenes = scenes.filter(scene => 
    ["arrival", "network_selection", "task_prompt", "completion"].includes(scene.type)
  );

  const currentIndex = mainScenes.findIndex(s => s.id === currentSceneId);
  const displayScenes = mainScenes.slice(0, 5);

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {displayScenes.map((scene, index) => {
        const isCompleted = completedSceneIds.includes(scene.id);
        const isCurrent = scene.id === currentSceneId || 
          (currentIndex === -1 && index === completedSceneIds.length);
        const isPast = isCompleted || index < currentIndex;

        return (
          <div key={scene.id} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                  isPast && "bg-primary text-primary-foreground",
                  isCurrent && !isPast && "bg-primary/20 text-primary border-2 border-primary",
                  !isPast && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isPast ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className={cn(
                "text-xs hidden sm:inline whitespace-nowrap",
                isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {sceneTypeLabels[scene.type] || scene.type}
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
          +{mainScenes.length - 5} more
        </span>
      )}
    </div>
  );
}

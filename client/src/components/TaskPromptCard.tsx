import { Mail, Landmark, Download, CreditCard, Globe, Users, AlertTriangle, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Task, Action } from "@shared/schema";
import { cn } from "@/lib/utils";

interface TaskPromptCardProps {
  task: Task;
  actions: Action[];
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
    bg: "bg-green-50 dark:bg-green-950", 
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800"
  },
  medium: { 
    bg: "bg-amber-50 dark:bg-amber-950", 
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800"
  },
  high: { 
    bg: "bg-orange-50 dark:bg-orange-950", 
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800"
  },
  critical: { 
    bg: "bg-red-50 dark:bg-red-950", 
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800"
  },
};

export function TaskPromptCard({ task, actions, onAction, showHints = false }: TaskPromptCardProps) {
  const IconComponent = taskIcons[task.type] || Globe;
  const sensitivity = sensitivityColors[task.sensitivityLevel];

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
          sensitivity.bg
        )}>
          <IconComponent className={cn("w-6 h-6", sensitivity.text)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {task.title}
            </h3>
            <Badge 
              variant="outline" 
              className={cn(sensitivity.bg, sensitivity.text, sensitivity.border)}
            >
              {task.sensitivityLevel === "critical" && <AlertTriangle className="w-3 h-3 mr-1" />}
              {task.sensitivityLevel.charAt(0).toUpperCase() + task.sensitivityLevel.slice(1)} Sensitivity
            </Badge>
          </div>
          
          <p className="text-muted-foreground mb-4" data-testid="task-description">
            {task.description}
          </p>
          
          {showHints && task.riskHint && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950 mb-4">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {task.riskHint}
              </p>
            </div>
          )}
          
          <div className="flex flex-wrap gap-3">
            {actions.map((action) => (
              <Tooltip key={action.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={action.isDanger ? "destructive" : action.isPrimary ? "default" : "outline"}
                    onClick={() => onAction(action.id)}
                    data-testid={`action-${action.id}`}
                  >
                    {action.label}
                  </Button>
                </TooltipTrigger>
                {action.description && (
                  <TooltipContent>
                    <p>{action.description}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

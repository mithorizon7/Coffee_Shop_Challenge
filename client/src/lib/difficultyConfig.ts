import { Shield, Scale, Target } from "lucide-react";
import type { DifficultyLevel } from "@shared/schema";

export const difficultyConfig: Record<
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

export const orderedDifficulties: DifficultyLevel[] = ["beginner", "intermediate", "advanced"];

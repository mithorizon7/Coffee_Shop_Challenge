import { AlertTriangle, CheckCircle, AlertCircle, ArrowRight, Shield, Lightbulb, Key, User, DollarSign, UserX, Eye, Bug, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Consequence } from "@shared/schema";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface ConsequenceScreenProps {
  consequence: Consequence;
  onContinue: () => void;
  scenarioId?: string;
}

const severityConfig = {
  success: {
    bg: "bg-green-50 dark:bg-green-950",
    border: "border-green-200 dark:border-green-800",
    iconBg: "bg-green-100 dark:bg-green-900",
    iconColor: "text-green-600 dark:text-green-400",
    headerBg: "bg-green-100 dark:bg-green-900",
    Icon: CheckCircle,
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950",
    border: "border-amber-200 dark:border-amber-800",
    iconBg: "bg-amber-100 dark:bg-amber-900",
    iconColor: "text-amber-600 dark:text-amber-400",
    headerBg: "bg-amber-100 dark:bg-amber-900",
    Icon: AlertCircle,
  },
  danger: {
    bg: "bg-red-50 dark:bg-red-950",
    border: "border-red-200 dark:border-red-800",
    iconBg: "bg-red-100 dark:bg-red-900",
    iconColor: "text-red-600 dark:text-red-400",
    headerBg: "bg-red-100 dark:bg-red-900",
    Icon: AlertTriangle,
  },
};

const cascadeIcons = {
  credential: Key,
  account: User,
  money: DollarSign,
  identity: UserX,
  privacy: Eye,
  malware: Bug,
};

export function ConsequenceScreen({ consequence, onContinue, scenarioId }: ConsequenceScreenProps) {
  const { t } = useTranslation();
  const config = severityConfig[consequence.severity];
  const SeverityIcon = config.Icon;
  
  const getTranslatedTitle = () => {
    if (!scenarioId) return consequence.title;
    return t(`scenarios.${scenarioId}.consequences.${consequence.id}.title`, { defaultValue: consequence.title });
  };
  
  const getTranslatedWhatHappened = () => {
    if (!scenarioId) return consequence.whatHappened;
    return t(`scenarios.${scenarioId}.consequences.${consequence.id}.whatHappened`, { defaultValue: consequence.whatHappened });
  };
  
  const getTranslatedWhyRisky = () => {
    if (!scenarioId) return consequence.whyRisky;
    return t(`scenarios.${scenarioId}.consequences.${consequence.id}.whyRisky`, { defaultValue: consequence.whyRisky });
  };
  
  const getTranslatedSaferAlternative = () => {
    if (!scenarioId) return consequence.saferAlternative;
    return t(`scenarios.${scenarioId}.consequences.${consequence.id}.saferAlternative`, { defaultValue: consequence.saferAlternative });
  };
  
  const getTranslatedTechnicalExplanation = () => {
    if (!scenarioId || !consequence.technicalExplanation) return consequence.technicalExplanation;
    return t(`scenarios.${scenarioId}.consequences.${consequence.id}.technicalExplanation`, { defaultValue: consequence.technicalExplanation });
  };
  
  const getTranslatedCascadingEffect = (effect: { order: number; effect: string; icon?: string }) => {
    if (!scenarioId) return effect.effect;
    return t(`scenarios.${scenarioId}.consequences.${consequence.id}.cascading.${effect.order - 1}`, { defaultValue: effect.effect });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <Card className={cn("overflow-hidden", config.border)}>
        <div className={cn("p-4 flex items-center gap-4", config.headerBg)}>
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", config.iconBg)}>
            <SeverityIcon className={cn("w-6 h-6", config.iconColor)} />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              {getTranslatedTitle()}
            </h2>
            <div className="flex items-center gap-4 mt-1 text-sm">
              {consequence.safetyPointsChange > 0 && (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {t('consequence.safetyPoints', { points: consequence.safetyPointsChange })}
                </span>
              )}
              {consequence.riskPointsChange > 0 && (
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {t('consequence.riskPoints', { points: consequence.riskPointsChange })}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-foreground flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">1</div>
                  {t('consequence.whatHappened')}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed" data-testid="consequence-what-happened">
                  {getTranslatedWhatHappened()}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-foreground flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">2</div>
                  {consequence.severity === "success" ? t('consequence.whySafe') : t('consequence.whyRisky')}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed" data-testid="consequence-why-risky">
                  {getTranslatedWhyRisky()}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className={cn("p-4 rounded-lg", config.bg)}>
                <h3 className="font-medium text-foreground flex items-center gap-2 mb-2">
                  <Shield className={cn("w-4 h-4", config.iconColor)} />
                  {consequence.severity === "success" ? t('consequence.whyWorked') : t('consequence.saferAlternative')}
                </h3>
                <p className="text-sm leading-relaxed" data-testid="consequence-safer-alternative">
                  {getTranslatedSaferAlternative()}
                </p>
              </div>
              
              {consequence.technicalExplanation && (
                <div className="p-4 rounded-lg bg-muted">
                  <h3 className="font-medium text-foreground flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-muted-foreground" />
                    {t('consequence.technicalDetails')}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {getTranslatedTechnicalExplanation()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {consequence.cascadingEffects && consequence.cascadingEffects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="pt-4 border-t border-border"
              data-testid="cascading-effects-container"
            >
              <h3 className="font-medium text-foreground flex items-center gap-2 mb-4" data-testid="cascading-effects-heading">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                {t('consequence.cascadingEffects')}
              </h3>
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                  {consequence.cascadingEffects
                    .sort((a, b) => a.order - b.order)
                    .map((effect, index) => {
                      const IconComponent = effect.icon ? cascadeIcons[effect.icon] : AlertCircle;
                      return (
                        <motion.div
                          key={effect.order}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + index * 0.15 }}
                          className="flex items-center gap-2"
                          data-testid={`cascading-effect-${effect.order}`}
                        >
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                            <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center flex-shrink-0">
                              <IconComponent className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                            </div>
                            <span className="text-xs text-red-800 dark:text-red-200" data-testid={`cascading-effect-text-${effect.order}`}>
                              {getTranslatedCascadingEffect(effect)}
                            </span>
                          </div>
                          {index < (consequence.cascadingEffects?.length || 0) - 1 && (
                            <ChevronRight className="w-4 h-4 text-red-400 flex-shrink-0" />
                          )}
                        </motion.div>
                      );
                    })}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </Card>
      
      <div className="flex justify-end">
        <Button onClick={onContinue} data-testid="button-continue">
          {t('common.continue')}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}

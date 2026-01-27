import { AlertTriangle, CheckCircle, AlertCircle, Shield, Key, User, DollarSign, UserX, Eye, Bug, ChevronRight, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Consequence } from "@shared/schema";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface ConsequenceScreenProps {
  consequence: Consequence;
  onContinue: () => void;
  onTryAnother?: () => void;
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

export function ConsequenceScreen({ consequence, onContinue, onTryAnother }: ConsequenceScreenProps) {
  const { t } = useTranslation();
  const config = severityConfig[consequence.severity];
  const SeverityIcon = config.Icon;
  const title = consequence.titleKey ? t(consequence.titleKey) : consequence.title;
  const whatHappened = consequence.whatHappenedKey ? t(consequence.whatHappenedKey) : consequence.whatHappened;
  const whyRisky = consequence.whyRiskyKey ? t(consequence.whyRiskyKey) : consequence.whyRisky;
  const saferAlternative = consequence.saferAlternativeKey ? t(consequence.saferAlternativeKey) : consequence.saferAlternative;
  const technicalExplanation = consequence.technicalExplanationKey
    ? t(consequence.technicalExplanationKey)
    : consequence.technicalExplanation;
  const rationaleTypeKeys: Record<string, string> = {
    credential_harvested: "scoring.rationale.type.credential_harvested",
    session_compromised: "scoring.rationale.type.session_compromised",
    malware_installed: "scoring.rationale.type.malware_installed",
    account_locked: "scoring.rationale.type.account_locked",
    privacy_leaked: "scoring.rationale.type.privacy_leaked",
    safe_browsing: "scoring.rationale.type.safe_browsing",
    vpn_protected: "scoring.rationale.type.vpn_protected",
    action_postponed: "scoring.rationale.type.action_postponed",
    network_verified: "scoring.rationale.type.network_verified",
    missed_verification: "scoring.rationale.type.missed_verification",
  };
  const rationaleKey = rationaleTypeKeys[consequence.type] ?? "scoring.rationale.type.default";
  const safetyPoints = consequence.safetyPointsChange;
  const riskPoints = consequence.riskPointsChange;

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
              {title}
            </h2>
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
                  {whatHappened}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-foreground flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">2</div>
                  {consequence.severity === "success" ? t('consequence.whySafe') : t('consequence.whyRisky')}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed" data-testid="consequence-why-risky">
                  {whyRisky}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className={cn("p-4 rounded-lg", config.bg)}>
                <h3 className="font-medium text-foreground flex items-center gap-2 mb-2">
                  <Shield className={cn("w-4 h-4", config.iconColor)} />
                  {consequence.severity === "success" ? t('consequence.whyWorked') : t('consequence.saferAlternative')}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {saferAlternative}
                </p>
              </div>
              
              {technicalExplanation && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-medium text-foreground flex items-center gap-2 mb-2">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    {t('consequence.technicalDetails')}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {technicalExplanation}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {consequence.cascadingEffects && consequence.cascadingEffects.length > 0 && (
            <div className="border-t border-border pt-6">
              <h3 className="font-medium text-foreground mb-4">
                {t('consequence.cascadingTitle')}
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {consequence.cascadingEffects.map((effect) => {
                  const IconComponent = cascadeIcons[effect.icon as keyof typeof cascadeIcons] || ChevronRight;
                  return (
                    <div
                      key={effect.order}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        config.iconBg
                      )}>
                        <IconComponent className={cn("w-4 h-4", config.iconColor)} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {effect.effect}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t border-border pt-6">
            <h3 className="font-medium text-foreground mb-3">
              {t('scoring.rationale.title')}
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              {safetyPoints !== 0 && (
                <p>
                  {t('scoring.rationale.safety', {
                    points: safetyPoints,
                    reason: t(rationaleKey),
                  })}
                </p>
              )}
              {riskPoints !== 0 && (
                <p>
                  {t('scoring.rationale.risk', {
                    points: riskPoints,
                    reason: t(rationaleKey),
                  })}
                </p>
              )}
              {safetyPoints === 0 && riskPoints === 0 && (
                <p>{t('scoring.rationale.neutral')}</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        {onTryAnother && (
          <Button
            variant="outline"
            onClick={onTryAnother}
            className="flex-1"
            data-testid="button-try-another"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('common.tryAnotherOption')}
          </Button>
        )}
        <Button
          onClick={onContinue}
          className="flex-1"
          data-testid="button-continue"
        >
          {t('common.continue')}
        </Button>
      </div>
    </motion.div>
  );
}

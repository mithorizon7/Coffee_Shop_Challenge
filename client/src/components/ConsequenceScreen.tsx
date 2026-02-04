import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Shield,
  Key,
  User,
  DollarSign,
  UserX,
  Eye,
  Bug,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Consequence } from "@shared/schema";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  translateConsequenceSaferAlternative,
  translateConsequenceTechnicalExplanation,
  translateConsequenceTitle,
  translateConsequenceWhatHappened,
  translateConsequenceWhyRisky,
  translateCascadingEffect,
} from "@/lib/translateContent";

interface ConsequenceScreenProps {
  consequence: Consequence;
  scenarioId: string;
  sceneId: string;
  onContinue?: () => void;
  onTryAnother?: () => void;
  continueLabel?: string;
  tryAnotherLabel?: string;
  footerMessage?: string;
}

const severityConfig = {
  success: {
    bg: "bg-emerald-100/70 dark:bg-emerald-950/40",
    border: "border-emerald-200/70 dark:border-emerald-800/60",
    iconBg: "bg-emerald-100/80 dark:bg-emerald-900/40",
    iconColor: "text-emerald-700 dark:text-emerald-300",
    headerBg: "bg-emerald-100/70 dark:bg-emerald-950/40",
    Icon: CheckCircle,
  },
  warning: {
    bg: "bg-amber-100/70 dark:bg-amber-950/40",
    border: "border-amber-200/70 dark:border-amber-800/60",
    iconBg: "bg-amber-100/80 dark:bg-amber-900/40",
    iconColor: "text-amber-700 dark:text-amber-300",
    headerBg: "bg-amber-100/70 dark:bg-amber-950/40",
    Icon: AlertCircle,
  },
  danger: {
    bg: "bg-rose-100/70 dark:bg-rose-950/40",
    border: "border-rose-200/70 dark:border-rose-800/60",
    iconBg: "bg-rose-100/80 dark:bg-rose-900/40",
    iconColor: "text-rose-700 dark:text-rose-300",
    headerBg: "bg-rose-100/70 dark:bg-rose-950/40",
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

function getConsequenceTranslationId(consequence: Consequence, sceneId: string): string {
  const key =
    consequence.titleKey ||
    consequence.whatHappenedKey ||
    consequence.whyRiskyKey ||
    consequence.saferAlternativeKey ||
    consequence.technicalExplanationKey;
  if (key) {
    const match = key.match(/scenarios\.[^.]+\.consequences\.([^.]+)\./);
    if (match?.[1]) {
      return match[1];
    }
  }
  if (consequence.id) {
    return consequence.id;
  }
  if (sceneId.startsWith("consequence_")) {
    return `cons_${sceneId.slice("consequence_".length)}`;
  }
  if (sceneId.includes("_consequence_")) {
    return `cons_${sceneId.replace("_consequence_", "_")}`;
  }
  return `cons_${sceneId}`;
}

export function ConsequenceScreen({
  consequence,
  scenarioId,
  sceneId,
  onContinue,
  onTryAnother,
  continueLabel,
  tryAnotherLabel,
  footerMessage,
}: ConsequenceScreenProps) {
  const { t } = useTranslation();
  const config = severityConfig[consequence.severity];
  const SeverityIcon = config.Icon;
  const consequenceId = getConsequenceTranslationId(consequence, sceneId);
  const title = consequence.titleKey
    ? t(consequence.titleKey)
    : translateConsequenceTitle(t, scenarioId, consequenceId, consequence.title);
  const whatHappened = consequence.whatHappenedKey
    ? t(consequence.whatHappenedKey)
    : translateConsequenceWhatHappened(t, scenarioId, consequenceId, consequence.whatHappened);
  const whyRisky = consequence.whyRiskyKey
    ? t(consequence.whyRiskyKey)
    : translateConsequenceWhyRisky(t, scenarioId, consequenceId, consequence.whyRisky);
  const saferAlternative = consequence.saferAlternativeKey
    ? t(consequence.saferAlternativeKey)
    : translateConsequenceSaferAlternative(
        t,
        scenarioId,
        consequenceId,
        consequence.saferAlternative
      );
  const technicalExplanation = consequence.technicalExplanationKey
    ? t(consequence.technicalExplanationKey)
    : translateConsequenceTechnicalExplanation(
        t,
        scenarioId,
        consequenceId,
        consequence.technicalExplanation || ""
      );
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
        <div className={cn("p-5 flex items-center gap-4", config.headerBg)}>
          <div
            className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", config.iconBg)}
          >
            <SeverityIcon className={cn("w-6 h-6", config.iconColor)} />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-foreground flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  {t("consequence.whatHappened")}
                </h3>
                <p
                  className="text-muted-foreground text-sm leading-relaxed"
                  data-testid="consequence-what-happened"
                >
                  {whatHappened}
                </p>
              </div>

              <div>
                <h3 className="font-medium text-foreground flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  {consequence.severity === "success"
                    ? t("consequence.whySafe")
                    : t("consequence.whyRisky")}
                </h3>
                <p
                  className="text-muted-foreground text-sm leading-relaxed"
                  data-testid="consequence-why-risky"
                >
                  {whyRisky}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className={cn("p-4 rounded-lg", config.bg)}>
                <h3 className="font-medium text-foreground flex items-center gap-2 mb-2">
                  <Shield className={cn("w-4 h-4", config.iconColor)} />
                  {consequence.severity === "success"
                    ? t("consequence.whyWorked")
                    : t("consequence.saferAlternative")}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{saferAlternative}</p>
              </div>

              {technicalExplanation && (
                <div className="p-4 rounded-2xl bg-muted/40">
                  <h3 className="font-medium text-foreground flex items-center gap-2 mb-2">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    {t("consequence.technicalDetails")}
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
                {t("consequence.cascadingTitle")}
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {consequence.cascadingEffects.map((effect, index) => {
                  const IconComponent =
                    cascadeIcons[effect.icon as keyof typeof cascadeIcons] || ChevronRight;
                  const effectText = translateCascadingEffect(
                    t,
                    scenarioId,
                    consequenceId,
                    index,
                    effect.effect
                  );
                  return (
                    <div
                      key={effect.order}
                      className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40"
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          config.iconBg
                        )}
                      >
                        <IconComponent className={cn("w-4 h-4", config.iconColor)} />
                      </div>
                      <p className="text-sm text-muted-foreground">{effectText}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t border-border pt-6">
            <h3 className="font-medium text-foreground mb-3">{t("scoring.rationale.title")}</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              {safetyPoints !== 0 && (
                <p>
                  {t("scoring.rationale.safety", {
                    points: safetyPoints,
                    reason: t(rationaleKey),
                  })}
                </p>
              )}
              {riskPoints !== 0 && (
                <p>
                  {t("scoring.rationale.risk", {
                    points: riskPoints,
                    reason: t(rationaleKey),
                  })}
                </p>
              )}
              {safetyPoints === 0 && riskPoints === 0 && <p>{t("scoring.rationale.neutral")}</p>}
            </div>
          </div>
        </div>
      </Card>

      {(footerMessage || onTryAnother || onContinue) && (
        <div className="space-y-3">
          {footerMessage && (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
              {footerMessage}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {onTryAnother && (
              <Button
                variant="outline"
                onClick={onTryAnother}
                className="flex-1"
                data-testid="button-try-another"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {tryAnotherLabel ?? t("common.tryAnotherOption")}
              </Button>
            )}
            {onContinue && (
              <Button onClick={onContinue} className="flex-1" data-testid="button-continue">
                {continueLabel ?? t("common.continue")}
              </Button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

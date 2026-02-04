import { Wifi, Lock, AlertTriangle, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Network } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface NetworkCardProps {
  network: Network;
  onSelect: (network: Network) => void;
  showWarnings?: boolean;
  isSelected?: boolean;
  description?: string;
  isDisabled?: boolean;
}

export function NetworkCard({
  network,
  onSelect,
  showWarnings = false,
  isSelected = false,
  description,
  isDisabled = false,
}: NetworkCardProps) {
  const { t } = useTranslation();

  const signalBars = Array.from({ length: 5 }, (_, i) => i < network.signalStrength);
  const showWarning =
    showWarnings &&
    (network.isTrap || network.riskLevel === "dangerous" || network.riskLevel === "suspicious");
  const warningLabel =
    network.isTrap || network.riskLevel === "dangerous"
      ? t("network.dangerous")
      : t("network.suspicious");
  const showVerified = showWarnings && network.verifiedByStaff;
  const showDescription = showWarnings && description;
  const securityLabel = network.isSecured ? t("network.secured") : t("network.open");
  const warningDetail = showWarning ? `, ${warningLabel}` : "";
  const verificationDetail = showVerified ? `, ${t("network.verified")}` : "";
  const descriptionDetail = showDescription ? `, ${description}` : "";
  const cardLabel = t("network.cardAriaLabel", {
    ssid: network.ssid,
    security: securityLabel,
    strength: network.signalStrength,
    details: `${warningDetail}${verificationDetail}${descriptionDetail}`,
  });

  return (
    <Card
      className={cn(
        "p-5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:bg-background/80 hover:border-primary/30 hover:shadow-[0_18px_40px_-30px_hsl(var(--foreground)/0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        isSelected && "ring-2 ring-primary/60 bg-primary/5",
        isDisabled && "cursor-not-allowed opacity-50 hover:translate-y-0 hover:shadow-none"
      )}
      onClick={() => {
        if (!isDisabled) {
          onSelect(network);
        }
      }}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-label={cardLabel}
      aria-pressed={isSelected}
      aria-disabled={isDisabled || undefined}
      onKeyDown={(event) => {
        if (isDisabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(network);
        }
      }}
      data-testid={`network-card-${network.id}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center">
            {network.isSecured ? (
              <Lock className="w-5 h-5 text-foreground/70" />
            ) : (
              <Wifi className="w-5 h-5 text-foreground/70" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3
              className="font-medium text-foreground truncate"
              data-testid={`network-ssid-${network.id}`}
            >
              {network.ssid}
            </h3>
            {showDescription && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{description}</p>
            )}
            {(showWarning || showVerified) && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {showWarning && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-3 h-3" />
                    {warningLabel}
                  </span>
                )}
                {showVerified && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {t("network.verifiedByStaff")}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          className="flex items-end gap-0.5 h-5 flex-shrink-0"
          role="img"
          aria-label={t("network.signalStrengthAria", { strength: network.signalStrength })}
        >
          {signalBars.map((active, i) => (
            <div
              key={i}
              className={cn(
                "w-1 rounded-full transition-colors",
                active ? "bg-primary" : "bg-muted"
              )}
              style={{ height: `${(i + 1) * 4}px` }}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

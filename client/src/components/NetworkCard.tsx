import { Wifi, WifiOff, Lock, AlertTriangle, CheckCircle, Shield } from "lucide-react";
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
  scenarioId?: string;
}

export function NetworkCard({ network, onSelect, showWarnings = false, isSelected = false, scenarioId }: NetworkCardProps) {
  const { t } = useTranslation();
  
  const getTranslatedDescription = () => {
    if (!scenarioId) return network.description;
    const key = network.verifiedByStaff 
      ? `scenarios.${scenarioId}.networks.${network.id}.descriptionVerified`
      : `scenarios.${scenarioId}.networks.${network.id}.description`;
    return t(key, { defaultValue: network.description });
  };
  const signalBars = Array.from({ length: 5 }, (_, i) => i < network.signalStrength);
  
  const getRiskBadge = () => {
    if (network.verifiedByStaff) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          {t('network.verified')}
        </Badge>
      );
    }
    
    if (showWarnings) {
      if (network.riskLevel === "dangerous") {
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {t('network.suspicious')}
          </Badge>
        );
      }
      if (network.riskLevel === "suspicious") {
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {t('network.caution')}
          </Badge>
        );
      }
      if (network.riskLevel === "safe") {
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
            <Shield className="w-3 h-3 mr-1" />
            {t('network.safe')}
          </Badge>
        );
      }
    }
    return null;
  };

  return (
    <Card 
      className={cn(
        "p-4 cursor-pointer transition-all duration-150 hover-elevate active-elevate-2",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={() => onSelect(network)}
      data-testid={`network-card-${network.id}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            {network.isSecured ? (
              <Lock className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Wifi className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-foreground truncate" data-testid={`network-ssid-${network.id}`}>
                {network.ssid}
              </h3>
              {getRiskBadge()}
            </div>
            
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                {network.isSecured ? (
                  <>
                    <Lock className="w-3 h-3" />
                    {network.securityType.toUpperCase()}
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    {t('network.open')}
                  </>
                )}
              </span>
              
              {network.description && showWarnings && (
                <span className="truncate">{getTranslatedDescription()}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-end gap-0.5 h-5 flex-shrink-0" aria-label={t('network.signalStrengthAria', { strength: network.signalStrength })}>
          {signalBars.map((active, i) => (
            <div
              key={i}
              className={cn(
                "w-1 rounded-full transition-colors",
                active ? "bg-foreground" : "bg-muted"
              )}
              style={{ height: `${(i + 1) * 4}px` }}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

import { Wifi, WifiOff, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
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
  
  const signalBars = Array.from({ length: 5 }, (_, i) => i < network.signalStrength);

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
            </div>
            
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              {network.verifiedByStaff && (
                <span className="text-green-600 dark:text-green-400">{t('network.verifiedByStaff')}</span>
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

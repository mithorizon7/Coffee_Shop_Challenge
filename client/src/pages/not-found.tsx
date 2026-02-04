import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="app-shell w-full flex items-center justify-center">
      <Card className="app-surface w-full max-w-md mx-4 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background/70 via-transparent to-background/30 pointer-events-none" />
        <div className="absolute -top-20 -right-16 h-36 w-36 rounded-full bg-destructive/10 blur-2xl pointer-events-none" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{t("errors.notFoundTitle")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t("errors.notFoundBody")}</p>
        </div>
      </Card>
    </div>
  );
}

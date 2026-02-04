import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="app-shell w-full flex items-center justify-center">
      <Card className="app-surface w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">{t("errors.notFoundTitle")}</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">{t("errors.notFoundBody")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

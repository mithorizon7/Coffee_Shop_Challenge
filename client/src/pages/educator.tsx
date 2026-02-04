import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  Users,
  BarChart3,
  Target,
  AlertTriangle,
  Trophy,
  ArrowLeft,
  Loader2,
  BookOpen,
  TrendingUp,
  Clock,
  ShieldX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Link } from "wouter";
import type { EducatorAnalytics, LearnerStats, ScenarioStats, CommonMistake } from "@shared/schema";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { translateScenarioTitle } from "@/lib/translateContent";

interface EducatorStatus {
  isEducator: boolean;
}

export default function EducatorDashboard() {
  const { t, i18n } = useTranslation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const { data: status, isLoading: statusLoading } = useQuery<EducatorStatus>({
    queryKey: ["/api/educator/status"],
    enabled: isAuthenticated,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<EducatorAnalytics>({
    queryKey: ["/api/educator/analytics"],
    enabled: isAuthenticated && status?.isEducator === true,
  });

  if (authLoading || statusLoading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="app-surface text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t("educator.loading")}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app-shell flex items-center justify-center">
        <Card className="app-surface p-8 max-w-md mx-4 text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="font-display text-2xl font-bold mb-2">
            {t("educator.accessRequiredTitle")}
          </h1>
          <p className="text-muted-foreground mb-6">{t("educator.accessRequiredBody")}</p>
          <Button asChild className="w-full">
            <a href="/api/login" data-testid="button-login">
              {t("educator.signInCta")}
            </a>
          </Button>
          <Link href="/">
            <Button variant="ghost" className="w-full mt-2" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("educator.backToHome")}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (isAuthenticated && status && !status.isEducator) {
    return (
      <div className="app-shell flex items-center justify-center">
        <Card className="app-surface p-8 max-w-md mx-4 text-center">
          <ShieldX className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="font-display text-2xl font-bold mb-2">
            {t("educator.accessRestrictedTitle")}
          </h1>
          <p className="text-muted-foreground mb-6">{t("educator.accessRestrictedBody")}</p>
          <Link href="/">
            <Button className="w-full" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("educator.backToHome")}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (analyticsLoading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="app-surface text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t("educator.loadingAnalytics")}</p>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return t("educator.never");
    return new Intl.DateTimeFormat(i18n.language || "en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-emerald-100/70 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
      case "intermediate":
        return "bg-amber-100/70 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
      case "advanced":
        return "bg-rose-100/70 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200";
      default:
        return "bg-muted/60 text-muted-foreground";
    }
  };

  return (
    <div className="app-shell">
      <header className="app-surface border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("educator.backToGame")}
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <BookOpen className="w-3 h-3" />
              {t("educator.badge")}
            </Badge>
            {user && (
              <div className="flex items-center gap-2">
                {user.profileImageUrl && (
                  <img
                    src={user.profileImageUrl}
                    alt={t("aria.profileImageAlt")}
                    className="w-8 h-8 rounded-full"
                    data-testid="img-user-profile"
                  />
                )}
                <span
                  className="text-sm text-foreground font-medium hidden sm:inline"
                  data-testid="text-username"
                >
                  {user.firstName || user.email}
                </span>
              </div>
            )}
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="app-surface max-w-6xl mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              {t("educator.title")}
            </h1>
            <p className="text-muted-foreground">{t("educator.subtitle")}</p>
          </div>

          {analytics && analytics.totalSessions === 0 ? (
            <Card className="p-8 text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="font-display text-xl font-semibold mb-2">
                {t("educator.noDataTitle")}
              </h2>
              <p className="text-muted-foreground mb-6">{t("educator.noDataBody")}</p>
              <Link href="/">
                <Button data-testid="button-go-game">{t("educator.goToGame")}</Button>
              </Link>
            </Card>
          ) : (
            analytics && (
              <>
                <div className="grid md:grid-cols-5 gap-4">
                  <Card className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-sky-100/70 dark:bg-sky-950/40 flex items-center justify-center">
                        <Users className="w-5 h-5 text-sky-700 dark:text-sky-300" />
                      </div>
                      <div>
                        <p
                          className="text-2xl font-bold text-foreground"
                          data-testid="text-total-learners"
                        >
                          {analytics.totalLearners}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("educator.metrics.learners")}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-amber-100/70 dark:bg-amber-950/40 flex items-center justify-center">
                        <Target className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                      </div>
                      <div>
                        <p
                          className="text-2xl font-bold text-foreground"
                          data-testid="text-total-sessions"
                        >
                          {analytics.totalSessions}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("educator.metrics.sessions")}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-100/70 dark:bg-emerald-950/40 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                      </div>
                      <div>
                        <p
                          className="text-2xl font-bold text-foreground"
                          data-testid="text-accuracy-rate"
                        >
                          {analytics.overallAccuracyRate}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("educator.metrics.accuracy")}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-teal-100/70 dark:bg-teal-950/40 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-teal-700 dark:text-teal-300" />
                      </div>
                      <div>
                        <p
                          className="text-2xl font-bold text-foreground"
                          data-testid="text-avg-safety"
                        >
                          {analytics.averageSafetyScore}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("educator.metrics.avgSafety")}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-rose-100/70 dark:bg-rose-950/40 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-rose-700 dark:text-rose-300" />
                      </div>
                      <div>
                        <p
                          className="text-2xl font-bold text-foreground"
                          data-testid="text-avg-risk"
                        >
                          {analytics.averageRiskScore}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("educator.metrics.avgRisk")}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      <h3 className="font-display font-semibold text-foreground">
                        {t("educator.scenarioPerformanceTitle")}
                      </h3>
                    </div>
                    {analytics.scenarioStats.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        {t("educator.scenarioPerformanceEmpty")}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {analytics.scenarioStats.map((scenario: ScenarioStats) => (
                          <div key={scenario.scenarioId} className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="font-medium text-foreground truncate">
                                  {translateScenarioTitle(t, scenario.scenarioId, scenario.title)}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs capitalize ${getDifficultyColor(scenario.difficulty)}`}
                                >
                                  {t(`scenario.difficulty.${scenario.difficulty}`)}
                                </Badge>
                              </div>
                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                {t("educator.plays", { count: scenario.completionCount })}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Progress value={scenario.averageAccuracy} className="flex-1 h-2" />
                              <span className="text-sm font-medium text-foreground w-12 text-right">
                                {scenario.averageAccuracy}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      <h3 className="font-display font-semibold text-foreground">
                        {t("educator.commonMistakesTitle")}
                      </h3>
                    </div>
                    {analytics.commonMistakes.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        {t("educator.commonMistakesEmpty")}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {analytics.commonMistakes.map((mistake: CommonMistake, index: number) => {
                          const scenario = analytics.scenarioStats.find(
                            (s) => s.scenarioId === mistake.scenarioId
                          );
                          return (
                            <div
                              key={mistake.scenarioId}
                              className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0"
                              data-testid={`mistake-${index}`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">
                                  {translateScenarioTitle(
                                    t,
                                    mistake.scenarioId,
                                    scenario?.title || mistake.scenarioId
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {t("educator.badDecisionsLabel", {
                                    rate: mistake.badDecisionRate,
                                  })}
                                </p>
                              </div>
                              <Badge variant="destructive" className="whitespace-nowrap">
                                {t("educator.riskPointsLabel", {
                                  points: mistake.averageRiskPoints,
                                })}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </div>

                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-primary" />
                    <h3 className="font-display font-semibold text-foreground">
                      {t("educator.recentLearnerActivityTitle")}
                    </h3>
                  </div>
                  {analytics.recentLearners.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {t("educator.recentLearnerActivityEmpty")}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 text-muted-foreground font-medium">
                              {t("educator.table.learner")}
                            </th>
                            <th className="text-center py-2 text-muted-foreground font-medium">
                              {t("educator.table.sessions")}
                            </th>
                            <th className="text-center py-2 text-muted-foreground font-medium">
                              {t("educator.table.accuracy")}
                            </th>
                            <th className="text-right py-2 text-muted-foreground font-medium">
                              {t("educator.table.lastActive")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.recentLearners.map((learner: LearnerStats, index: number) => (
                            <tr
                              key={learner.id}
                              className="border-b border-border last:border-0"
                              data-testid={`learner-${index}`}
                            >
                              <td className="py-3">
                                <div className="flex items-center gap-2">
                                  {learner.profileImageUrl ? (
                                    <img
                                      src={learner.profileImageUrl}
                                      alt=""
                                      className="w-7 h-7 rounded-full"
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                                      <Users className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  <span className="font-medium text-foreground">
                                    {learner.firstName || learner.email || t("educator.anonymous")}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 text-center text-foreground">
                                {learner.sessionsCompleted}
                              </td>
                              <td className="py-3 text-center">
                                <span
                                  className={
                                    learner.averageAccuracy >= 70
                                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                      : learner.averageAccuracy >= 50
                                        ? "text-amber-600 dark:text-amber-400 font-medium"
                                        : "text-rose-600 dark:text-rose-400 font-medium"
                                  }
                                >
                                  {learner.averageAccuracy}%
                                </span>
                              </td>
                              <td className="py-3 text-right text-muted-foreground">
                                <div className="flex items-center justify-end gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(learner.lastActive)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </>
            )
          )}
        </motion.div>
      </main>
    </div>
  );
}

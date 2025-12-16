import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { 
  Users, BarChart3, Target, AlertTriangle, Trophy,
  ArrowLeft, Loader2, BookOpen, TrendingUp, Clock, ShieldX
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "wouter";
import type { EducatorAnalytics, LearnerStats, ScenarioStats, CommonMistake } from "@shared/schema";
import { motion } from "framer-motion";

interface EducatorStatus {
  isEducator: boolean;
}

export default function EducatorDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const { data: status, isLoading: statusLoading } = useQuery<EducatorStatus>({
    queryKey: ["/api/educator/status"],
    enabled: isAuthenticated,
  });

  const { data: analytics, isLoading: analyticsLoading, error } = useQuery<EducatorAnalytics>({
    queryKey: ["/api/educator/analytics"],
    enabled: isAuthenticated && status?.isEducator === true,
  });

  if (authLoading || statusLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md mx-4 text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="font-display text-2xl font-bold mb-2">Educator Access Required</h1>
          <p className="text-muted-foreground mb-6">
            Sign in to access the educator dashboard and view learner analytics.
          </p>
          <Button asChild className="w-full">
            <a href="/api/login" data-testid="button-login">Sign In</a>
          </Button>
          <Link href="/">
            <Button variant="ghost" className="w-full mt-2" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (isAuthenticated && status && !status.isEducator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md mx-4 text-center">
          <ShieldX className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="font-display text-2xl font-bold mb-2">Access Restricted</h1>
          <p className="text-muted-foreground mb-6">
            The educator dashboard is only available to users with educator privileges.
            Contact your administrator if you believe you should have access.
          </p>
          <Link href="/">
            <Button className="w-full" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (analyticsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "intermediate":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300";
      case "advanced":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Game
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <BookOpen className="w-3 h-3" />
              Educator
            </Badge>
            {user && (
              <div className="flex items-center gap-2">
                {user.profileImageUrl && (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full"
                    data-testid="img-user-profile"
                  />
                )}
                <span className="text-sm text-foreground font-medium hidden sm:inline" data-testid="text-username">
                  {user.firstName || user.email}
                </span>
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              Educator Dashboard
            </h1>
            <p className="text-muted-foreground">
              Monitor learner performance and identify common mistake patterns
            </p>
          </div>

          {analytics && analytics.totalSessions === 0 ? (
            <Card className="p-8 text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="font-display text-xl font-semibold mb-2">No Data Yet</h2>
              <p className="text-muted-foreground mb-6">
                Learners need to complete game sessions before analytics appear here.
              </p>
              <Link href="/">
                <Button data-testid="button-go-game">
                  Go to Game
                </Button>
              </Link>
            </Card>
          ) : analytics && (
            <>
              <div className="grid md:grid-cols-5 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-total-learners">
                        {analytics.totalLearners}
                      </p>
                      <p className="text-xs text-muted-foreground">Learners</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                      <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-total-sessions">
                        {analytics.totalSessions}
                      </p>
                      <p className="text-xs text-muted-foreground">Sessions</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-accuracy-rate">
                        {analytics.overallAccuracyRate}%
                      </p>
                      <p className="text-xs text-muted-foreground">Accuracy</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-avg-safety">
                        {analytics.averageSafetyScore}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Safety</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-avg-risk">
                        {analytics.averageRiskScore}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Risk</p>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h3 className="font-display font-semibold text-foreground">
                      Scenario Performance
                    </h3>
                  </div>
                  {analytics.scenarioStats.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No scenario data available yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {analytics.scenarioStats.map((scenario: ScenarioStats) => (
                        <div key={scenario.scenarioId} className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="font-medium text-foreground truncate">
                                {scenario.title}
                              </span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs capitalize ${getDifficultyColor(scenario.difficulty)}`}
                              >
                                {scenario.difficulty}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {scenario.completionCount} plays
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
                      Common Mistake Areas
                    </h3>
                  </div>
                  {analytics.commonMistakes.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No significant mistake patterns detected yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {analytics.commonMistakes.map((mistake: CommonMistake, index: number) => {
                        const scenario = analytics.scenarioStats.find(s => s.scenarioId === mistake.scenarioId);
                        return (
                          <div 
                            key={mistake.scenarioId} 
                            className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0"
                            data-testid={`mistake-${index}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {scenario?.title || mistake.scenarioId}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {mistake.badDecisionRate}% bad decisions
                              </p>
                            </div>
                            <Badge variant="destructive" className="whitespace-nowrap">
                              {mistake.averageRiskPoints} risk pts
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
                    Recent Learner Activity
                  </h3>
                </div>
                {analytics.recentLearners.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No learner activity yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 text-muted-foreground font-medium">Learner</th>
                          <th className="text-center py-2 text-muted-foreground font-medium">Sessions</th>
                          <th className="text-center py-2 text-muted-foreground font-medium">Accuracy</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">Last Active</th>
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
                                  {learner.firstName || learner.email || "Anonymous"}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 text-center text-foreground">
                              {learner.sessionsCompleted}
                            </td>
                            <td className="py-3 text-center">
                              <span className={
                                learner.averageAccuracy >= 70 
                                  ? "text-green-600 dark:text-green-400 font-medium"
                                  : learner.averageAccuracy >= 50
                                    ? "text-amber-600 dark:text-amber-400 font-medium"
                                    : "text-red-600 dark:text-red-400 font-medium"
                              }>
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
          )}
        </motion.div>
      </main>
    </div>
  );
}

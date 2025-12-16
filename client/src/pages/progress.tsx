import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { 
  TrendingUp, TrendingDown, Minus, Trophy, Shield, Target, 
  Calendar, ArrowLeft, Loader2, Award, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "wouter";
import type { UserProgress, CompletedSession } from "@shared/schema";
import { motion } from "framer-motion";
import { getAvailableBadges } from "@shared/scenarios";

export default function ProgressPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const { data: progress, isLoading: progressLoading, error } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
    enabled: isAuthenticated,
  });

  if (authLoading || progressLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md mx-4 text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="font-display text-2xl font-bold mb-2">Sign In to Track Progress</h1>
          <p className="text-muted-foreground mb-6">
            Create an account to save your game sessions and track your improvement over time.
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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case "declining":
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case "improving":
        return "Your security judgment is improving";
      case "declining":
        return "Consider reviewing the basics";
      default:
        return "Keep practicing to see trends";
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getGradeColor = (grade: string | null) => {
    switch (grade) {
      case "A":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "B":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "C":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300";
      case "D":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
      case "F":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const badgeDetails = (badgeId: string) => {
    return getAvailableBadges().find(b => b.id === badgeId);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Game
            </Button>
          </Link>
          <div className="flex items-center gap-3">
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

      <main className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              Your Progress
            </h1>
            <p className="text-muted-foreground">
              Track your Wi-Fi security learning journey
            </p>
          </div>

          {progress && progress.totalSessions === 0 ? (
            <Card className="p-8 text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="font-display text-xl font-semibold mb-2">No Sessions Yet</h2>
              <p className="text-muted-foreground mb-6">
                Complete your first challenge to start tracking your progress.
              </p>
              <Link href="/">
                <Button data-testid="button-start-first-challenge">
                  Start Your First Challenge
                </Button>
              </Link>
            </Card>
          ) : progress && (
            <>
              <div className="grid md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-total-sessions">
                        {progress.totalSessions}
                      </p>
                      <p className="text-xs text-muted-foreground">Sessions</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-accuracy-rate">
                        {progress.accuracyRate}%
                      </p>
                      <p className="text-xs text-muted-foreground">Accuracy</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-badges-count">
                        {progress.badgesEarned.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Badges</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      {getTrendIcon(progress.improvementTrend)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground capitalize" data-testid="text-trend">
                        {progress.improvementTrend}
                      </p>
                      <p className="text-xs text-muted-foreground">Trend</p>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  {getTrendIcon(progress.improvementTrend)}
                  <h3 className="font-display font-semibold text-foreground">
                    Learning Trend
                  </h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  {getTrendText(progress.improvementTrend)}
                </p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Correct Decisions</span>
                      <span className="font-medium text-foreground">
                        {progress.totalCorrectDecisions} / {progress.totalDecisions}
                      </span>
                    </div>
                    <Progress value={progress.accuracyRate} className="h-2" />
                  </div>
                </div>
              </Card>

              {progress.badgesEarned.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Award className="w-5 h-5 text-primary" />
                    <h3 className="font-display font-semibold text-foreground">
                      Badges Earned
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {progress.badgesEarned.map((badgeId) => {
                      const badge = badgeDetails(badgeId);
                      return badge ? (
                        <div 
                          key={badgeId} 
                          className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2"
                          data-testid={`badge-${badgeId}`}
                        >
                          <span className="text-xl">{badge.icon}</span>
                          <div>
                            <p className="text-sm font-medium text-foreground">{badge.name}</p>
                            <p className="text-xs text-muted-foreground">{badge.description}</p>
                          </div>
                        </div>
                      ) : (
                        <Badge key={badgeId} variant="outline">{badgeId}</Badge>
                      );
                    })}
                  </div>
                </Card>
              )}

              {progress.recentSessions.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h3 className="font-display font-semibold text-foreground">
                      Recent Sessions
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {progress.recentSessions.map((session: CompletedSession, index: number) => (
                      <div 
                        key={session.id} 
                        className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0"
                        data-testid={`session-${index}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {session.scenarioId.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(session.completedAt)} • {session.correctDecisions}/{session.decisionsCount} correct
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {session.difficulty}
                          </Badge>
                          {session.grade && (
                            <span className={`px-2 py-1 rounded text-sm font-bold ${getGradeColor(session.grade)}`}>
                              {session.grade}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}

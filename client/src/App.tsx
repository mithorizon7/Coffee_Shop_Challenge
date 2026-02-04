import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ProgressPage from "@/pages/progress";
import EducatorDashboard from "@/pages/educator";
import { setBadges } from "@shared/scenarios";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/progress" component={ProgressPage} />
      <Route path="/educator" component={EducatorDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);

  return null;
}

function App() {
  useEffect(() => {
    let isActive = true;

    fetch("/api/badges")
      .then((response) => (response.ok ? response.json() : null))
      .then((badges) => {
        if (isActive && Array.isArray(badges)) {
          setBadges(badges);
        }
      })
      .catch(() => {});

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ScrollToTop />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

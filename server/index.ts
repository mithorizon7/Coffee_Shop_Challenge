import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { initializeContent } from "./scenarioLoader";
import { storage } from "./storage";
import { logError } from "./errorLogging";
import { pool } from "./db";
import { PRODUCTION_CSP } from "./requestSecurity";

const app = express();
const httpServer = createServer(app);

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  if (process.env.NODE_ENV === "production")
    res.setHeader("Content-Security-Policy", PRODUCTION_CSP);
  if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");

  if (req.secure) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
});

app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: false, limit: "256kb", parameterLimit: 100 }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const route = typeof req.route?.path === "string" ? req.route.path : "/api/*";
      log(`${req.method} ${route} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  // Initialize scenario content from JSON files
  initializeContent();

  await storage.initialize();

  await setupAuth(app);
  registerAuthRoutes(app);
  await registerRoutes(httpServer, app);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const safeMessage =
      status >= 500 && process.env.NODE_ENV === "production" ? "Internal Server Error" : message;

    logError(`HTTP error ${status}`, err);
    res.status(status).json({ message: safeMessage });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    }
  );

  // Graceful shutdown handling
  const shutdown = () => {
    log("Shutting down gracefully...");
    storage.stopCleanup();
    httpServer.close(async () => {
      await pool.end();
      log("Server closed");
      process.exit(0);
    });
    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      log("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
})().catch((error) => {
  logError("Application startup failed", error);
  process.exit(1);
});

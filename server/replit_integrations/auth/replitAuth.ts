import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;

function getAllowedDomains(): Set<string> {
  const raw = process.env.REPLIT_DOMAINS ?? "";
  const domains = raw
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  return new Set(domains);
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase();
}

function isDevHost(hostname: string): boolean {
  return hostname === "localhost" || hostname.startsWith("127.") || hostname === "::1";
}

function formatHostForUrl(hostname: string): string {
  if (hostname.includes(":") && !(hostname.startsWith("[") && hostname.endsWith("]"))) {
    return `[${hostname}]`;
  }
  return hostname;
}

function isLikelyValidHostname(hostname: string): boolean {
  if (hostname.length === 0 || hostname.length > 253) return false;
  return /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(
    hostname
  );
}

function resolveAuthDomain(hostname: string): string {
  const normalized = normalizeHostname(hostname);
  const allowedDomains = getAllowedDomains();

  if (allowedDomains.size > 0) {
    if (allowedDomains.has(normalized)) return normalized;
    throw new Error("Invalid host for authentication");
  }

  if (process.env.NODE_ENV !== "production" && isDevHost(normalized)) {
    return normalized;
  }

  if (!isLikelyValidHostname(normalized)) {
    throw new Error("Invalid host for authentication");
  }

  return normalized;
}

export function getSession() {
  const sessionTtl = SESSION_TTL_MS;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: SESSION_TTL_SECONDS,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await authStorage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();
  const MAX_REGISTERED_STRATEGIES = 20;

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const authDomain = resolveAuthDomain(domain);
    const authHost = formatHostForUrl(authDomain);
    const callbackProtocol = isDevHost(authDomain) ? "http" : "https";
    const callbackURL = `${callbackProtocol}://${authHost}/api/callback`;
    const strategyName = `replitauth:${authDomain}`;
    if (!registeredStrategies.has(strategyName)) {
      if (registeredStrategies.size >= MAX_REGISTERED_STRATEGIES) {
        throw new Error("Too many authentication host strategies registered");
      }
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    try {
      const authDomain = resolveAuthDomain(req.hostname);
      ensureStrategy(authDomain);
      passport.authenticate(`replitauth:${authDomain}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    } catch {
      res.status(400).json({ message: "Invalid host for authentication" });
    }
  });

  app.get("/api/callback", (req, res, next) => {
    try {
      const authDomain = resolveAuthDomain(req.hostname);
      ensureStrategy(authDomain);
      passport.authenticate(`replitauth:${authDomain}`, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    } catch {
      res.status(400).json({ message: "Invalid host for authentication" });
    }
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      let authDomain: string;
      try {
        authDomain = resolveAuthDomain(req.hostname);
      } catch {
        return res.status(400).json({ message: "Invalid host for authentication" });
      }
      const logoutHost = formatHostForUrl(authDomain);
      const logoutProtocol = isDevHost(authDomain) ? "http" : "https";
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${logoutProtocol}://${logoutHost}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

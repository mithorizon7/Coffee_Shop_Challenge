import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";
import { authOriginForHost, allowedHosts } from "../../requestSecurity";

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
  user.claims = tokens.claims() ?? user.claims;
  user.access_token = tokens.access_token;
  if (tokens.refresh_token) user.refresh_token = tokens.refresh_token;
  user.expires_at = tokens.expires_in
    ? Math.floor(Date.now() / 1000) + tokens.expires_in
    : user.claims?.exp;
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
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  }
  if (process.env.NODE_ENV === "production" && allowedHosts().length === 0) {
    throw new Error("REPLIT_DOMAINS must explicitly allow production authentication hosts");
  }
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
    try {
      await upsertUser(tokens.claims());
      verified(null, user);
    } catch (error) {
      verified(error as Error);
    }
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();
  const MAX_REGISTERED_STRATEGIES = 20;

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (authOrigin: string) => {
    const callbackURL = `${authOrigin}/api/callback`;
    const strategyName = `replitauth:${authOrigin}`;
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
      const authDomain = authOriginForHost(req.get("host") ?? "");
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
      const authDomain = authOriginForHost(req.get("host") ?? "");
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
    req.logout((error) => {
      if (error) return res.status(500).json({ message: "Logout failed" });
      let authDomain: string;
      try {
        authDomain = authOriginForHost(req.get("host") ?? "");
      } catch {
        return res.status(400).json({ message: "Invalid host for authentication" });
      }
      req.session.destroy((destroyError) => {
        if (destroyError) return res.status(500).json({ message: "Logout failed" });
        res.clearCookie("connect.sid", { path: "/" });
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: authDomain,
          }).href
        );
      });
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

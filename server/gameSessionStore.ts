import { createHash } from "node:crypto";
import type { Pool } from "pg";
import type { GameSession } from "@shared/schema";

export interface SessionRecord {
  session: GameSession;
  ownerId: string | null;
  history: GameSession[];
  clock: { sceneId: string; enteredAt: number; timedOut: boolean };
}

export class SessionRequestError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export interface GameSessionStore {
  initialize(): Promise<void>;
  create(session: GameSession, ownerId: string | null): Promise<GameSession>;
  get(id: string): Promise<SessionRecord | undefined>;
  mutate(id: string, change: (record: SessionRecord) => SessionRecord): Promise<GameSession>;
  checkRateLimit(key: string): Promise<{ allowed: boolean; retryAfterSeconds: number }>;
  cleanup(): Promise<void>;
}

// Each state change holds a PostgreSQL row lock and checks a client revision.
// Ownership, history, and deadlines move atomically with the learner's state.
export class PostgresGameSessionStore implements GameSessionStore {
  constructor(private pool: Pool) {}

  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(72460322)");
      await client.query(`CREATE TABLE IF NOT EXISTS active_game_sessions (
        id varchar PRIMARY KEY,
        record jsonb NOT NULL,
        expires_at timestamptz NOT NULL
      )`);
      await client.query(`CREATE INDEX IF NOT EXISTS active_game_sessions_expiry
        ON active_game_sessions (expires_at)`);
      await client.query(`CREATE TABLE IF NOT EXISTS game_session_limits (
        key_hash varchar PRIMARY KEY,
        attempts integer NOT NULL,
        expires_at timestamptz NOT NULL
      )`);
      await client.query(`CREATE INDEX IF NOT EXISTS game_session_limits_expiry
        ON game_session_limits (expires_at)`);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async create(session: GameSession, ownerId: string | null): Promise<GameSession> {
    const initial = { ...session, revision: 0 };
    const record: SessionRecord = {
      session: initial,
      ownerId,
      history: [],
      clock: { sceneId: session.currentSceneId, enteredAt: Date.now(), timedOut: false },
    };
    await this.pool.query(
      `INSERT INTO active_game_sessions (id, record, expires_at)
       VALUES ($1, $2::jsonb, $3::timestamptz + interval '2 hours')`,
      [session.id, JSON.stringify(record), session.startedAt]
    );
    return initial;
  }

  async get(id: string): Promise<SessionRecord | undefined> {
    const { rows } = await this.pool.query<{ record: SessionRecord }>(
      "SELECT record FROM active_game_sessions WHERE id = $1 AND expires_at > now()",
      [id]
    );
    return rows[0]?.record;
  }

  async mutate(id: string, change: (record: SessionRecord) => SessionRecord): Promise<GameSession> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '5s'");
      const { rows } = await client.query<{ record: SessionRecord }>(
        "SELECT record FROM active_game_sessions WHERE id = $1 AND expires_at > now() FOR UPDATE",
        [id]
      );
      if (!rows[0]) throw new SessionRequestError(404, "Session not found");
      const updated = change(rows[0].record);
      await client.query("UPDATE active_game_sessions SET record = $2::jsonb WHERE id = $1", [
        id,
        JSON.stringify(updated),
      ]);
      await client.query("COMMIT");
      return updated.session;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async checkRateLimit(key: string) {
    const hash = createHash("sha256").update(key).digest("hex");
    const { rows } = await this.pool.query<{ attempts: number; retry_after: number }>(
      `INSERT INTO game_session_limits (key_hash, attempts, expires_at)
       VALUES ($1, 1, now() + interval '1 minute')
       ON CONFLICT (key_hash) DO UPDATE SET
         attempts = CASE WHEN game_session_limits.expires_at <= now() THEN 1
           ELSE LEAST(game_session_limits.attempts + 1, 31) END,
         expires_at = CASE WHEN game_session_limits.expires_at <= now()
           THEN now() + interval '1 minute' ELSE game_session_limits.expires_at END
       RETURNING attempts, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (expires_at - clock_timestamp()))))::int AS retry_after`,
      [hash]
    );
    return { allowed: rows[0].attempts <= 30, retryAfterSeconds: rows[0].retry_after };
  }

  async cleanup(): Promise<void> {
    await this.pool.query("DELETE FROM active_game_sessions WHERE expires_at <= now()");
    await this.pool.query("DELETE FROM game_session_limits WHERE expires_at <= now()");
  }
}

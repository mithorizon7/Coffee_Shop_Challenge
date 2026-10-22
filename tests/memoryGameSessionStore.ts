import type { GameSessionStore, SessionRecord } from "../server/gameSessionStore";
import { SessionRequestError } from "../server/gameSessionStore";
import type { GameSession } from "../shared/schema";

// Unit-test double only. Production never falls back to process-local state.
export class MemoryGameSessionStore implements GameSessionStore {
  records = new Map<string, SessionRecord>();
  async initialize() {}
  async cleanup() {}
  async checkRateLimit() {
    return { allowed: true, retryAfterSeconds: 0 };
  }
  async create(session: GameSession, ownerId: string | null) {
    const initial = { ...session, revision: 0 };
    this.records.set(
      session.id,
      structuredClone({
        session: initial,
        ownerId,
        history: [],
        clock: { sceneId: session.currentSceneId, enteredAt: Date.now(), timedOut: false },
      })
    );
    return initial;
  }
  async get(id: string) {
    const record = this.records.get(id);
    return record ? structuredClone(record) : undefined;
  }
  async mutate(id: string, change: (record: SessionRecord) => SessionRecord) {
    const record = this.records.get(id);
    if (!record) throw new SessionRequestError(404, "Session not found");
    const updated = change(structuredClone(record));
    this.records.set(id, structuredClone(updated));
    return updated.session;
  }
}

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import type { V15Session } from "./v15-no-trade.js";

const fixturePath = "fixtures/v1/v1.5/no-trade-calendar.json";
const manifestPath = "fixtures/v1/v1.5/no-trade-calendar-manifest.json";
type CalendarFixture = { fixtureVersion: string; sessionsPerMarket: number; sessions: V15Session[] };
type CalendarManifest = { fixtureVersion: string; files: Array<{ path: string; sha256: string }> };

export function loadV15NoTradeCalendar(root = fileURLToPath(new URL("../../../../", import.meta.url))): { fixtureVersion: string; fixtureSha256: string; sessions: V15Session[] } {
  const fixtureBytes = readFileSync(resolve(root, fixturePath));
  const manifest = JSON.parse(readFileSync(resolve(root, manifestPath), "utf8")) as CalendarManifest;
  const fixture = JSON.parse(fixtureBytes.toString("utf8")) as CalendarFixture;
  const actualHash = createHash("sha256").update(fixtureBytes).digest("hex");
  const entry = manifest.files.find((file) => file.path === fixturePath);
  if (!entry || entry.sha256 !== actualHash || manifest.fixtureVersion !== fixture.fixtureVersion || fixture.sessionsPerMarket !== 60 || fixture.sessions.length !== 120) {
    throw new Error("V1.5 frozen NO_TRADE calendar fixture or SHA-256 manifest is invalid");
  }
  const seen = new Set<string>();
  for (const market of ["CN_A", "US_EQUITY"] as const) {
    const sessions = fixture.sessions.filter((session) => session.market === market);
    if (sessions.length !== 60 || sessions.some((session, index) => session.sequence !== index + 1 || (index > 0 && sessions[index - 1]!.localDate >= session.localDate))) throw new Error(`V1.5 frozen calendar has invalid ${market} session order`);
    for (const session of sessions) {
      const key = `${session.market}:${session.localDate}`;
      if (seen.has(key)) throw new Error(`V1.5 frozen calendar contains duplicate session ${key}`);
      seen.add(key);
    }
  }
  return { fixtureVersion: fixture.fixtureVersion, fixtureSha256: actualHash, sessions: fixture.sessions };
}

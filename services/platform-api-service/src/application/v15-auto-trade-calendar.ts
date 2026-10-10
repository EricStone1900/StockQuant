import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import type { V15Session } from "./v15-no-trade.js";

const fixturePath = "fixtures/v1/v1.5/auto-trade-calendar-2.json";
const manifestPath = "fixtures/v1/v1.5/auto-trade-calendar-2-manifest.json";
type CalendarFixture = { fixtureVersion: string; sessions: V15Session[] };
type CalendarManifest = { fixtureVersion: string; files: Array<{ path: string; sha256: string }> };

export function loadV15AutoTradeCalendar(root = fileURLToPath(new URL("../../../../", import.meta.url))): { fixtureVersion: string; fixtureSha256: string; sessions: V15Session[] } {
  const fixtureBytes = readFileSync(resolve(root, fixturePath));
  const manifest = JSON.parse(readFileSync(resolve(root, manifestPath), "utf8")) as CalendarManifest;
  const fixture = JSON.parse(fixtureBytes.toString("utf8")) as CalendarFixture;
  const actualHash = createHash("sha256").update(fixtureBytes).digest("hex");
  const entry = manifest.files.find((file) => file.path === fixturePath);
  if (!entry || entry.sha256 !== actualHash || manifest.fixtureVersion !== fixture.fixtureVersion || fixture.sessions.length !== 6) throw new Error("V1.5 frozen AUTO session calendar or SHA-256 manifest is invalid");
  for (const market of ["CN_A", "US_EQUITY"] as const) {
    const sessions = fixture.sessions.filter((session) => session.market === market).sort((a, b) => a.sequence - b.sequence);
    if (sessions.length !== 3 || sessions.some((session, index) => session.sequence !== index + 1 || !session.localDate || !session.timeZone || !session.calendarVersion || !session.openTimeLocal || !session.closeTimeLocal)) throw new Error(`V1.5 AUTO session Fixture must list three ordered ${market} sessions with explicit clock fields`);
    if (sessions.some((session, index) => index > 0 && session.localDate <= sessions[index - 1]!.localDate)) throw new Error(`V1.5 AUTO ${market} session dates must increase strictly`);
    if (sessions.slice(1).some((session) => !Number.isSafeInteger(session.orderQuantity) || (session.orderQuantity ?? 0) <= 0)) throw new Error(`V1.5 AUTO ${market} execution sessions must include a positive frozen order quantity`);
    if (sessions[0]?.orderQuantity !== undefined) throw new Error(`V1.5 AUTO missed session must not define an order quantity`);
  }
  return { fixtureVersion: fixture.fixtureVersion, fixtureSha256: actualHash, sessions: fixture.sessions };
}

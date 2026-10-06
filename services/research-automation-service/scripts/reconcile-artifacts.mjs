import { Pool } from "pg";
import { inspectArtifactOrphans, quarantineArtifactOrphans } from "../dist/application/v31-artifact-reconcile.js";
import { PgArtifactRefRepository } from "../dist/adapters/pg-artifact-ref-repository.js";

const args = process.argv.slice(2);
const quarantineFlag = args.indexOf("--quarantine");
const maintenanceConfirmed = args.includes("--maintenance-confirmed");
const minAgeArg = args.find((arg) => arg.startsWith("--min-age-hours="));
const minAgeHours = minAgeArg ? Number(minAgeArg.slice("--min-age-hours=".length)) : 24;
const databaseUrl = process.env.RESEARCH_AUTOMATION_DATABASE_URL;
const artifactRoot = process.env.STOCKQUANT_RESEARCH_ARTIFACT_ROOT;
const quarantineRoot = quarantineFlag >= 0 ? args[quarantineFlag + 1] : undefined;

if (args.some((arg) => !arg.startsWith("--min-age-hours=") && arg !== "--quarantine" && arg !== "--maintenance-confirmed" && args[args.indexOf(arg) - 1] !== "--quarantine")) throw new Error("usage: pnpm --filter @stockquant/research-automation-service artifact:reconcile [--min-age-hours=N] [--quarantine ABSOLUTE_PATH --maintenance-confirmed]");
if (!databaseUrl || !artifactRoot) throw new Error("RESEARCH_AUTOMATION_DATABASE_URL and STOCKQUANT_RESEARCH_ARTIFACT_ROOT are required");
if (!Number.isSafeInteger(minAgeHours) || minAgeHours < 1) throw new Error("--min-age-hours must be a positive integer");
if (quarantineFlag >= 0 && (!quarantineRoot || quarantineRoot.startsWith("--") || !quarantineRoot.startsWith("/"))) throw new Error("--quarantine requires an absolute path outside the artifact volume");
if (quarantineFlag >= 0 && !maintenanceConfirmed) throw new Error("quarantine requires --maintenance-confirmed after Artifact publishers and Runner Host are paused");

const pool = new Pool({ connectionString: databaseUrl, max: 1 });
try {
  const refs = new PgArtifactRefRepository(pool);
  const initialRefs = await refs.listAll();
  const observedAt = new Date();
  const report = await inspectArtifactOrphans(artifactRoot, initialRefs, { minAgeMs: minAgeHours * 60 * 60 * 1000, now: observedAt });
  if (quarantineRoot) {
    // Re-read owner metadata after the scan so a newly published reference invalidates stale orphan candidates.
    const currentRefs = await refs.listAll();
    const moved = await quarantineArtifactOrphans(report, artifactRoot, quarantineRoot, currentRefs, observedAt);
    console.log(JSON.stringify({ mode: "QUARANTINE", report, moved }, null, 2));
  } else {
    console.log(JSON.stringify({ mode: "CHECK_ONLY", report }, null, 2));
  }
} finally {
  await pool.end();
}
